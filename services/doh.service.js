"use strict";

/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 */
const dnsPacket = require('dns-packet');
const doh = require('dohjs');


module.exports = {
	/**
	 * DNS-over-HTTPS (DoH)
	 * RFC 8484 (GET and POST)
	 */
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
		 * Get DoH handler
		 *
		 * @param {String} dns - base64url of the domain
		 */
		getDoH: {
			rest: {
				method: "GET",
				path: "/dns-query"
			},
			params: {
        		dns: "string"
			},
			/** @param {Context} ctx  */
			async handler(ctx) {
				console.log(ctx.params.dns);
				const query = await this.decodeQueryMessage(ctx.params.dns);
				const response = await this.lookup(query);
				return response;

			}
		},

		/**
		 * Post DoH handler
		 *
		 * @param {String} dns - base64url of the domain
		 */
		postDoH: {
			rest: {
				method: "POST",
				path: "/dns-query"
			},
			/** @param {Context} ctx  */
			async handler(ctx) {
				return "no yet implemented";
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
		async decodeQueryMessage(msg) {
			const buf = await Buffer.from(msg, 'base64');
			const decoded = await dnsPacket.decode(buf);
			return decoded.questions[0];
		},

		async lookup(question) {
			/**
			 * Sample Question
			 * {
			 *		type: 'A', // or SRV, AAAA, etc
			 *		class: 'IN', // one of IN, CS, CH, HS, ANY. Default: IN
			 *		name: 'google.com' // which record are you looking for
			 *	}
			 */
			console.log('QUESTION:', question)
			

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
			const response = await this.resolver.query(question.name, question.type, "GET", {Accept: "application/dns-message"})
			console.log('RESPONSE', response)
			return response;
		}
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
		this.resolver = new doh.DohResolver('https://1.1.1.1/dns-query');
	},

	/**
	 * Service stopped lifecycle event handler
	 */
	async stopped() {

	}
};
