/* eslint-disable indent */
"use strict";

const {Builder, Key, By} = require("selenium-webdriver");
const firefox = require("selenium-webdriver/firefox");
let fs = require("fs");


/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 */
module.exports = {

	/**
	 * Name of the module
	 * 
	 * Selenium
	 */
	name: "selenium",

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
         * checkSite
         * 
         * This methods is used to check a specific website (url)
         * passed as a parameter using the default service driver.
         * 
         * @param {String} url - url to be tested
         * 
		 * @returns {String} encodedString: base64 encoded screenshot of the page
		 * 
         */
        "checkSite": {
            
			params: {
                /**
                 * url
                 * 
                 * Url of the page that should be tested
                 * Must start with http or https and be a valid url
                 */
				url: "string",
			},

            /**
             * Disable cache
             */
            cache: false,

            /** @param {Context} ctx  */
            async handler(ctx) {
                const pageUri = ctx.params.url;
                console.log(`Loading page ${pageUri}...`);
                const driver = await new Builder()
                    .forBrowser("firefox")
                    .setFirefoxOptions(this.options)
                    .usingServer(this.server)
                    .build();

                await driver.get(pageUri);
                await driver.actions().sendKeys(Key.END).perform();
                let body = await driver.findElement(By.css("body"));
                let encodedString = await body.takeScreenshot();

                await this.driver.quit();

                // let now = (new Date()).toISOString().replace("T", " ").replace(/:/g,"-").split(".")[0];
                // await fs.writeFileSync(`screenshots/${now}_${index}.png`, encodedString, "base64");
                
                return encodedString;
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
        this.options = new firefox.Options();

        const rootDomain = process.env.APP_DOMAIN_ROOT || "ndns.cf";
        const port = process.env.APP_PORTS_HTTPS || 8443;
        const baseUrl = `https://${rootDomain}:${port}/l/1Hosts`;
        this.server = process.env.SELENIUM_SERVER_ENDPOINT || "http://172.17.0.1:4444/wd/hub";

        this.options.setPreference("network.trr.custom_uri", baseUrl);
        this.options.setPreference("network.trr.mode", 3);
        this.options.setPreference("network.trr.uri", baseUrl);

        /**
         * Force the use of GET request (vs POST)
         * 
         * This will help to cache request at the CDN level.
         */
        this.options.setPreference("network.trr.useGET", true);


        this.driver = await new Builder()
            .forBrowser("firefox")
            .setFirefoxOptions(this.options)
            .usingServer(this.server)
            .build();
        
        this.logger.info("Connected to selenium-firefox server");
        await this.driver.quit();
	},

	/**
	 * Service stopped lifecycle event handler
	 */
	async stopped() {
        
	}
};
