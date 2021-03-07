"use strict";

/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 */
const dnsPacket = require("dns-packet");

/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 */
module.exports = {
	
	/**
	 * Name of the module
	 * 
	 * DNS-over-HTTPS (DoH)
	 * RFC 8484 (GET and POST)
	 */
	name: "doh",

	/**
	 * Version of the module
	 */
	version: 1,

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
		 * @param {String} name - domain
		 * @param {String} type - Type (eg. A or AAAA)
		 * 
		 */
		resolve: {
			rest: {
				method: "GET",
				path: "/resolve"
			},
			params: {
				name: "string",
				type: "string"
			},

			/**
			 * Disable action cache
			 */
			cache: false,

			/** @param {Context} ctx  */
			async handler(ctx) {
				const packet = dnsPacket.encode({
					type: "query",
					id: 1,
					flags: dnsPacket.RECURSION_DESIRED,
					questions: [{
						type: ctx.params.type,
						name: ctx.params.name
					}]
				}).toString("base64");
				return await ctx.call("v1.doh.resolveDoH", {dns: packet});
			}
		},

		/**
		 * DoH handler
		 *
		 * @param {String} dns - base64url of the domain
		 */
		resolveDoH: {
			// visibility: "protected", // Action visibility. More info: https://moleculer.services/docs/0.14/actions.html#Action-visibility

			params: {
				dns: "string" // base64 query
			},

			/**
			 * Disable action cache
			 */
			cache: false,

			/** @param {Context} ctx  */
			async handler(ctx) {
				/**
				 * Query is an object containing the packet query
				 */
				const query = await ctx.call("v1.doh.decodeUdpPacket", {message: ctx.params.dns});
				this.logger.info("Query:", query);

				/**
				 * Check the domain in the cache
				 */
				const key = `doh:q:${query.name}:${query.type}:${query.class}`;
				const cachedResponse = await this.broker.cacher.getWithTTL(key);
				let ttl = cachedResponse.ttl;

				let response = {};
				if (cachedResponse.data) {
					ctx.emit("doh.cachedResponse");
					this.logger.info("Response: ", cachedResponse.data.answers[0]);
					ctx.cachedResult = true; // Display the action as yellow in Tracer
					response = cachedResponse.data;
				} else {
					response = await ctx.call(
						"v1.resolver.query", {
							name: query.name,
							type: query.type,
							class: query.class
						}
					);
					ttl = Math.min(...response.answers.map(answer => answer.ttl));
					ctx.emit("doh.response", {response: response});
				}
				ctx.meta.$responseHeaders = {
					"Cache-Control": `public, max-age=${ttl}`
				};

				/**
				 * Check if there is a list id to pass by
				 */
				const listName = ctx.meta.listId;

				/**
				 * Check if the domain is in the filterList
				 */
				if (listName) {
					/**
					 * listResult
					 * 
					 * Object:
					 * {
					 * 	action: "pass|restrict"
					 * }
					 */
					const listResult = await ctx.call(
						"v1.filter.checkDomain",
						{
							domain: query.name,
							listName: listName,
						}
					);

					if (listResult.action == "restrict") {
						// We must HERE find a way to return NXDOMAIN with NO answers
						response.rcode = "NXDOMAIN";
						response.answers = [];
					}
				}

				return response;
			}
		},

		/**
		 * Decode UDP DNS packet (encoded as a base64 string)
		 */
		decodeUdpPacket: {
			params: {
				message: "string"
			},

			/**
			 * Enable action cache
			 */
			cache: true,

			/** @param {Context} ctx  */
			async handler(ctx) {
				const decodedMessage = await this.decodeQueryMessage(ctx.params.message);
				ctx.meta.queryName = decodedMessage.name;
				ctx.meta.queryType = decodedMessage.type;
				ctx.meta.queryClass = decodedMessage.class;
				return decodedMessage;
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

			/**
			 * Disable action cache
			 */
			cache: false,

			/** @param {Context} ctx  */
			async handler(ctx) {
				const response = await ctx.call("v1.doh.resolveDoH", {dns: ctx.params.dns});
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

			/**
			 * Disable action cache
			 */
			cache: false,

			/** @param {Context} ctx  */
			async handler(ctx) {
				const response = await ctx.call("v1.doh.parsePostDoH");
				return response;
			}
		},

		/**
		 * Get User DoH handler
		 *
		 * @param {String} dns - base64url of the domain
		 */
		getUserDoH: {
			rest: {
				method: "GET"
			},
			params: {
				dns: "string",
				userId: "string"
			},

			/**
			 * Disable action cache
			 */
			cache: false,

			/** @param {Context} ctx  */
			async handler(ctx) {
				const userId = ctx.params.userId;
				this.logger.info("getUserDoH userId: ", userId);
				return await ctx.call("v1.doh.getDoH", {dns: ctx.params.dns});
			}
		},

		/**
		 * Post User DoH handler
		 *
		 * @param {String} dns - base64url of the domain
		 */
		postUserDoH: {
			rest: {
				method: "POST"
			},
			params: {
				userId: "string"
			},

			/**
			 * Disable action cache
			 */
			cache: false,

			/** @param {Context} ctx  */
			async handler(ctx) {
				const userId = ctx.params.userId;
				this.logger.info("postUserDoH userId: ", userId);
				return await ctx.call("v1.doh.parsePostDoH");
			}
		},

		/**
		 * Get List DoH handler
		 *
		 * @param {String} dns - base64url of the domain
		 */
		getListDoH: {
			rest: {
				method: "GET"
			},
			params: {
				dns: "string",
				listId: "string"
			},

			/**
			 * Disable action cache
			 */
			cache: false,

			/** @param {Context} ctx  */
			async handler(ctx) {
				const listId = ctx.params.listId;
				ctx.meta.listId = listId;
				this.logger.info("getListDoH listId: ", listId);
				return await ctx.call("v1.doh.getDoH", {dns: ctx.params.dns});
			}
		},

		/**
		 * Post List DoH handler
		 *
		 * @param {String} dns - base64url of the domain
		 */
		postListDoH: {
			rest: {
				method: "POST"
			},

			params: {
				listId: "string"
			},

			/**
			 * Disable action cache
			 */
			cache: false,

			/** @param {Context} ctx  */
			async handler(ctx) {
				const listId = ctx.params.listId;
				ctx.meta.listId = listId;
				return await ctx.call("v1.doh.parsePostDoH");
			}
		},

		/**
		 * Post DoH handler
		 * 
		 * Check if the Content-Type is application/dns-message
		 * and return a DNS response
		 *
		 * @param {String} dns - base64url of the domain
		 */
		parsePostDoH: {
			rest: {
				method: "POST",
				path: "/dns-query"
			},

			/**
			 * Disable action cache
			 */
			cache: false,

			/** @param {Context} ctx  */
			async handler(ctx) {
				if (ctx.meta.contentType == "application/dns-message") {
					const response = await ctx.call("v1.doh.resolveDoH", {dns: ctx.meta.body});
					const responseMessage = await dnsPacket.encode(response);
					ctx.meta.$responseType = "application/dns-message";
					return responseMessage;
				} else {
					this.logger.error("contentType is not valid, expected application/dns-message");
					return false;
				}
			}
		},
	},

	/**
	 * Events
	 */
	events: {
		/**
		 * doh.response
		 * 
		 * Event Triggered when a response is retrived from the main dns server (recursive)
		 * This event will add to the cache the pre-formatted response (json format)
		 * Finally, this event trigger count.add event
		 */
		"doh.response": {
			params: {
				response: "object",
			},

			/** @param {Context} ctx  */
			handler(ctx) {
				const response = ctx.params.response;
				const key = `doh:q:${response.questions[0].name}:${response.questions[0].type}:${response.questions[0].class}`;

				// If NXDOMAIN or answers is empty then cache response for a hour (3600 seconds), else set the default ttl to the ttl of the first answer
				let ttl = (response.rcode == "NXDOMAIN" || response.answers.length == 0) ? 3600 : response.answers[0].ttl;

				// Then loop to find the smallest TTL among responses
				for (const answer of response.answers) {
					ttl = (answer.ttl < ttl) ? answer.ttl : ttl;
				}
				if (ttl > 0) {
					// Cache only the response if TTL is greater than 0
					this.broker.cacher.set(key, response, ttl); // https://github.com/moleculerjs/moleculer/blob/2f7d3d0d1a39511bc6bb9b71c6729326a3e8afad/src/cachers/base.js#L126
				}
				ctx.emit("doh.count.add");
			}
		},

		/**
		 * doh.cachedResponse
		 * 
		 * Cached response, simply trigger count.add event
		 */
		"doh.cachedResponse"(ctx) {
			ctx.emit("doh.count.add");
		},


		/**
		 * count.add
		 * 
		 * Count the number of response
		 * Save this number onto redis cache
		 */
		async "doh.count.add"(ctx) {
			const key = "doh:count";
			const count = await ctx.broker.cacher.get(key);
			let newCount = 1;
			if (count) {
				newCount = count + 1;
			}
			await this.broker.cacher.set(key, newCount); // No ttl, doesn't expire
			this.logger.info("# of queries: ", newCount);
		}
	},

	/**
	 * Methods
	 */
	methods: {

		/**
		 * decodeQueryMessage
		 * 
		 * This method take a UDP packet (as a string) and
		 * return the first question of the request
		 * 
		 * @param {*} msg 
		 */
		async decodeQueryMessage(msg) {
			const buf = await Buffer.from(msg, "base64");
			const decoded = await dnsPacket.decode(buf);
			return decoded.questions[0];
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

	},

	/**
	 * Service stopped lifecycle event handler
	 */
	async stopped() {

	}
};
