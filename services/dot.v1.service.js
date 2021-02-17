/* eslint-disable indent */
"use strict";


const fs = require("fs");
const dnsPacket = require("dns-packet");
const tls = require("tls");
const domain = process.env.DOMAIN || "alex.local.ndns.cf";
const keyPath = "./certificates/local.ndns.cf/privkey1.pem";
const certPath = "./certificates/local.ndns.cf/fullchain1.pem";

/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 */
module.exports = {
	name: "dot",
	version: 1,
	mixins: [],

	settings: {

	},

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
				// Convert the TCP packet (buffer) to base64 UDP message
				const messageQuery = await ctx.call(
					"v1.dot.parsePacket", 
					{buffer: ctx.params.payload}
				);

				// Resolve the query using the DoH resolver
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
				const query = dnsPacket.streamDecode(ctx.params.buffer); // Decode TCP packet to json object
				const packet = dnsPacket.encode(query); // Encode the UDP packet to base64
				return packet.toString("base64"); // Create the base64 query message
			}
		},
	},

	events: {
		
	},

	methods: {

	},

	created() {
		// Create a span to measure the initialization
		const host = "0.0.0.0";
		const port = 853;
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
	}
};
