/* eslint-disable indent */
"use strict";


const fs = require("fs");
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
			key: fs.readFileSync(`./certificates/${domain}/private.key`),
			cert: fs.readFileSync(`./certificates/${domain}/certificate.crt`),
			checkServerIdentity: () => { return null; },

			enableTrace: true,
			rejectUnauthorized: false,
			servername: domain,
		}, (socket) => {
			console.log("server connected", socket.authorized ? "authorized" : "unauthorized");
			socket.write("welcome!\n");
			socket.setEncoding("utf8");
			socket.on("data", (data) => {
				console.log(data);
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
