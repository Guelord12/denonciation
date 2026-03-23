const axios = require('axios');
const cheerio = require('cheerio');

const NEWS_API_KEY = '151366b0e294440ab5502684bd8bd8a2';

class NewsController {
    constructor() {
        this.scrapingSources = {
            'mediacongo.net': { url: 'https://www.mediacongo.net/actualite/', selector: 'article', titleSelector: 'h2, h3, .title', imageSelector: 'img', region: 'RDC' },
            'radiookapi.cd': { url: 'https://www.radiookapi.net/', selector: '.view-content .views-row', titleSelector: 'h2 a, .title a', imageSelector: 'img', region: 'RDC' },
            'actualites.cd': { url: 'https://actualites.cd/', selector: 'article', titleSelector: 'h2 a, .entry-title a', imageSelector: 'img', region: 'RDC' },
            'emplois.cd': { url: 'https://emplois.cd/actualites/', selector: 'article', titleSelector: 'h2 a, .entry-title a', imageSelector: 'img', region: 'RDC' },
            'sodeico.com': { url: 'https://sodeico.com/', selector: 'article', titleSelector: 'h2 a, .post-title a', imageSelector: 'img', region: 'RDC' },
            'AfrikInterim.com': { url: 'https://www.afrikinterim.com/actualites/', selector: 'article', titleSelector: 'h2 a, .title a', imageSelector: 'img', region: 'Afrique' },
            'bensizwe.com': { url: 'https://bensizwe.com/', selector: 'article', titleSelector: 'h2 a, .entry-title a', imageSelector: 'img', region: 'Afrique' },
            'CNN': { url: 'https://edition.cnn.com/', selector: '.container__headline, .card__headline', titleSelector: 'a', imageSelector: 'img', region: 'MONDE' },
            'france24': { url: 'https://www.france24.com/fr/', selector: '.article__title', titleSelector: 'a', imageSelector: 'img', region: 'MONDE' },
            'TV5Monde': { url: 'https://information.tv5monde.com/', selector: '.card-title', titleSelector: 'a', imageSelector: 'img', region: 'MONDE' }
        };
    }

    async scrapeSource(sourceName, sourceConfig) {
        try {
            const { data } = await axios.get(sourceConfig.url, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } });
            const $ = cheerio.load(data);
            const articles = [];
            $(sourceConfig.selector).each((i, elem) => {
                if (i >= 5) return false;
                const titleElement = $(elem).find(sourceConfig.titleSelector);
                const title = titleElement.text().trim();
                let link = titleElement.attr('href');
                const imageElement = $(elem).find(sourceConfig.imageSelector).first();
                let image = imageElement.attr('src');
                if (image && !image.startsWith('http')) {
                    const baseUrl = sourceConfig.url.match(/https?:\/\/[^\/]+/)[0];
                    image = baseUrl + (image.startsWith('/') ? image : '/' + image);
                }
                if (title && link) {
                    if (!link.startsWith('http')) {
                        const baseUrl = sourceConfig.url.match(/https?:\/\/[^\/]+/)[0];
                        link = baseUrl + (link.startsWith('/') ? link : '/' + link);
                    }
                    articles.push({ title, link, image: image || null, source: sourceName, region: sourceConfig.region });
                }
            });
            return articles;
        } catch (err) {
            console.error(`Erreur scraping ${sourceName}:`, err.message);
            return [];
        }
    }

    async getNews(req, res) {
        try {
            const { region = 'RDC', limit = 20 } = req.query;
            const allArticles = [];
            for (const [name, config] of Object.entries(this.scrapingSources)) {
                if (region === config.region) {
                    const articles = await this.scrapeSource(name, config);
                    allArticles.push(...articles);
                }
                if (allArticles.length >= limit) break;
            }
            const shuffled = allArticles.sort(() => 0.5 - Math.random());
            res.json(shuffled.slice(0, parseInt(limit)));
        } catch (err) {
            console.error('Erreur récupération actualités:', err);
            res.status(500).json({ error: 'Erreur lors de la récupération des actualités' });
        }
    }

    async getNewsByCategory(req, res) {
        return this.getNews(req, res);
    }
}

module.exports = new NewsController();