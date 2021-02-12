/* eslint-disable indent */
"use strict";


const fs = require("fs");
const dnsPacket = require("dns-packet");
const tls = require("tls");
const domain = process.env.DOMAIN || "alex.local.ndns.cf";

module.exports = {
	name: "dot",
	version: 1,
	mixins: [],

	settings: {

	},

	events: {
        
	},

	methods: {

	},

	created() {
		this.server = tls.createServer({
			host: "0.0.0.0",
			port: 853,

			// Necessary only if the server requires client certificate authentication.
			// key: fs.readFileSync(`./certificates/${domain}/private.key`),
			// cert: fs.readFileSync(`./certificates/${domain}/certificate.crt`),
			key: fs.readFileSync("./certificates/local.ndns.cf/privkey1.pem"),
			cert: fs.readFileSync("./certificates/local.ndns.cf/fullchain1.pem"),
			checkServerIdentity: () => { return null; },
			// enableTrace: true,
			rejectUnauthorized: false,
			servername: domain,
		}, (socket) => {
			socket.on("data", (data) => {
				const query = dnsPacket.streamDecode(data); // Decode TCP packet to json object
				const packet = dnsPacket.encode(query); // Encode the UDP packet to base64
				const base64Message = packet.toString("base64"); // Create the base64 query message
				this.logger.info("TCP query: ", query.questions[0]);
				this.broker.call(
					"v1.doh.resolveDoH", 
					{dns: base64Message}
				).then((response) => {
					const responseBuffer = dnsPacket.streamEncode(response);
					socket.write(responseBuffer);
				});
			});
		});
		this.server.on("error", (err) => {
			throw err;
		});
		this.server.listen(853, () => {
			this.logger.info(`DoT server listening on tls://0.0.0.0:853, (servername: ${domain})`);
		});		
	}
};
