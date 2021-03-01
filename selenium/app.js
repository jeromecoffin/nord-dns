"use strict";

const {Builder, Key, By} = require("selenium-webdriver");
const firefox = require("selenium-webdriver/firefox");
let fs = require("fs");


const options = new firefox.Options();

options.setPreference("network.trr.custom_uri", "https://ndns.cf:8443/l/1Hosts");
options.setPreference("network.trr.mode", 3);
options.setPreference("network.trr.uri", "https://ndns.cf:8443/l/1Hosts");
options.setPreference("network.trr.useGET", true);


const pages = [
	"https://www.20minutes.fr/",
	"https://www.20minutes.fr/sante/2986387-20210226-coronavirus-quoi-pass-sanitaire-evoque-emmanuel-macron",
	"https://www.20minutes.fr/monde/2985915-20210225-etats-unis-procureur-manhattan-obtenu-millions-pages-declarations-impots-donald-trump",
	"https://www.nytimes.com/",
	"https://www.nytimes.com/2021/02/25/technology/clubhouse-audio-app-experience.html",
	"https://www.nytimes.com/2021/02/25/technology/net-neutrality-explained.html",
	"https://www.aljazeera.com/",
	"https://www.aljazeera.com/news/2021/2/26/unconstitutional-us-airstrikes-on-syria-draw-strong-criticism",
	"https://www.aljazeera.com/opinions/2021/2/24/a-call-for-global-vaccine-equity",
	"https://www.europe1.fr/",
	"https://www.europe1.fr/societe/face-aux-critiques-la-mairie-de-paris-retropedale-sur-un-reconfinement-total-4027854",
	"https://www.europe1.fr/politique/un-deferlement-dinsultes-un-maire-de-la-region-lyonnaise-a-nouveau-menace-4027685",
	"https://www.purepeople.com/",
	"https://www.purepeople.com/article/golden-globes-brad-pitt-renee-zellweger-joaquin-phoenix-le-palmares_a368192/1",
	"https://www.purepeople.com/article/festival-de-cannes-2020-une-petite-edition-hors-normes-programmee_a405602/1",
	"https://actu.orange.fr/",
	"https://actu.orange.fr/societe/environnement/un-morceau-d-antarctique-plus-grand-que-paris-se-fracture-et-part-a-la-derive-magic-CNT000001xpE7B.html",
	"https://actu.orange.fr/societe/environnement/lancement-en-inde-d-amazonie-1-le-premier-satellite-100-bresilien-CNT000001xrNjf.html"
];

(async function myFunction() {
	let driver = await new Builder()
		.forBrowser("firefox")
		.setFirefoxOptions(options)
		.usingServer("http://172.17.0.1:4444/wd/hub")
		.build();

	for (let index = 0; index < pages.length; index++) {
		const pageUri = pages[index];
		console.log(`Loading page ${pageUri}...`);
		await driver.get(pageUri);
		await driver.actions().sendKeys(Key.END).perform();
		let body = await driver.findElement(By.css("body"));
		let encodedString = await body.takeScreenshot();
		let now = (new Date()).toISOString().replace("T", " ").replace(/:/g,"-").split(".")[0];
		await fs.writeFileSync(`screenshots/${now}_${index}.png`, encodedString, "base64");
	}

	await driver.quit();
})();