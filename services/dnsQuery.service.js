"use strict";

/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 */

const dohClient = require('dohjs');
const base64url = require('base64url');

module.exports = {
	name: "dnsQuery",

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
		 * Welcome, a username
		 *
		 * @param {String} name - User name
		 */
		lookup: {
			rest: {
				method: "GET",
				path: "/lookup"
			},
			params: {
        		dns: "string"
			},
			/** @param {Context} ctx  */
			async handler(ctx) {
				const decodedDomain = base64url.decode(ctx.params.dns);
				console.log(decodedDomain)
				const resolver = new dohClient.DohResolver('https://1.1.1.1/dns-query');
				const res = await resolver.query(ctx.params.dns, 'A');
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
