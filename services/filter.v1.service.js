/* eslint-disable indent */
"use strict";

const https = require("https");
const fs = require("fs");
const readline = require("readline");

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
		 * check
		 *
		 * This method is used to check if a domain belong to a list
		 * If the domain belong to a list then this function return
		 * restricted, if the domain is not found then pass is returned.
		 * 
		 * @param {String} domain - domain
		 * @param {String} list - listname (in lowercase)
		 * 
		 * @returns {Object} action: restrict|pass
		 * 
		 */
		check: {
			params: {
				domain: "string",
				list: "string|optional"
			},

			/**
			 * Enable action cache
			 */
			cache: true,

			/** @param {Context} ctx  */
			handler(ctx) {	
				ctx.logger.info("Hello !");
			}
		}
	},

	events: {
		/**
		 * filter.loadDomain
		 * 
		 * This event will load to redis store a domain based on a specific key
		 */
		"filter.loadDomain": {
			params: {
				domain: "string",
				listName: "string",
				ttl: "number|optional"
			},

			/** @param {Context} ctx  */
			handler(ctx) {
				const domain = ctx.params.domain;
				const listName = ctx.params.domain;
				const key = `filter:l:${listName}:${domain}}`;
				this.broker.cacher.set(key, {domain: domain, listName: listName}, ctx.params.ttl); // https://github.com/moleculerjs/moleculer/blob/2f7d3d0d1a39511bc6bb9b71c6729326a3e8afad/src/cachers/base.js#L126
			}
		}
	},

	methods: {
		/**
		 * loadDefaultList
		 * 
		 * This internal method is used to load the default list (1Host)
		 * After the list is downloaded, the list is saved into the service cache.
		 */
		async loadDefaultList() {
			const uri = "https://cdn.jsdelivr.net/gh/badmojr/1Hosts@latest/Pro/domains.txt";
			const name = "1Hosts";
			const span = this.broker.tracer.startSpan("method 'loadDefaultList'", {
				tags: {
					uri: uri,
					name: name,
					service: `v${this.version}.${this.name}`
				}
			});
			await this.loadList(uri, name);
			span.finish();
		},

		/**
		 * loadList
		 * 
		 * This internal method is used to import a list to the filter service.
		 * The list is then stored in the local cache for a limited time (TTL)
		 * up to 24 hours.
		 * 
		 * @param {String} uri 
		 * @param {String} name 
		 */
		async loadList(uri, name) {
			const listMetas = await this.downloadList(uri, name);
			const file = await readline.createInterface({
				input: fs.createReadStream(listMetas.filePath),
				output: process.stdout,
				terminal: false
			});
			file.on("line", (line) => {
				if (!line.startsWith("#")) {
					const key = `filter:l:${name}:${line}`;
					this.broker.cacher.set(
						key, 
						{
							listName: name,
							domain: line,
							ttl: listMetas.ttl
						},
						listMetas.ttl
					);
				}
			});
		},


		/**
		 * downloadList
		 * 
		 * This local method is used to download a list given a download url (uri)
		 * and save it into a file in the lists directory.
		 * 
		 * @param {String} uri 
		 * @param {String} name 
		 */
		async downloadList(uri, name) {
			const filePath = `./lists/${name}.txt`;
			const file = fs.createWriteStream(filePath, {flags : "w"});
			await https.get(uri, function(response) {
				response.pipe(file);
			});
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
		},
	},

	created() {
		this.logger.info("Service Filter created!, Loading default list...");
		this.loadDefaultList();
		this.logger.info("Default list loaded!");
	},

	async started() {

	}
};
