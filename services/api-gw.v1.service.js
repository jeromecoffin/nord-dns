"use strict";

const ApiGateway = require("moleculer-web");
const bodyParser = require("body-parser");
const rawParser = bodyParser.raw({ type: "application/dns-message" });

/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 * @typedef {import('http').IncomingMessage} IncomingRequest Incoming HTTP Request
 * @typedef {import('http').ServerResponse} ServerResponse HTTP Server Response
 */
module.exports = {

	/**
	 * Name of the module
	 * 
	 * DNS-over-TLS (DoT)
	 * RFC 7858 & 8310
	 */
	name: "api-gw",
	version: 1,

	mixins: [ApiGateway],

	/**
	 * More info about settings: https://moleculer.services/docs/0.14/moleculer-web.html
	 */
	settings: {
		/**
		 * Exposed port
		 */
		port: process.env.PORT || 3000,

		/**
		 * HTTPS server with certificate
		 * 
		 * Will be passed as first argument to
		 * https.createSecureServer()
		 * 
		 * More info: https://nodejs.org/api/http2.html#http2_http2_createsecureserver_options_onrequesthandler
		 * 
		 * or https.createServer()
		 * 
		 * More info: https://nodejs.org/api/http2.html#http2_http2_createserver_options_onrequesthandler
		 */
		// https: {
		// 	key: fs.readFileSync(keyPath),
		// 	cert: fs.readFileSync(certPath),
		// 	allowHTTP1: true,
		// },
		https: false,

		/**
		 * API Gateway provides an experimental support for HTTP2.
		 * You can turn it on with http2: true in service settings.
		 * more info: https://moleculer.services/docs/0.14/moleculer-web.html#HTTP2-Server
		 */
		http2: process.env.USE_HTTP2 || true,

		// Exposed IP
		ip: "0.0.0.0",

		/**
		 * Global Express middlewares.
		 * More info: https://moleculer.services/docs/0.14/moleculer-web.html#Middlewares
		 */
		use: [],

		/**
		 * Base path
		 */
		path: "",

		/**
		 * Routes
		 */
		routes: [
			{
				/**
				 * Path for this route
				 */
				path: "",

				/**
				 * CORS headers.
				 * More info: https://moleculer.services/docs/0.14/moleculer-web.html#CORS-headers
				 */
				cors: {
					/**
					 * Configures the Access-Control-Allow-Origin CORS header.
					 */
					origin: "*",

					/**
					 * Configures the Access-Control-Allow-Methods CORS header. 
					 */
					methods: ["GET", "OPTIONS", "POST"]
				},

				/**
				 * Action whitelist
				 * 
				 * More info: https://moleculer.services/docs/0.14/moleculer-web.html#Whitelist
				 */
				whitelist: [
					"**"
				],

				/**
				 * Route-level Express middlewares.
				 * More info: https://moleculer.services/docs/0.14/moleculer-web.html#Middlewares
				 */
				use: [rawParser],

				/**
				 * Enable/disable parameter merging method.
				 * More info: https://moleculer.services/docs/0.14/moleculer-web.html#Disable-merging
				 */
				mergeParams: true,

				/**
				 * Enable authentication.
				 * Implement the logic into `authenticate` method.
				 * More info: https://moleculer.services/docs/0.14/moleculer-web.html#Authentication
				 */
				authentication: false,

				/**
				 * Enable authorization.
				 * Implement the logic into `authorize` method.
				 * More info: https://moleculer.services/docs/0.14/moleculer-web.html#Authorization
				 */
				authorization: false,

				/**
				 * The auto-alias feature allows you to declare your route alias directly in your services.
				 * The gateway will dynamically build the full routes from service schema.
				 */
				autoAliases: false,

				/**
				 * Use alias names.
				 * You can also specify the method. Otherwise it will handle every method types.
				 * Using named parameters in aliases is possible. 
				 * Named parameters are defined by prefixing a colon to the parameter name (:name).
				 * More info: https://moleculer.services/docs/0.14/moleculer-web.html#Aliases
				 */
				aliases: {
					/**
					 * Default route, GET method
					 * No filter what so ever
					 */
					"GET /": "v1.doh.getDoH",

					/**
					 * Default route, POST method
					 * no filter what so ever
					 */
					"POST /": "v1.doh.postDoH",

					/**
					 * Default route, GET method
					 * no filter, plain-text query
					 */
					"GET /resolve": "v1.doh.resolve",

					/**
					 * Filter by list, GET method
					 */
					"GET l/:listId": "v1.doh.getListDoH",

					/**
					 * Filter by list, POST method
					 */
					"POST l/:listId": "v1.doh.postListDoH",

					/**
					 * Filter by user list, GET method
					 */
					"GET u/:userId": "v1.doh.getUserDoH",

					/**
					 * Filter by user list, POST method
					 */
					"POST u/:userId": "v1.doh.postUserDoH",
				},

				/** 
				 * Before call hook. You can check the request.
				 * @param {Context} ctx 
				 * @param {Object} route 
				 * @param {IncomingRequest} req 
				 * @param {ServerResponse} res 
				 * @param {Object} data
				 */
				onBeforeCall(ctx, route, req, res) {
					const span = ctx.startSpan("onBeforeCall");

					/**
					 * HTTP2
					 * True if the request is made over HTTP2
					 * False if not (HTTP1)
					 */
					ctx.meta.http2 = (req.httpVersionMajor == 2);

					/**
					 * Method
					 * Method used to make the request
					 * eg. POST, GET
					 */
					ctx.meta.method = req.method;
					if (ctx.meta.method == "POST") {
						/**
						 * raw_body
						 * Save the raw request (Buffer, save as object)
						 */
						ctx.meta.raw_body = req.body;
						try {
							/**
							 * body
							 * parsed body, base64 message
							 */
							ctx.meta.body = req.body.toString("base64");
						} catch (error) {
							this.logger.error("Can't parse body: ", req.body);
						}
						ctx.meta.contentType = req.headers["content-type"];
					}

					/**
					 * userAgent
					 * Save the user agent of the remote client making the request
					 */
					ctx.meta.userAgent = req.headers["user-agent"];
					span.finish();
				}, 


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

				/**
				 * Calling options.
				 * More info: https://moleculer.services/docs/0.14/moleculer-web.html#Calling-options
				 */
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

				/**
				 * Mapping policy setting.
				 * The route has a mappingPolicy property to handle routes without aliases.
				 * - all - enable to request all routes with or without aliases (default)
				 * - restrict - enable to request only the routes with aliases.
				 * More info: https://moleculer.services/docs/0.14/moleculer-web.html#Mapping-policy
				 */
				mappingPolicy: "restrict",

				/**
				 * Enable/disable logging
				 */
				logging: true
			}
		],

		/**
		 * Do not log client side errors (does not log an error response when the error.code is 400<=X<500)
		 */
		log4XXResponses: false,

		/**
		 * Logging the request parameters. Set to any log level to enable it. E.g. "info"
		 */
		logRequestParams: null,

		/**
		 * Logging the response data. Set to any log level to enable it. E.g. "info"
		 */
		logResponseData: null,
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
		/**
		 * protocol used to serve this service
		 * 
		 * Could be:
		 * - HTTP2 over HTTPS
		 * - HTTP2 over HTTP without TLS
		 */
		const protocol = (this.settings.http2) ? (this.settings.https) ? "https": "h2c" : "http";
		this.logger.info(`API gateway stated and listening on ${protocol}://${this.settings.ip}:${this.settings.port}!`);
	},

	/**
	 * Service stopped lifecycle event handler
	 */
	async stopped() {

	}
};
