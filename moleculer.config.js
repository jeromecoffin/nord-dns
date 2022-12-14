"use strict";

const { ServiceBroker } = require("moleculer");

/**
 * Moleculer ServiceBroker configuration file
 *
 * More info about options:
 *     https://moleculer.services/docs/0.14/configuration.html
 *
 *
 * Overwriting options in production:
 * ================================
 * 	You can overwrite any option with environment variables.
 * 	For example to overwrite the "logLevel" value, use `LOGLEVEL=warn` env var.
 * 	To overwrite a nested parameter, e.g. retryPolicy.retries, use `RETRYPOLICY_RETRIES=10` env var.
 *
 * 	To overwrite broker’s deeply nested default options, which are not presented in "moleculer.config.js",
 * 	use the `MOL_` prefix and double underscore `__` for nested properties in .env file.
 * 	For example, to set the cacher prefix to `MYCACHE`, you should declare an env var as `MOL_CACHER__OPTIONS__PREFIX=mycache`.
 *  It will set this:
 *  {
 *    cacher: {
 *      options: {
 *        prefix: "mycache"
 *      }
 *    }
 *  }
 */
module.exports = {
	/**
	 * Namespace of nodes to segment your nodes on the same network.
	 * (e.g.: “development”, “staging”, “production”). Default: ""
	 * 
	 * More info: https://moleculer.services/docs/0.14/configuration.html#Broker-options
	 */
	namespace: process.env.NAMESPACE || "com.nord-dns",
	
	/**
	 * Unique node identifier. Must be unique in a namespace.
	 * If not the broker will throw a fatal error and stop the process. Default: hostname + PID
	 * 
	 * More info: https://moleculer.services/docs/0.14/configuration.html#Broker-options
	 */
	nodeID: process.env.HOSTNAME || null,
	
	/**
	 * Custom metadata store. Store here what you want. Accessing: `this.broker.metadata`
	 * Default: null
	 */
	metadata: {},

	/**
	 * Watch the loaded services and hot reload if they changed.
	 * 
	 * More info: https://moleculer.services/docs/0.14/services.html#Hot-Reloading-Services
	 */
	hotReload: true,

	/**
	 * Enable/disable logging or use custom logger.
	 * 
	 * More info: https://moleculer.services/docs/0.14/logging.html
	 * Available logger types: "Console", "File", "Pino", "Winston", "Bunyan", "debug", "Log4js", "Datadog"
	 */
	logger: {
		type: "Console",
		options: {
			/**
			 * Using colors on the output
			 */
			colors: true,

			/**
			 * Print module names with different colors (like docker-compose for containers)
			 */
			moduleColors: false,

			/**
			 * Line formatter. It can be "json", "short", "simple", "full", a `Function` or a template string like "{timestamp} {level} {nodeID}/{mod}: {msg}"
			 */
			formatter: "full",

			/**
			 * Custom object printer. If not defined, it uses the `util.inspect` method.
			 */
			objectPrinter: null,

			/**
			 * Auto-padding the module name in order to messages begin at the same column.
			 */
			autoPadding: true
		}
	},

	/**
	 * Default log level for built-in console logger. It can be overwritten in logger options above.
	 * Available values: trace, debug, info, warn, error, fatal
	 */
	logLevel: "info",
	
	/**
	 * Define transporter.
	 * 
	 * More info: https://moleculer.services/docs/0.14/networking.html
	 * Note: During the development, you don't need to define it because all services will be loaded locally.
	 * In production you can set it via `TRANSPORTER=nats://localhost:4222` environment variable.
	 */
	transporter: process.env.TRANSPORTER || null, //"NATS"

	/**
	 * Define a cacher.
	 * 
	 * More info: https://moleculer.services/docs/0.14/caching.html
	 */
	cacher: process.env.REDIS_URI || "redis://172.17.0.1:6379",

	/**
	 * Define a serializer.
	 * Available values: "JSON", "Avro", "ProtoBuf", "MsgPack", "Notepack", "Thrift".
	 * 
	 * More info: https://moleculer.services/docs/0.14/networking.html#Serialization
	 */
	serializer: "JSON",

	/**
	 * Number of milliseconds to wait before reject a request with a RequestTimeout error. Disabled: 0
	 * 
	 * More info: https://moleculer.services/docs/0.14/configuration.html#Broker-options
	 */
	requestTimeout: 0,

	/**
	 * Retry policy settings.
	 * 
	 * More info: https://moleculer.services/docs/0.14/fault-tolerance.html#Retry
	 */
	retryPolicy: {
		/**
		 * Enable feature
		 */
		enabled: false,

		/**
		 * Count of retries
		 */
		retries: 3,

		/**
		 * First delay in milliseconds.
		 */
		delay: 100,

		/**
		 * Maximum delay in milliseconds.
		 */
		maxDelay: 1000,

		/**
		 * Backoff factor for delay. 2 means exponential backoff.
		 */
		factor: 2,

		/**
		 * A function to check failed requests.
		 * @param {*} err 
		 */
		check: err => err && !!err.retryable
	},

	/**
	 * Limit of calling level. If it reaches the limit, broker will throw an MaxCallLevelError error. (Infinite loop protection)
	 * 
	 * More info: https://moleculer.services/docs/0.14/configuration.html#Broker-options
	 */
	maxCallLevel: 100,

	/**
	 * Number of seconds to send heartbeat packet to other nodes.
	 * 
	 * More info: https://moleculer.services/docs/0.14/configuration.html#Broker-options
	 */
	heartbeatInterval: 10,

	/**
	 * Number of seconds to wait before setting node to unavailable status.
	 * 
	 * More info: https://moleculer.services/docs/0.14/configuration.html#Broker-options
	 */
	heartbeatTimeout: 30,

	/**
	 * Cloning the params of context if enabled. High performance impact, use it with caution!
	 * 
	 * More info: https://moleculer.services/docs/0.14/configuration.html#Broker-options
	 */
	contextParamsCloning: false,

	/**
	 * Tracking requests and waiting for running requests before shuting down.
	 * 
	 * More info: https://moleculer.services/docs/0.14/context.html#Context-tracking
	 */
	tracking: {
		/**
		 * Enable feature
		 */
		enabled: false,

		/**
		 * Number of milliseconds to wait before shuting down the process.
		 */
		shutdownTimeout: 5000,
	},

	/**
	 * Disable built-in request & emit balancer. (Transporter must support it, as well.).
	 * 
	 * More info: https://moleculer.services/docs/0.14/networking.html#Disabled-balancer
	 */
	disableBalancer: false,

	/**
	 * Settings of Service Registry.
	 * 
	 * More info: https://moleculer.services/docs/0.14/registry.html
	 */
	registry: {
		/**
		 * Define balancing strategy.
		 * Available values: "RoundRobin", "Random", "CpuUsage", "Latency", "Shard"
		 * 
		 * More info: https://moleculer.services/docs/0.14/balancing.html
		 */
		strategy: "Latency",

		/**
		 * Enable local action call preferring. Always call the local action instance if available.
		 */
		preferLocal: true
	},
	
	/**
	 * Settings of Circuit Breaker.
	 * 
	 * More info: https://moleculer.services/docs/0.14/fault-tolerance.html#Circuit-Breaker
	 */
	circuitBreaker: {
		/**
		 * Enable feature
		 */
		enabled: false,

		/**
		 * Threshold value.
		 * 0.5 means that 50% should be failed for tripping.
		 */
		threshold: 0.5,
		
		/**
		 * Minimum request count.
		 * Below it, CB does not trip.
		 */
		minRequestCount: 20,

		/**
		 * Number of seconds for time window.
		 */
		windowTime: 60,
		
		/**
		 * Number of milliseconds to switch from open to half-open state
		 */
		halfOpenTime: 10 * 1000,
		
		/**
		 * A function to check failed requests.
		 * @param {*} err 
		 */
		check: err => err && err.code >= 500
	},
	
	/**
	 * Settings of bulkhead feature.
	 * 
	 * More info: https://moleculer.services/docs/0.14/fault-tolerance.html#Bulkhead
	 */
	bulkhead: {
		/**
		 * Enable feature.
		 */
		enabled: false,

		/**
		 * Maximum concurrent executions.
		 */
		concurrency: 10,
		
		/**
		 * Maximum size of queue
		 */
		maxQueueSize: 100,
	},

	/**
	 * Enable action & event parameter validation.
	 * 
	 * More info: https://moleculer.services/docs/0.14/validating.html
	 */
	validator: true,

	errorHandler: null,
	
	/**
	 * Enable/disable built-in metrics function.
	 * 
	 * More info: https://moleculer.services/docs/0.14/metrics.html
	 */
	metrics: {
		/**
		 * Enable feature.
		 */
		enabled: true,

		/**
		 * Available built-in reporters: "Console", "CSV", "Event", "Prometheus", "Datadog", "StatsD"
		 */
		reporter: {
			type: "Prometheus",
			options: {
				// HTTP port
				port: 3030,
				// HTTP URL path
				path: "/metrics",
				// Default labels which are appended to all metrics labels
				defaultLabels: registry => ({
					namespace: registry.broker.namespace,
					nodeID: registry.broker.nodeID
				})
			}
		}
	},

	/**
	 * Enable built-in tracing function.
	 * 
	 * More info: https://moleculer.services/docs/0.14/tracing.html
	 */
	tracing: {
		/**
		 * Enable feature.
		 */
		enabled: true,

		/**
		 * Available built-in exporters: "Console", "Datadog", "Event", "EventLegacy", "Jaeger", "Zipkin"
		 */
		exporter:  [
			{
				type: "Jaeger",
				options: {
					// HTTP Reporter endpoint. If set, HTTP Reporter will be used.
					endpoint: null,
					// UDP Sender host option.
					host: process.env.JAEGER_HOST || "172.17.0.1",
					// UDP Sender port option.
					port: process.env.JAEGER_PORT || 6832,
					// Jaeger Sampler configuration.
					sampler: {
						// Sampler type. More info: https://www.jaegertracing.io/docs/1.14/sampling/#client-sampling-configuration
						type: "Const",
						// Sampler specific options.
						options: {}
					},
					// Additional options for `Jaeger.Tracer`
					tracerOptions: {},
					// Default tags. They will be added into all span tags.
					defaultTags: null
				}
			}
		],
		tags: {
			action: {
				// Never add params
				params: true,
				// Add `loggedIn.username` value from `ctx.meta`
				meta: true,
				// Always add the response
				response: true,
			}
		},
		events: true,
		stackTrace: true
	},

	/**
	 * Register custom middlewares
	 */
	middlewares: [],
	
	/**
	 * Register custom REPL commands.
	 */
	replCommands: null,
	
	/**
	 * Register internal services at start.
	 * Default: true
	 * 
	 * More info: https://moleculer.services/docs/0.14/configuration.html#Broker-options
	 */
	internalServices: true,

	/**
	 * Called after broker created.
	 * 
	 * More info: https://moleculer.services/docs/0.14/lifecycle.html#created-event-handler
	 * @param {*} broker 
	 */
	created(broker) {
		const consoleTraceExporter = {
			type: "Console", // Console exporter is only for development!
			enabled: false,
			options: {
				// Custom logger
				logger: null,
				// Using colors
				colors: true,
				// Width of row
				width: 100,
				// Gauge width in the row
				gaugeWidth: 40
			}
		};
		if (process.env.NODE_ENV == "development") {
			// Not working
			this.tracing.exporter.push(consoleTraceExporter);
		}
	},

	/**
	 * Called after broker created.
	 * 
	 * More info: https://moleculer.services/docs/0.14/lifecycle.html#started-event-handler
	 * @param {*} broker 
	 */
	async started(broker) {

	},

	/**
	 * Called after broker created.
	 * 
	 * More info: https://moleculer.services/docs/0.14/lifecycle.html#stopped-event-handler
	 * @param {*} broker 
	 */
	async stopped(broker) {

	}
};
