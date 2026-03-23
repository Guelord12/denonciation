const axios = require('axios');
const cheerio = require('cheerio');

class NewsScraper {
    constructor() {
        this.sources = {
            'mediacongo.net': { url: 'https://www.mediacongo.net/actualite/', selector: 'article', titleSelector: 'h2, h3, .title' },
            'radiookapi.cd': { url: 'https://www.radiookapi.net/', selector: '.view-content .views-row', titleSelector: 'h2 a, .title a' }
        };
    }

    async scrapeAll() {
        const results = {};
        for (const [name, config] of Object.entries(this.sources)) {
            results[name] = await this.scrape(config);
        }
        return results;
    }

    async scrape(config) {
        try {
            const { data } = await axios.get(config.url, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } });
            const $ = cheerio.load(data);
            const articles = [];
            $(config.selector).each((i, elem) => {
                if (i >= 10) return false;
                const titleElement = $(elem).find(config.titleSelector);
                const title = titleElement.text().trim();
                let link = titleElement.attr('href');
                if (title && link) {
                    if (!link.startsWith('http')) {
                        const baseUrl = config.url.match(/https?:\/\/[^\/]+/)[0];
                        link = baseUrl + (link.startsWith('/') ? link : '/' + link);
                    }
                    articles.push({ title, link });
                }
            });
            return articles;
        } catch (err) {
            console.error(`Erreur scraping ${config.url}:`, err.message);
            return [];
        }
    }
}

module.exports = new NewsScraper();