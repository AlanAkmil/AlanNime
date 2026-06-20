const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const fs = require('fs');

const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7; rv:133.0) Gecko/20100101 Firefox/133.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0',
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:129.0) Gecko/20100101 Firefox/129.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPad; CPU OS 17_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.104 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 14; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.104 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.104 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 13; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.107 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.107 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 12; SM-G980F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.6668.102 Mobile Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7; rv:127.0) Gecko/20100101 Firefox/127.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPad; CPU OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.107 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.107 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 13; SM-G990B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.6668.102 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 13; SM-G781B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.6668.102 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.144 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.144 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 11; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.6533.108 Mobile Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 OPR/109.0.0.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 OPR/108.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 OPR/109.0.0.0'
];

class NeonimeScraper {
  constructor(options = {}) {
    this.baseUrl = 'https://otakupoi.org';
    this.proxy = options.proxy || null;
    this.timeout = options.timeout || 25000;
    this.uaList = userAgents;
    this._uaIndex = 0;
    this._lastUrl = '';
    this.creator = 'rynaqrtz';
  }

  _randomDelay() {
    const min = 400;
    const max = 1500;
    return new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min + 1)) + min));
  }

  _getHeaders() {
    const ua = this.uaList[this._uaIndex % this.uaList.length];
    this._uaIndex++;
    return {
      'User-Agent': ua,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': this.baseUrl + '/neonime/',
      'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="131", "Chromium";v="131"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Connection': 'keep-alive',
      'Cache-Control': 'max-age=0'
    };
  }

  async _fetch(url, retries = 5) {
    const headers = this._getHeaders();
    const config = {
      url,
      method: 'GET',
      headers,
      timeout: this.timeout,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      maxRedirects: 5,
      decompress: true
    };
    if (this.proxy) config.proxy = this.proxy;
    let lastError;
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios(config);
        return response.data;
      } catch (err) {
        lastError = err;
        if (err.response && err.response.status === 403) {
          await this._randomDelay();
          continue;
        }
        if (i < retries - 1) await this._randomDelay();
      }
    }
    throw lastError || new Error('Fetch failed after retries');
  }

  _clean(obj) {
    if (obj === null || obj === undefined) return undefined;
    if (Array.isArray(obj)) {
      const cleaned = obj.map(item => this._clean(item)).filter(item => item !== undefined);
      return cleaned.length ? cleaned : undefined;
    }
    if (typeof obj === 'object') {
      const result = {};
      for (const key of Object.keys(obj)) {
        const val = this._clean(obj[key]);
        if (val !== undefined) result[key] = val;
      }
      return Object.keys(result).length ? result : undefined;
    }
    return obj;
  }

  _parseListPage(html) {
    const $ = cheerio.load(html);
    const items = [];
    $('div.bg-white.shadow.xrelated.relative').each((i, el) => {
      const $el = $(el);
      const link = $el.find('a').attr('href');
      const img = $el.find('img').attr('src');
      const title = $el.find('div.titlelist').text().trim();
      const eps = $el.find('div.eplist').text().trim();
      const score = $el.find('div.starlist').text().replace('★', '').trim();
      if (title && link) {
        items.push({
          title,
          link: link.startsWith('http') ? link : this.baseUrl + link,
          img: img || null,
          eps,
          score
        });
      }
    });
    return items;
  }

  _parsePagination($) {
    const pagination = { current: 1, next: null, total: null, hasNext: false };
    const links = [];
    $('.pagination a, .pagination span').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (href) links.push({ text, href });
    });
    const nextLink = links.find(l => l.text === '»' || l.text.toLowerCase().includes('next'));
    if (nextLink) {
      pagination.next = nextLink.href.startsWith('http') ? nextLink.href : this.baseUrl + nextLink.href;
      pagination.hasNext = true;
    }
    const numbers = links.filter(l => /^\d+$/.test(l.text));
    if (numbers.length) {
      const max = Math.max(...numbers.map(l => parseInt(l.text)));
      pagination.total = max;
    }
    const url = this._lastUrl || '';
    let pageMatch = url.match(/\/page\/(\d+)/);
    if (pageMatch) pagination.current = parseInt(pageMatch[1]);
    return pagination;
  }

  async home(page = 1) {
    const url = page === 1 ? this.baseUrl + '/neonime/' : this.baseUrl + `/neonime/page/${page}/`;
    this._lastUrl = url;
    const html = await this._fetch(url);
    const $ = cheerio.load(html);
    const items = this._parseListPage(html);
    const pagination = this._parsePagination($);
    return this._clean({ creator: this.creator, page: 'home', url, pagination, items });
  }

  async ongoing(page = 1) {
    const url = page === 1 ? this.baseUrl + '/neonime/ongoing/' : this.baseUrl + `/neonime/ongoing/page/${page}/`;
    this._lastUrl = url;
    const html = await this._fetch(url);
    const $ = cheerio.load(html);
    const items = this._parseListPage(html);
    const pagination = this._parsePagination($);
    return this._clean({ creator: this.creator, page: 'ongoing', url, pagination, items });
  }

  async batchs(page = 1) {
    const url = page === 1 ? this.baseUrl + '/neonime/batchs/' : this.baseUrl + `/neonime/batchs/page/${page}/`;
    this._lastUrl = url;
    const html = await this._fetch(url);
    const items = this._parseListPage(html);
    const $ = cheerio.load(html);
    const pagination = this._parsePagination($);
    return this._clean({ creator: this.creator, page: 'batchs', url, pagination, items });
  }

  async movies(page = 1) {
    const url = page === 1 ? this.baseUrl + '/neonime/movies/' : this.baseUrl + `/neonime/movies/page/${page}/`;
    this._lastUrl = url;
    const html = await this._fetch(url);
    const items = this._parseListPage(html);
    const $ = cheerio.load(html);
    const pagination = this._parsePagination($);
    return this._clean({ creator: this.creator, page: 'movies', url, pagination, items });
  }

  async latest(page = 1) {
    const url = page === 1 ? this.baseUrl + '/neonime/latest/' : this.baseUrl + `/neonime/latest/page/${page}/`;
    this._lastUrl = url;
    const html = await this._fetch(url);
    const items = this._parseListPage(html);
    const $ = cheerio.load(html);
    const pagination = this._parsePagination($);
    return this._clean({ creator: this.creator, page: 'latest', url, pagination, items });
  }

  async search(query, page = 1) {
    const url = page === 1
      ? this.baseUrl + `/neonime/search/?q=${encodeURIComponent(query)}`
      : this.baseUrl + `/neonime/search/page/${page}/?q=${encodeURIComponent(query)}`;
    this._lastUrl = url;
    const html = await this._fetch(url);
    const items = this._parseListPage(html);
    const $ = cheerio.load(html);
    const pagination = this._parsePagination($);
    return this._clean({ creator: this.creator, page: 'search', url, query, pagination, items });
  }

  async detail(slug) {
    const url = this.baseUrl + `/neonime/${slug}/`;
    this._lastUrl = url;
    const html = await this._fetch(url);
    const $ = cheerio.load(html);

    const title = $('h1.xptitle').text().trim() || $('h1').first().text().trim();
    const score = $('.tablist b:contains("Score")').next('span').text().trim() || null;
    const synopsis = $('.boltab div[itemprop="description"]').text().trim() || null;

    const generalInfo = {};
    $('.tablist').each((i, el) => {
      const key = $(el).find('b').text().replace(':', '').trim();
      const val = $(el).find('span').text().trim();
      if (key && val) generalInfo[key] = val;
    });

    const episodes = [];
    $('.othereps').each((i, el) => {
      const href = $(el).attr('href');
      const title = $(el).text().trim();
      if (href) {
        episodes.push({
          title,
          url: href.startsWith('http') ? href : this.baseUrl + href
        });
      }
    });

    return this._clean({
      creator: this.creator,
      page: 'detail',
      url,
      slug,
      title,
      score,
      synopsis,
      generalInfo,
      episodes
    });
  }

  _decodeStreamUrl(encoded) {
    try {
      const rostr = (str, len) => {
        len = len % str.length;
        return str.substr(0 - len) + str.slice(0, -len);
      };
      const step1 = decodeURIComponent(encoded);
      const step2 = rostr(step1, 13);
      const step3 = Buffer.from(step2, 'base64').toString('binary');
      const step4 = decodeURIComponent(step3);
      const step5 = rostr(step4, 13);
      return Buffer.from(step5, 'base64').toString('utf-8');
    } catch (e) {
      return null;
    }
  }

  async episode(slug, episodeNum) {
    const url = this.baseUrl + `/watch/${slug}-${episodeNum}x${episodeNum}`;
    this._lastUrl = url;
    const html = await this._fetch(url);
    const $ = cheerio.load(html);

    const title = $('h1.title-post').text().trim();
    const date = $('.date').text().trim() || null;
    const streamUrl = $('#istream').attr('src') || null;

    const info = {};
    $('#info .tablist').each((i, el) => {
      const key = $(el).find('b').text().replace(':', '').trim();
      const val = $(el).find('span').text().trim();
      if (key && val) info[key] = val;
    });

    const synopsis = $('#info .boltab div[itemprop="description"]').text().trim() || null;

    const streamServers = {};
    const scripts = $('script').filter((i, el) => $(el).html().includes('var xs=JSON.parse'));
    if (scripts.length) {
      const scriptContent = scripts.first().html();
      const match = scriptContent.match(/var xs=JSON\.parse\('([^']+)'\);/);
      if (match) {
        try {
          const xs = JSON.parse(match[1]);
          const serverNames = {
            player21: 'GD standard',
            player22: 'YT HD',
            player23: 'GDIrit 720p',
            player24: 'Mei 1080p',
            player25: 'GDirit 1080p',
            player26: 'GD 1080p',
            player27: 'GDLimit 720p',
            player28: 'GDVix 720p',
            player29: 'GDLimit 1080p',
            player210: 'GDVix 1080p',
            player211: 'Fae 480p',
            player212: 'Fae 720p',
            player213: 'Fae 1080p',
            player214: 'Sofi 480p',
            player215: 'Sofi 720p',
            player216: 'YUI 480p',
            player217: 'YUI 720p',
            player218: 'YUI 1080p',
            player219: 'MP 480p'
          };
          for (const [id, encoded] of Object.entries(xs)) {
            const name = serverNames[id] || id;
            if (encoded && encoded.length > 0) {
              const decoded = this._decodeStreamUrl(encoded);
              streamServers[name] = decoded || '';
            } else {
              streamServers[name] = '';
            }
          }
        } catch (e) {}
      }
    }

    const downloadLinks = [];
    const container = $('#contdl');
    let currentFormat = '';
    container.children().each((i, el) => {
      const tag = el.tagName.toLowerCase();
      if (tag === 'li') {
        const text = $(el).text().trim();
        if (text === 'MP4' || text === 'MKV') {
          currentFormat = text;
        }
      } else if (tag === 'ul') {
        $(el).find('li').each((j, li) => {
          const label = $(li).find('strong').text().trim();
          const links = [];
          $(li).find('a').each((k, a) => {
            const href = $(a).attr('href');
            const name = $(a).text().trim();
            if (href) links.push({ name: name || 'link', url: href });
          });
          if (links.length && currentFormat) {
            downloadLinks.push({
              format: currentFormat,
              quality: label || 'default',
              links
            });
          }
        });
      }
    });

    let nextEpisode = null, prevEpisode = null;
    $('.othereps').each((i, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      const num = parseInt(href.match(/nekopara-(\d+)x/)?.[1]);
      if (num === episodeNum + 1) nextEpisode = href.startsWith('http') ? href : this.baseUrl + href;
      if (num === episodeNum - 1) prevEpisode = href.startsWith('http') ? href : this.baseUrl + href;
    });

    return this._clean({
      creator: this.creator,
      page: 'episode',
      url,
      slug,
      episode: episodeNum,
      title,
      date,
      streamUrl,
      info,
      synopsis,
      streamServers,
      downloadLinks,
      nextEpisode,
      prevEpisode
    });
  }

  async all() {
    const [home, ongoing, batchs, movies, latest, search, detail, episode] = await Promise.all([
      this.home(1),
      this.ongoing(1),
      this.batchs(1),
      this.movies(1),
      this.latest(1),
      this.search('nekopara', 1),
      this.detail('nekopara-subtitle-indonesia'),
      this.episode('nekopara', 1)
    ]);
    return this._clean({
      creator: this.creator,
      home, ongoing, batchs, movies, latest, search, detail, episode
    });
  }
}

// ── VERCEL SERVERLESS HANDLER ───────────────────────────────────────────────
// File ini ada di /api/neonime.js, jadi otomatis jadi endpoint /api/neonime
module.exports = async (req, res) => {
  const nn = new NeonimeScraper();
  const { cmd, slug, query, ep, page = 1 } = req.query;
  try {
    let result;
    if (cmd === 'home')         result = await nn.home(parseInt(page) || 1);
    else if (cmd === 'ongoing') result = await nn.ongoing(parseInt(page) || 1);
    else if (cmd === 'batchs')  result = await nn.batchs(parseInt(page) || 1);
    else if (cmd === 'movies')  result = await nn.movies(parseInt(page) || 1);
    else if (cmd === 'latest')  result = await nn.latest(parseInt(page) || 1);
    else if (cmd === 'search')  result = await nn.search(query, parseInt(page) || 1);
    else if (cmd === 'detail')  result = await nn.detail(slug);
    else if (cmd === 'episode') result = await nn.episode(slug, parseInt(ep));
    else return res.status(400).json({ error: 'Unknown cmd: ' + cmd });
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};