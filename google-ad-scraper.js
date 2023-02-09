const puppeteer = require('puppeteer-extra');
const randomUseragent = require('random-useragent');
const pluginStealth = require('puppeteer-extra-plugin-stealth')();
const fs = require('fs');

(async () => {
	
    //#region Constants

    const rawKeywordData = fs.readFileSync('keywords.json');
    const keywords = JSON.parse(rawKeywordData);

    const rawCityData = fs.readFileSync('cities.json');
    const cities = JSON.parse(rawCityData);

    const rawAllowList = fs.readFileSync('allowlist.json');
    const allowList = JSON.parse(rawAllowList);

    //#endregion

    //#region Helper functions    

    async function sleep(timeout) {
      return await new Promise(resolve => setTimeout(resolve, timeout));
    }
    
    async function log(msg) {
      const currentDate = '[' + new Date().toLocaleString() + ']';
      console.log(currentDate, msg);
    }

    //#endregion

    //#region Main logic

    async function runLogic(keyword, city, latitude, longitude) {
      //#region Init puppeteer

      // add stealth plugin and use defaults (all evasion techniques)
      puppeteer.use(pluginStealth);

      const browser = await puppeteer.launch(/*{ headless: false }*/);
      const page = await browser.newPage();

      //#region Captcha evasion tactics

      // TODO: Even with all these evasion tactics, google still detects the script as a bot.
      // Solve this by either using a captcha service or finding a way to evade it more accurately.
      const defaultUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.75 Safari/537.36';
      const userAgent = randomUseragent.getRandom();
      await page.setUserAgent(userAgent || defaultUserAgent);

      await page.setViewport({
        width: 1920 + Math.floor(Math.random() * 100),
        height: 3000 + Math.floor(Math.random() * 100),
        deviceScaleFactor: 1,
        hasTouch: false,
        isLandscape: false,
        isMobile: false,
      });

      await page.evaluateOnNewDocument(() => {
        // Pass webdriver check
        Object.defineProperty(navigator, 'webdriver', {
            get: () => false,
        });
      });

      await page.evaluateOnNewDocument(() => {
          // Pass chrome check
          window.chrome = {
              runtime: {},
              // etc.
          };
      });

      await page.evaluateOnNewDocument(() => {
          //Pass notifications check
          const originalQuery = window.navigator.permissions.query;
          return window.navigator.permissions.query = (parameters) => (
              parameters.name === 'notifications' ?
                  Promise.resolve({ state: Notification.permission }) :
                  originalQuery(parameters)
          );
      });

      await page.evaluateOnNewDocument(() => {
          // Overwrite the `plugins` property to use a custom getter.
          Object.defineProperty(navigator, 'plugins', {
              // This just needs to have `length > 0` for the current test,
              // but we could mock the plugins too if necessary.
              get: () => [1, 2, 3, 4, 5],
          });
      });

      await page.evaluateOnNewDocument(() => {
          // Overwrite the `languages` property to use a custom getter.
          Object.defineProperty(navigator, 'languages', {
              get: () => ['en-US', 'en'],
          });
      });

      //#endregion

      const timeout = 5000;
      const navigationTimeout = 60000;
      page.setDefaultTimeout(timeout);
      page.setDefaultNavigationTimeout(navigationTimeout);

      //#endregion

      //#region Scraping

      log('Running for Keyword: ' + keyword + ' City: ' + city)

      const query = keyword.replace(/\s+/g, '+');

      // Set geo-location data for the city
      const client = await page.target().createCDPSession();      
      await client.send('Emulation.setGeolocationOverride', {
        accuracy: 100,
        latitude: latitude,
        longitude: longitude,
      });
	  
      // Search google
      await page.goto('https://www.google.com/search?num=100&q=' + query, { waitUntil: 'domcontentloaded' });
      await sleep(250);

      // Pull the whole outerHTML of the search results
      const data = await page.evaluate(() => document.querySelector('*').outerHTML);
      
      // Regex to capture ads
      const regexp = /<span class="(?:\w{6}\s?){3}" data-dtld="\S*" role="text">(?<url>\S*)<\/span>/g;
      const matches = [...data.matchAll(regexp)];
      const result = matches.map(m => m.groups.url)
      
      await browser.close();
      return result;

      //#endregion
    }

    //#endregion

    // #region Send results
    
    async function sendResults(results){
      for(const result of results){
        // There are some legit NPOs giving ads ... Do not report those.
        if (allowList.includes(result)){
          continue;
        }

        // TODO: Store/send the results properly.
        log(result);
      }
    }

    // #endregion

    //#region Main loop
    
    while (true){
      for(const city of cities) {
        for(const keyword of keywords) {
          try {
            const result = await runLogic(keyword, city.name, city.latitude, city.longitude);

            if (result.length > 0){
              log('Successfully found ads.');
              await sendResults(result);
            } else {
              log('No ads found.')
            }
          } catch (err){
            log(err)
          }

          // Check 2 times every minute to avoid google's bot detection
          await sleep(60000 / 2);
        }
      }
    }

    //#endregion
})();
