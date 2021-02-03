"use strict";

/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 */
const dnsPacket = require("dns-packet");
const doh = require("dohjs");


module.exports = {
	/**
	 * DNS-over-HTTPS (DoH)
	 * RFC 8484 (GET and POST)
	 */
	name: "doh",
	version: 1,

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
		resolve: {
			rest: {
				method: "GET",
				path: "/resolve"
			},
			params: {
				dns: "string"
			},
			cache: {
				ttl: 1
			},
			meta: {
				ttl: 10
			},
			/** @param {Context} ctx  */
			async handler(ctx) {
				console.log("[Resolve] QUERY PARAMS: ", ctx.params.dns);
				const query = await this.decodeQueryMessage(ctx.params.dns);
				const response = await this.lookup(query);
				ctx.meta.ttl = query.ttl;
				return response;
			}
		},

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
			cache: {
				ttl: 1
			},
			/** @param {Context} ctx  */
			async handler(ctx) {
				console.log("getDoH");
				const response = await ctx.call("v1.doh.resolve", {dns: ctx.params.dns});
				const responseMessage = await dnsPacket.encode(response);
				ctx.meta.$responseType = "application/dns-message";
				return responseMessage;
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
				console.log("postDoH");
				if (ctx.options.parentCtx.params.req.headers["content-type"] == "application/dns-message") {
					const bytesArray = Object.values(ctx.params);
					const buffer = new Buffer.from(bytesArray);
					const base64Message = buffer.toString("base64");
					const response = await ctx.call("v1.doh.resolve", {dns: base64Message});
					const responseMessage = await dnsPacket.encode(response);
					ctx.meta.$responseType = "application/dns-message";
					return responseMessage;
				} else {
					return false;
				}
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
			const buf = await Buffer.from(msg, "base64");
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
			console.log("QUESTION:", question);

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
			const response = await this.resolver.query(question.name, question.type, "GET", {Accept: "application/dns-message"});
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
		this.resolver = new doh.DohResolver(this.settings.resolver);
	},

	/**
	 * Service stopped lifecycle event handler
	 */
	async stopped() {

	}
};
