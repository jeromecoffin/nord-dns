/* eslint-disable indent */
"use strict";

const fs = require("fs");
const readline = require("readline");
const { once } = require("events");
const {pipeline} = require("stream");
const {promisify} = require("util");
const fetch = require("node-fetch");
const streamPipeline = promisify(pipeline);

/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 */
module.exports = {
	
	/**
	 * Name of the module
	 */
	name: "filter",

	/**
	 * Version of the module
	 */
	version: 1,
	mixins: [],

	/**
	 * Settings
	 */
	settings: {
		defaultList: {
			name: "1Hosts",
			uri: "https://cdn.jsdelivr.net/gh/badmojr/1Hosts@latest/Pro/domains.txt"
		}
	},

	/**
	 * Dependencies
	 * 
	 * More info: https://moleculer.services/docs/0.14/services.html#Dependencies
	 */
	dependencies: [],

	/**
	 * Actions
	 */
	actions: {
		/**
		 * checkDomain
		 *
		 * This method is used to check if a domain belong to a list
		 * If the domain belong to a list then this function return
		 * restricted, if the domain is not found then pass is returned.
		 * 
		 * @param {String} domain - domain
		 * @param {String} listName - listname (in lowercase)
		 * 
		 * @returns {Object} action: restrict|pass
		 * 
		 */
		checkDomain: {
			params: {
				domain: "string",
				listName: "string|optional"
			},

			/**
			 * Enable action cache
			 */
			cache: false, // to be edited, first request should not be cached

			/** @param {Context} ctx  */
			async handler(ctx) {
				/**
				 * The domain to be checked
				 */
				const domain = ctx.params.domain;

				/**
				 * List used to filter the domain
				 * If no list is passed, we will load the default list (from service settings)
				 */
				const listName = ctx.params.listName || this.settings.defaultList.name;
				this.logger.info(`checkDomain: ${domain} in ${listName}`);

				/**
				 * We fist check if the list is imported, if not then we try to load it (async)
				 */
				const isListinCache = await ctx.call("v1.filter.checkList", {"name": listName});
				if (!isListinCache) {
					/**
					 * The list is not yet in cache
					 * We will triggered an event to gracefully get the list
					 */
					ctx.emit("filter.getDefaultList");
					return {
						action: "pass"
					};
				}

				/**
				 * If the list is loaded, we check if the domain is in this list
				 */
				const isDomainInList = await ctx.call(
					"v1.filter.checkDomainInList",
					{
						domain: domain,
						listName: listName
					}
				);
				const action = isDomainInList ? "restrict" : "pass";
				this.logger.info("Action: ", action);
				return {
					action: action
				};
			}
		},


		/**
		 * checkList
		 * 
		 * This event is used to check if a list has been imported into the
		 * cache.
		 * if the list is in the cache, then return true, if not return false.
		 * 
		 * @param {String} name - domain
		 * 
		 * @returns {Boolean}
		 */
		checkList: {
			params: {
				name: "string",
			},

			/** @param {Context} ctx  */
			async handler(ctx) {
				const key = `filter:lists:${ctx.params.name}`;
				const listMetas = await this.broker.cacher.get(key);
				if (!listMetas) {
					this.logger.warn("There is no cached list! You should consider caching at least one list");
					return false;
				}
				return true;
			}
		},

		/**
		 * checkDomainInList
		 * 
		 * Chec in the cache if a domain is in a given list
		 */
		checkDomainInList: {
			params: {
				domain: "string",
				listName: "string"
			},

			/**
			 * Cache results from this action
			 * 
			 * We assume the list have been previously updated.
			 * 
			 * We could cache result up to a hour (3600s)
			 */
			cache: 3600,

			/** @param {Context} ctx  */
			async handler(ctx) {
				const key = `filter:l:${ctx.params.listName}:${ctx.params.domain}`;
				const isInList = await this.broker.cacher.get(key);
				return isInList ? true : false;
			}
		},


		/**
		 * Get the default list
		 * Default list metadatas are set at the service level
		 * Under settings.defaultList
		 */
		getDefaultList: {
			timeout: 0,
			cache: false,
			async handler(ctx) {
				const listName = this.settings.defaultList.name;
				const uri = this.settings.defaultList.uri;
				const ttl = this.settings.defaultList.ttl;
				return await ctx.call("v1.filter.getAndSaveList", {
					listName: listName,
					uri: uri,
					ttl: ttl
				});
			}
		},

		/**
		 * getAndSaveList
		 * 
		 * This action is used to retrieve a list (download)
		 * and import domain's list into the service cache.
		 * Finally this action will register the list to the filter service.
		 */
		getAndSaveList: {
			timeout: 0,
			cache: false,
			params: {
				listName: "string",
				uri: "string",
				ttl: "number|optional"
			},
			async handler(ctx) {
				const listName = ctx.params.listName;
				const uri = ctx.params.uri;
				const ttl = ctx.params.ttl;

				/**
				 * First we download the list
				 */
				const listMetas = await ctx.call("v1.filter.downloadList", {
					listName: listName,
					uri: uri,
					ttl: ttl
				});

				/**
				 * Then we load domains of the list into the service cache
				 */
				await ctx.call("v1.filter.importListDomains", {listMetas: listMetas});

				/**
				 * Finally we register the current list to the service lists
				 */
				return await ctx.call("v1.filter.registerList", {listMetas: listMetas});
			}
		},

		/**
		 * Download a list
		 * 
		 * This method is used to download a list from a specified url.
		 * The file is then stored into the ./list folder
		 */
		downloadList: {
			/**
			 * Set timeout to 3 seconds.
			 * After that delay, if the action is not completed a retry
			 * will be triggered
			 */
			timeout: 3000,

			/**
			 * We disable the cache because this action is used to download
			 * a list.
			 */
			cache: false,
			params: {
				listName: "string",
				uri: "string",
				ttl: "number|optional"
			},
			/** @param {Context} ctx  */
			async handler(ctx) {
				const name = ctx.params.listName;
				const uri = ctx.params.uri;

				this.logger.info(`downloadList: Downloading list ${name} from ${uri}`);
				const filePath = `./lists/${name}.txt`;
				const response = await fetch(uri);
				await streamPipeline(response.body, fs.createWriteStream(filePath));
				this.logger.info("downloadList: Download completed!");

				return {
					/**
					 * Name of the filter list
					 */
					name: name,

					/**
					 * Path of the filter list file
					 */
					filePath: filePath,

					/**
					 * Cache data for 1 full day
					 * This may differ depending on the list metadata
					 */
					ttl: 24 * 3600,

					/**
					 * Endpoint to download the list
					 */
					uri: uri,

					/**
					 * Timestamp in milisecond used to save when the
					 * list have been retrieved
					 */
					updated: Number(new Date())
				};
			}
		},

		/**
		 * Import domains in a list
		 * 
		 * This action will import domain from a list (available in the ./lists filter)
		 * into the service cache.
		 * 
		 * This action is optimised to parse large files (using streams)
		 */
		importListDomains: {
			/**
			 * Timeout of request in milliseconds. 
			 * If the request is timed out and you don’t define fallbackResponse, broker will throw a RequestTimeout error. 
			 * To disable set 0. If it’s not defined, the requestTimeout value from broker options will be used.
			 * More info: https://moleculer.services/docs/0.14/fault-tolerance.html#Timeout
			 */
			timeout: 0,
			params: {
				listMetas: "object",
			},

			/** @param {Context} ctx  */
			async handler(ctx) {
				//await new Promise(resolve => setTimeout(resolve, 150));
				const listMetas = ctx.params.listMetas;

				/**
				 * Then we read each line of the list and parse it.
				 * Finally we import each domain in the list into the cache.
				 */
				this.logger.info("importListDomains: listMetas", listMetas);
				const rl = readline.createInterface({
					input: fs.createReadStream(listMetas.filePath),
					crlfDelay: Infinity
				});
				
				/**
				 * Read line by line
				 * More info: https://nodejs.org/api/readline.html#readline_example_read_file_stream_line_by_line
				 * note: The for await...of wasn't working (it didn't read the full list)
				 */
				this.logger.info(`Importing list ${listMetas.name} to cache...`);
				rl.on("line", (line) => {
					/**
					 * Check if we don't have an empty line (line is empty) and
					 * if the list is not a comment (start with #)
					 */
					if (line && !line.startsWith("#")) {
						const key = `filter:l:${listMetas.name}:${line}`;
						this.broker.cacher.set(
							key, 
							{
								listName: listMetas.name,
								domain: line,
								ttl: listMetas.ttl
							},
							listMetas.ttl
						);
					}
				});
				await once(rl, "close");

				this.logger.info(`importListDomains: Domains from ${listMetas.name} list have been imported successfully!`);
				return true;
			}
		},

		/**
		 * registerList
		 * 
		 * This action is used to register the current list into the lists list :)
		 * 
		 * By doing so, you can check if a list have been already saved or has expired
		 */
		registerList: {
			params: {
				listMetas: "object"
			},

			/** @param {Context} ctx  */
			async handler(ctx) {
				const key = `filter:lists:${ctx.params.listMetas.name}`;
				return this.broker.cacher.set(key, ctx.params.listMetas, ctx.params.listMetas.ttl);
			}
		}
	},

	/**
	 * Events
	 */
	events: {
		/**
		 * filter.getDefaultList
		 * 
		 * This event is used wen we want to download and cache the default list
		 * to the service cache.
		 * 
		 * @param {Context} ctx 
		 */
		async "filter.getDefaultList"(ctx) {
			await ctx.call("v1.filter.getDefaultList");
		}
	},

	/**
	 * Methods
	 */
	methods: {
		
	},

	/**
	 * Service created lifecycle event handler
	 */
	created() {

	},

	/**
	 * Service started lifecycle event handler
	 */
	async started() {
		await this.waitForServices();
		this.logger.info("!!!! filter service: Services availables !!!!");
	},

	/**
	 * Service stopped lifecycle event handler
	 */
	async stopped() {

	}
};
