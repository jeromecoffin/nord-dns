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
				this.logger.info(`isListinCache: ${isListinCache}`);
				if (!isListinCache) {
					

					
					//ctx.emit("filter.loadList", {listName: listName});
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
				this.logger.info("isDomainInList", isDomainInList);
				const action = isDomainInList ? "restrict" : "pass";
				
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
				const key = "filter:lists";
				const cachedLists = await this.broker.cacher.get(key);
				if (!cachedLists) {
					this.logger.warn("There is no cached list! You should consider caching at least one list");
					return false;
				}
				const listNames = cachedLists.map(list => list.name);
				this.logger.info("Lists in cache: ", listNames);
				return listNames.includes(ctx.params.name);
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
			 * Enable action cache
			 */
			cache: false,

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



		getAndSaveList: {
			timeout: 0,
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
				this.logger.info("listMetas: ", listMetas);


				/**
				 * Then we load domains of the list into the service cache
				 */
				const imported = await ctx.call("v1.filter.importListDomains", {listMetas: listMetas});
				this.logger.info("imported: ", imported);

				return true;
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
			params: {
				listName: "string",
				uri: "string",
				ttl: "number|optional"
			},
			/** @param {Context} ctx  */
			async handler(ctx) {
				const name = ctx.params.listName;
				const uri = ctx.params.uri;

				this.logger.info(`getList: Downloading list ${name} from ${uri}`);
				const filePath = `./lists/${name}.txt`;
				const response = await fetch(uri);
				await streamPipeline(response.body, fs.createWriteStream(filePath));
				this.logger.info("getList: Download completed!");

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
					ttl: 24 * 3600
				};
			}
		},


		/**
		 * Import domains in a list
		 * 
		 * This action will 
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
				this.logger.info("importListDomains: Importing list to cache...");
				rl.on("line", (line) => {
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
				this.logger.info(`importListDomains: Domains from  ${listMetas.name} list have been imported successfully!`);
			}
		},


	},

	events: {

	},

	methods: {
		
	},

	created() {

	},

	async started() {
		await this.waitForServices();
		this.logger.info("!!!! filter service: Services availables !!!!");
	}
};
