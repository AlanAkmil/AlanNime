const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

/*
 * Dependencies: npm install axios cheerio
 *
 * File ini sudah jadi Vercel Serverless Function siap pakai.
 * Taruh persis di: /api/nimegami.js
 * Otomatis bisa diakses lewat: https://domain-lu.vercel.app/api/nimegami?cmd=home
 * Gak perlu nambahin route apapun lagi — module.exports di bawah sudah jadi handler-nya.
 */

const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7; rv:133.0) Gecko/20100101 Firefox/133.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.104 Mobile Safari/537.36'
];

const BASE_URL = 'https://nimegami.id';
let uaIndex = 0;

function getHeaders(referer) {
  const ua = userAgents[uaIndex % userAgents.length];
  uaIndex++;
  return {
    'User-Agent': ua,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': referer || BASE_URL + '/',
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

async function fetchWithRetry(url, retries = 5, referer = null) {
  const headers = getHeaders(referer || url);
  const config = {
    url,
    method: 'GET',
    headers,
    timeout: 30000,
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    maxRedirects: 5,
    decompress: true,
    validateStatus: status => status >= 200 && status < 400
  };
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios(config);
      return response;
    } catch (err) {
      if (err.response && err.response.status >= 300 && err.response.status < 400) {
        return err.response;
      }
      lastError = err;
      if (err.response && err.response.status === 403) {
        await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));
        continue;
      }
      if (i < retries - 1) await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastError || new Error('Fetch failed after retries');
}

function b64decode(str) {
  try { return Buffer.from(str, 'base64').toString('utf8'); } catch (_) { return null; }
}

function normalizeUrl(url) {
  if (!url) return null;
  return url.replace(/([^:]\/)\/+/g, '$1');
}

function extractStatusFromTitle(title) {
  if (!title) return null;
  if (title.includes('(End)') || title.includes('Complete')) return 'Complete';
  if (title.includes('(On-Going)') || title.includes('On-Going')) return 'On-Going';
  return null;
}

function clean(obj) {
  if (obj === null || obj === undefined) return undefined;
  if (Array.isArray(obj)) {
    const cleaned = obj.map(i => clean(i)).filter(i => i !== undefined);
    return cleaned.length ? cleaned : undefined;
  }
  if (typeof obj === 'object') {
    const result = {};
    for (const key of Object.keys(obj)) {
      const val = clean(obj[key]);
      if (val !== undefined) result[key] = val;
    }
    return Object.keys(result).length ? result : undefined;
  }
  return obj;
}

class NimegamiScraper {
  constructor() {
    this.creator = 'rynaqrtz';
    this.baseUrl = BASE_URL;
  }

  async detail(slug) {
    const url = slug.startsWith('http') ? slug : this.baseUrl + '/' + slug.replace(/^\/+/, '');
    const html = (await fetchWithRetry(url)).data;
    const $ = cheerio.load(html);

    const info = {};
    $('div.info2 table tr').each((i, tr) => {
      const $tr = $(tr);
      let label = $tr.find('td.tablex').text().replace(':', '').trim();
      const value = $tr.find('td:last-child').text().trim();
      if (label && value) info[label] = value;
    });

    const getInfo = (key) => {
      const found = Object.keys(info).find(k => k.toLowerCase() === key.toLowerCase());
      return found ? info[found] : null;
    };

    const title = $('h1.title').text().trim() || $('meta[property="og:title"]').attr('content') || '';
    const poster = $('div.thumbnail img').attr('src') || null;
    const cover = $('div.coverthumbnail img').attr('src') || null;
    const synopsis = $('div.content[itemprop="text"] p').first().text().trim() || null;

    const rating = getInfo('Rating') ? parseFloat(getInfo('Rating').split(' ')[0]) : null;
    const studio = getInfo('Studio') || null;
    const categories = getInfo('Kategori') ? getInfo('Kategori').split(',').map(s => s.trim()) : [];
    const type = getInfo('Type') || null;
    const season = getInfo('Musim / Rilis') || null;
    const series = getInfo('Series') || null;
    const subtitle = getInfo('Subtitle') || null;
    const credit = getInfo('Credit') || null;
    const duration = getInfo('Durasi Per Episode') || null;

    let status = null;
    status = extractStatusFromTitle(title);
    if (!status) {
      $('div.bot-post a, div.term_tag-a a, div.terms_tag a').each((i, el) => {
        const txt = $(el).text().trim();
        if (txt === 'Complete' || txt === 'On-Going') status = txt;
      });
    }
    if (!status) {
      const schema = $('script[type="application/ld+json"]').text();
      try {
        const parsed = JSON.parse(schema);
        if (parsed && parsed.keywords && typeof parsed.keywords === 'string') {
          if (parsed.keywords.includes('Complete')) status = 'Complete'
          else if (parsed.keywords.includes('On-Going')) status = 'On-Going';
        }
      } catch (_) {}
    }

    return clean({
      creator: this.creator,
      page: 'detail',
      data: { url, slug, title, poster, cover, synopsis, rating, studio, categories, type, status, season, series, subtitle, credit, duration, info }
    });
  }

  async episode(slug, episodeNum = null) {
    const url = slug.startsWith('http') ? slug : this.baseUrl + '/' + slug.replace(/^\/+/, '');
    const html = (await fetchWithRetry(url)).data;
    const $ = cheerio.load(html);

    const title = $('h1.title').text().trim() || $('meta[property="og:title"]').attr('content') || '';

    const streaming = [];
    $('li.select-eps').each((i, el) => {
      const $el = $(el);
      const dataAttr = $el.attr('data');
      const id = $el.attr('id') || '';
      const epTitle = $el.attr('title') || $el.text().trim();
      let episode = null;
      const match = id.match(/play_eps_(\d+)/);
      if (match) episode = parseInt(match[1], 10);
      if (!dataAttr) return;
      const decoded = b64decode(dataAttr);
      if (!decoded) return;
      try {
        const parsed = JSON.parse(decoded);
        const formats = {};
        parsed.forEach(item => {
          if (item.format && item.url && item.url.length > 0) {
            formats[item.format] = normalizeUrl(item.url[0]);
          }
        });
        streaming.push({ episode, title: epTitle, formats });
      } catch (_) {}
    });

    const downloads = [];
    $('div.download_box h4').each((i, el) => {
      const $h4 = $(el);
      const dTitle = $h4.text().trim();
      let episode = null;
      const match = dTitle.match(/Episode\s+(\d+)/i);
      if (match) episode = parseInt(match[1], 10);
      const $ul = $h4.next('ul');
      if (!$ul.length) return;
      const resolutions = {};
      $ul.find('li').each((j, li) => {
        const $li = $(li);
        const strong = $li.find('strong');
        if (!strong.length) return;
        const res = strong.text().trim();
        const links = {};
        $li.find('a').each((k, a) => {
          const $a = $(a);
          const href = $a.attr('href');
          const text = $a.text().trim().toLowerCase();
          if (text.includes('berkasdrive')) links.berkasdrive = normalizeUrl(href);
          else if (text.includes('krakenfiles')) links.krakenfiles = normalizeUrl(href);
          else if (text.includes('mitedrive')) links.mitedrive = normalizeUrl(href);
          else if (text.includes('usersdrive')) links.usersdrive = normalizeUrl(href);
          else if (text.includes('terabox')) links.terabox = normalizeUrl(href);
          else if (text.includes('mega4upload')) links.mega4upload = normalizeUrl(href);
          else links[text] = normalizeUrl(href);
        });
        if (Object.keys(links).length) resolutions[res] = links;
      });
      if (Object.keys(resolutions).length) {
        downloads.push({ episode, title: dTitle, resolutions });
      }
    });

    let result = { url, slug, title, streaming, downloads };

    if (episodeNum !== null) {
      const num = parseInt(episodeNum);
      result.streaming = result.streaming.filter(e => e.episode === num);
      result.downloads = result.downloads.filter(e => e.episode === num);
    }

    return clean({ creator: this.creator, page: 'episode', data: result });
  }

  async list(url) {
    const html = (await fetchWithRetry(url)).data;
    const $ = cheerio.load(html);
    const items = [];
    $('article').each((i, el) => {
      const $el = $(el);
      const linkEl = $el.find('h2 a, h3 a').first();
      const title = linkEl.text().trim();
      const link = linkEl.attr('href');
      if (!title || !link) return;

      const poster = $el.find('div.thumb img, div.thumbnail img').first().attr('src') || null;

      let rating = null;
      const ratingText = $el.find('div.rating, div.rating-archive').text().trim();
      if (ratingText) {
        const match = ratingText.match(/([\d.]+)/);
        if (match) rating = parseFloat(match[1]);
      }

      let episode = null;
      const epsText = $el.find('div.eps-archive, div.eps_ongo').text().trim();
      if (epsText) {
        const match = epsText.match(/(\d+)/);
        if (match) episode = parseInt(match[1], 10);
      }
      if (!episode) {
        const epLi = $el.find('ul li:contains("Episode:")');
        if (epLi.length) {
          const epVal = epLi.text().replace('Episode:', '').trim();
          const match = epVal.match(/(\d+)/);
          if (match) episode = parseInt(match[1], 10);
        }
      }

      let status = null;
      $el.find('div.bot-post a, div.term_tag-a a, div.terms_tag a').each((j, a) => {
        const txt = $(a).text().trim();
        if (txt === 'Complete' || txt === 'On-Going') status = txt;
      });
      if (!status) status = extractStatusFromTitle(title);
      if (!status) {
        const epLi = $el.find('ul li:contains("Status:")');
        if (epLi.length) {
          const s = epLi.text().replace('Status:', '').trim();
          if (s === 'Complete' || s === 'On-Going') status = s;
        }
      }
      if (!status) {
        if (title.toLowerCase().includes('(end)')) status = 'Complete';
        else if (title.toLowerCase().includes('(on-going)')) status = 'On-Going';
      }

      let type = null;
      $el.find('div.bot-post a[title], div.terms_tag a').each((j, a) => {
        const txt = $(a).text().trim();
        if (['TV', 'Movie', 'OVA', 'ONA', 'Special', 'TV Special'].includes(txt)) type = txt;
      });
      if (!type) {
        const typeLi = $el.find('ul li:contains("Type:")');
        if (typeLi.length) type = typeLi.text().replace('Type:', '').trim();
      }

      items.push({ title, link: link.startsWith('http') ? link : this.baseUrl + link, poster, rating, episode, status, type });
    });

    let next = null;
    const nextEl = $('ul.pagination li a.next.page-numbers');
    if (nextEl.length) next = nextEl.attr('href');
    return clean({
      creator: this.creator,
      page: 'list',
      data: { url, count: items.length, items, next: next ? (next.startsWith('http') ? next : this.baseUrl + next) : null }
    });
  }

  async genre(url = this.baseUrl + '/genre-category-list/') {
    const html = (await fetchWithRetry(url)).data;
    const $ = cheerio.load(html);
    const genres = [];
    $('.terms_all a').each((i, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr('href');
      const match = text.match(/^(.*?)\s*\((\d+)\)$/);
      if (match) {
        genres.push({ name: match[1], count: parseInt(match[2], 10), url: href.startsWith('http') ? href : this.baseUrl + href });
      }
    });
    return clean({ creator: this.creator, page: 'genre', data: { url, count: genres.length, genres } });
  }

  async ongoing(url = this.baseUrl + '/anime-terbaru-sub-indo/') {
    const html = (await fetchWithRetry(url)).data;
    const $ = cheerio.load(html);
    const days = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'];
    const result = {};
    days.forEach(day => {
      const items = [];
      $(`#${day} .wrapper-3-a article`).each((i, el) => {
        const $el = $(el);
        const title = $el.find('h3 a').text().trim();
        const link = $el.find('h3 a').attr('href');
        const episode = $el.find('.eps_ongo').text().trim();
        const status = $el.find('.ongoing_updated').text().trim();
        const genre = $el.find('.live-action-live a').text().trim();
        if (title && link) {
          items.push({ title, link: link.startsWith('http') ? link : this.baseUrl + link, episode, status, genre });
        }
      });
      if (items.length) result[day] = items;
    });
    return clean({ creator: this.creator, page: 'ongoing', data: { url, schedule: result } });
  }

  async home(page = 1) {
    const url = page === 1 ? this.baseUrl + '/' : this.baseUrl + `/page/${page}/`;
    return this.list(url);
  }

  async search(query, page = 1) {
    const url = page === 1
      ? this.baseUrl + `/?s=${encodeURIComponent(query)}&post_type=post`
      : this.baseUrl + `/page/${page}/?s=${encodeURIComponent(query)}&post_type=post`;
    return this.list(url);
  }

  async category(slug, page = 1) {
    const url = page === 1 ? this.baseUrl + `/category/${slug}/` : this.baseUrl + `/category/${slug}/page/${page}/`;
    return this.list(url);
  }

  async tag(slug, page = 1) {
    const url = page === 1 ? this.baseUrl + `/tag/${slug}/` : this.baseUrl + `/tag/${slug}/page/${page}/`;
    return this.list(url);
  }
}

// ── VERCEL SERVERLESS HANDLER ───────────────────────────────────────────────
// File ini ada di /api/nimegami.js, jadi otomatis jadi endpoint /api/nimegami
module.exports = async (req, res) => {
  const ng = new NimegamiScraper();
  const { cmd, slug, query, ep, genre, tag, category, page = 1 } = req.query;
  try {
    let result;
    if (cmd === 'home')         result = await ng.home(parseInt(page) || 1);
    else if (cmd === 'search')  result = await ng.search(query, parseInt(page) || 1);
    else if (cmd === 'category')result = await ng.category(category, parseInt(page) || 1);
    else if (cmd === 'tag')     result = await ng.tag(tag, parseInt(page) || 1);
    else if (cmd === 'genre')   result = await ng.genre();
    else if (cmd === 'ongoing') result = await ng.ongoing();
    else if (cmd === 'detail')  result = await ng.detail(slug);
    else if (cmd === 'episode') result = await ng.episode(slug, ep ? parseInt(ep) : null);
    else return res.status(400).json({ error: 'Unknown cmd: ' + cmd });
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
