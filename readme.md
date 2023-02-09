# What is this?

This is a small puppeteer script that can be used to scrape google search results to find ads for keywords specified in [keywords.json](keywords.json) for each of the cities specified in the [cities.json](cities.json).

## Prerequisites

1. Download and install Node.JS LTS 16.14.2 from <https://nodejs.org/en/download/> for whatever OS you are using
2. Open command line or terminal window and run the command `npm install`

## Usage

Open command line or terminal window and navigate to the folder. Type in below code.

**Mac/Linux:**

>node .\google-ad-scraper.js

**Windows:**

>node google-ad-scraper.js

## Tips

Uncomment `{ headless: false }` on line 29 of google-ad-scraper.js to see puppeteer in action
