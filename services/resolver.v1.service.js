"use strict";

const doh = require("dohjs");


/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 */
module.exports = {

	/**
	 * Name of the module
	 * 
	 * Selenium
	 */
	name: "resolver",

	/**
	 * Version of the module
	 */
	version: 1,

	mixins: [],

	/**
	 * Settings
	 */
	settings: {

		/**
		 * Resolver
		 * 
		 * Where to send the DNS query
		 * 
		 * https://dns.google/dns-query
		 * https://cloudflare-dns.com/dns-query
		 * https://doh.opendns.com/dns-query
		 * https://dns.quad9.net/dns-query
		 */
		resolver: "https://dns.google/dns-query"
	},

	/**
	 * Actions
	 */
	actions: {
		/**
		 * query
		 * 
		 * This method take a question object, make a
		 * DoH query using the default service resolver
		 * and return a response object
		 * 
		 * @param {String} name - domain
		 * @param {String} type - Type (eg. A or AAAA)
		 * 
		 * @returns {Object}
		 */
		"query": {
			params: {
				name: "string",
				type: "string",
				class: "string"
			},

			/**
			 * Disable action cache
			 */
			cache: false,

			/** @param {Context} ctx  */
			async handler(ctx) {
				/**
				 * Sample Question
				 * {
				 *		type: 'A', // or SRV, AAAA, etc
				*		class: 'IN', // one of IN, CS, CH, HS, ANY. Default: IN
				*		name: 'google.com' // which record are you looking for
				*	}
				*/
				// this.logger.info("Question:", question);

				/**
				 * Sample Response
				 * {
				 *		type: 'A', // or SRV, AAAA, etc
				*		class: 'IN', // one of IN, CS, CH, HS
				*		name: 'google.com', // which name is this record for
				*		ttl: optionalTimeToLiveInSeconds,
				*		(record specific data, see below): https://www.npmjs.com/package/dns-packet#supported-record-types
				*	}
				*/
				return await this.resolver.query(ctx.params.name, ctx.params.type, "GET", {Accept: "application/dns-message"});
			}
		}
	},

	/**
	 * Events
	 */
	events: {
		
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
		this.resolver = new doh.DohResolver(this.settings.resolver);
		this.logger.info("DohResolver registered and ready to serve!");
	},

	/**
	 * Service stopped lifecycle event handler
	 */
	async stopped() {
        
	}
};
