"use strict";


const fs = require("fs");
const dnsPacket = require("dns-packet");
const tls = require("tls");

const domain = process.env.APP_DOMAIN_ROOT || "localhost.local.ndns.cf";
const certFolder = (domain == "ndns.cf") ? domain : "local.ndns.cf";

const keyPath = `./certificates/${certFolder}/privkey1.pem`;
const certPath = `./certificates/${certFolder}/fullchain1.pem`;

/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 */
module.exports = {

	/**
	 * Name of the module
	 * 
	 * DNS-over-TLS (DoT)
	 * RFC 7858 & 8310
	 */
	name: "dot",

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
	 * Actions
	 */
	actions: {

		/**
		 * resolveDoT
		 * 
		 * This method is used to handle the DoT query
		 * - Decode message
		 * - Encode query to DoH packet
		 * - Make DoH query (using the doh service)
		 * - Parse response to a DoT packet
		 */
		resolveDoT: {

			/**
			 * Disable action cache
			 */
			cache: false,
			
			/** @param {Context} ctx  */
			async handler(ctx) {
				/**
				 * messageQuery
				 * 
				 * Contain the base64 UDP message from the TCP packet (buffer)
				 */
				const messageQuery = await ctx.call(
					"v1.dot.parsePacket", 
					{buffer: ctx.params.payload}
				);

				/**
				 * response
				 * 
				 * Contain the DNS response from the default service resolver
				 */
				const response = await ctx.call (
					"v1.doh.resolveDoH",
					{dns: messageQuery}
				);

				// Encode the response into a TCP DNS packet
				return dnsPacket.streamEncode(response); // Response buffer
			}
		},

		/**
		 * parsePacket
		 * 
		 * This method is used to decode a TLS (TCP) packet to a base64 UDP packet
		 */
		parsePacket: {

			/**
			 * Disable action cache
			 */
			cache: false,

			/** @param {Context} ctx  */
			handler(ctx) {

				/**
				 * query
				 * 
				 * Is an object containing the query to be made
				 * decoded from a TCP packet
				 */
				const query = dnsPacket.streamDecode(ctx.params.buffer);

				/**
				 * packet
				 * 
				 * Convert the query object to a UDP packet (buffer)
				 */
				const packet = dnsPacket.encode(query);

				/**
				 * response
				 * 
				 * Convert the UDP packet to a string (base64)
				 */
				const response = packet.toString("base64"); // Create the base64 query message
				return response;
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
		// Create a span to measure the initialization
		const host = "0.0.0.0";
		const port = process.env.PORT || 853;
		const span = this.broker.tracer.startSpan("initializing TLS socket", {
			tags: {
				host: host,
				port: port,
				service: `v${this.version}.${this.name}`
			}
		});
		this.server = tls.createServer({
			host: host,
			port: port,

			// Necessary only if the server requires client certificate authentication.
			key: fs.readFileSync(keyPath),
			cert: fs.readFileSync(certPath),
			checkServerIdentity: () => { return null; },
			// enableTrace: true,
			rejectUnauthorized: false,
			servername: domain,
		}, (socket) => {
			socket.on("data", (data) => {
				this.broker.call(
					"v1.dot.resolveDoT", 
					{payload: data}
				).then((response) => {
					socket.write(response);
				});
			});
		});
		this.server.on("error", (err) => {
			throw err;
		});
		this.server.listen(port, () => {
			this.logger.info(`DoT server listening on tls://${host}:${port}, (servername: ${domain})`);
			// Finish the main span.
			span.finish();
		});		
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
