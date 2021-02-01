"use strict";

/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 */

const dohClient = require('dohjs');
const base64url = require('base64url');
const { DNSoverTLS } = require('dohdec');


module.exports = {
	name: "DoT",

	/**
	 * Settings
	 */
	settings: {

	},

	/**
	 * Dependencies
	 */
	dependencies: [],

	/**
	 * Actions
	 */
	actions: {
		/**
		 * Lookup a domain
		 *
		 * @param {String} dns - base64url of the domain
		 */
		lookup: {
			rest: {
				method: "GET",
				path: "/dns-query"
			},
			params: {
        		dns: "string"
			},
			/** @param {Context} ctx  */
			async handler(ctx) {
				const decoded = Buffer.from(ctx.params.dns, 'base64').toString()
				console.log("base64 decode: ", decoded)
				const decoded2 = base64url.decode(ctx.params.dns)
				console.log("base64url decode: ", decoded2)
				console.log("Google.com encoded: ",base64url.encode('google.com'))
				
				const res = await new DNSoverTLS({host: '1.1.1.1'}).lookup(ctx.params.dns)
				return res;
			}
		},
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

	},

	/**
	 * Service stopped lifecycle event handler
	 */
	async stopped() {

	}
};
