"use strict";

const ApiGateway = require("moleculer-web");
const fs = require("fs");
const bodyParser = require("body-parser");
const rawParser = bodyParser.raw({ type: "application/dns-message" });
const domain = process.env.DOMAIN || "local.ndns.cf";

/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 * @typedef {import('http').IncomingMessage} IncomingRequest Incoming HTTP Request
 * @typedef {import('http').ServerResponse} ServerResponse HTTP Server Response
 */

module.exports = {
	name: "api",
	mixins: [ApiGateway],

	// More info about settings: https://moleculer.services/docs/0.14/moleculer-web.html
	settings: {
		// Exposed port
		port: process.env.PORT || 8443,

		// HTTPS server with certificate		
		https: {
			key: fs.readFileSync(`./certificates/${domain}/private.key`),
			cert: fs.readFileSync(`./certificates/${domain}/certificate.crt`),
			allowHTTP1: true,
		},

		// Use HTTP2 server
		http2: true,

		// Exposed IP
		ip: "0.0.0.0",

		// Global Express middlewares. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Middlewares
		use: [rawParser],

		routes: [
			{
				path: "/api",

				// CORS headers. More info: https://moleculer.services/docs/0.14/moleculer-web.html#CORS-headers
				cors: {
					// Configures the Access-Control-Allow-Origin CORS header.
					origin: "*",

					// Configures the Access-Control-Allow-Methods CORS header. 
					methods: ["GET", "OPTIONS", "POST"],

					// Configures the Access-Control-Allow-Headers CORS header.
					// allowedHeaders: [],

					// // Configures the Access-Control-Expose-Headers CORS header.
					// exposedHeaders: [],

					// // Configures the Access-Control-Allow-Credentials CORS header.
					// credentials: false,

					// // Configures the Access-Control-Max-Age CORS header.
					// maxAge: 3600
				},

				whitelist: [
					"**"
				],

				// Route-level Express middlewares. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Middlewares
				// use: [rawParser],

				// Enable/disable parameter merging method. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Disable-merging
				mergeParams: true,

				// Enable authentication. Implement the logic into `authenticate` method. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Authentication
				authentication: false,

				// Enable authorization. Implement the logic into `authorize` method. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Authorization
				authorization: false,

				// The auto-alias feature allows you to declare your route alias directly in your services.
				// The gateway will dynamically build the full routes from service schema.
				autoAliases: true,

				aliases: {},

				/** 
				 * Before call hook. You can check the request.
				 * @param {Context} ctx 
				 * @param {Object} route 
				 * @param {IncomingRequest} req 
				 * @param {ServerResponse} res 
				 * @param {Object} data
				 */
				// onBeforeCall(ctx, route, req, res) {
				// 	// Set request headers to context meta
				// 	ctx.meta.userAgent = req.headers["user-agent"];
				// }, 


				/**
				 * After call hook. You can modify the data.
				 * @param {Context} ctx 
				 * @param {Object} route 
				 * @param {IncomingRequest} req 
				 * @param {ServerResponse} res 
				 * @param {Object} data
				 */
				// onAfterCall(ctx, route, req, res, data) {
				// 	// Async function which return with Promise
				// 	return doSomething(ctx, res, data);
				// },

				// Calling options. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Calling-options
				callingOptions: {},

				// bodyParsers: {
				// 	json: {
				// 		strict: false,
				// 		limit: "1MB"
				// 	},
				// 	urlencoded: {
				// 		extended: true,
				// 		limit: "1MB"
				// 	}
				// },

				// Mapping policy setting. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Mapping-policy
				mappingPolicy: "all", // Available values: "all", "restrict"

				// Enable/disable logging
				logging: true
			}
		],

		// Do not log client side errors (does not log an error response when the error.code is 400<=X<500)
		log4XXResponses: false,
		// Logging the request parameters. Set to any log level to enable it. E.g. "info"
		logRequestParams: null,
		// Logging the response data. Set to any log level to enable it. E.g. "info"
		logResponseData: null,
	},

	methods: {

	}
};
