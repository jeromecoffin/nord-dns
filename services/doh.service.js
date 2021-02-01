"use strict";

/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 */

const dohClient = require('dohjs');

module.exports = {
	name: "doh",

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
		 * Say a 'Hello' action.
		 *
		 * @returns
		 */
		hello: {
			rest: {
				method: "GET",
				path: "/hello"
			},
			async handler() {
				return "Hello Moleculer";
			}
		},

		/**
		 * Welcome, a username
		 *
		 * @param {String} name - User name
		 */
		welcome: {
			rest: "/welcome",
			params: {
				name: "string"
			},
			/** @param {Context} ctx  */
			async handler(ctx) {
				return `Welcome, ${ctx.params.name}`;
			}
		},
		/**
		 * Welcome, a username
		 *
		 * @param {String} name - User name
		 */
		lookup: {
			rest: "/lookup",
			params: {
				domain: "string"
			},
			/** @param {Context} ctx  */
			async handler(ctx) {
				const resolver = new dohClient.DohResolver('https://1.1.1.1/dns-query');
        const res = await resolver.query(ctx.params.domain, 'A');
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
