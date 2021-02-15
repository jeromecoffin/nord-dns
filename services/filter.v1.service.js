/* eslint-disable indent */
"use strict";

/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 */
module.exports = {
	name: "filter",
	version: 1,
	mixins: [],

	settings: {

	},

	actions: {

		/**
		 * load
		 * 
		 * This method is used to load a custom List to the filter service
		 * - Download the list
         * - Import the list into the cache
		 */
		load: {
			/**
			 * Disable action cache
			 */
			cache: false,

            params: {
				uri: "string",
                name: "string",
                cachePrefix: "string!optional"
			},
			
			async handler(ctx) {
				// Download the list
				const listData = await ctx.call(
					"v1.filter.download",
					{uri: ctx.params.uri, name: ctx.params.name}
				);

				// Import the list into the cache system
				return await ctx.call (
					"v1.filter.import",
					{listData: listData}
				);
			}
		},

        download: {
            /**
			 * Disable action cache
			 */
			cache: false,

            params: {
				uri: "string",
                name: "string",
			},
			
			async handler(ctx) {
                
			}
        }
	},

	events: {
		
	},

	methods: {

	},

	created() {
        // Load Default List
		// this.load();
	}
};
