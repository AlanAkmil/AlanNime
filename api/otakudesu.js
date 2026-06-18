const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.104 Mobile Safari/537.36'
];

const BASE_URL = 'https://otakudesu.news';
const EP_BASE  = 'https://nontonanimex.com';

let _uaIdx = 0;

function getHeaders(referer) {
  const ua = userAgents[_uaIdx++ % userAgents.length];
  return {
    'User-Agent': ua,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': referer || BASE_URL + '/',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Upgrade-Insecure-Requests': '1',
    'Connection': 'keep-alive',
  };
}

async function fetchUrl(url, retries = 4, referer = null) {
  const config = {
    url, method: 'GET',
    headers: getHeaders(referer || url),
    timeout: 25000,
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    maxRedirects: 0,
    decompress: true,
    validateStatus: s => s >= 200 && s < 400,
  };
  let last;
  for (let i = 0; i < retries; i++) {
    try {
      return await axios(config);
    } catch (err) {
      if (err.response && err.response.status >= 300 && err.response.status < 400) return err.response;
      last = err;
      if (i < retries - 1) await new Promise(r => setTimeout(r, 800 * (i + 1)));
    }
  }
  throw last;
}

function decodeToken(token) {
  try {
    let rev = token.split('').reverse().join('');
    let out = '';
    for (let i = 0; i < rev.length; i += 2) {
      out += String.fromCharCode(parseInt(rev.substr(i, 2), 36) - (Math.floor(i / 2) % 7 + 5));
    }
    return decodeURIComponent(out);
  } catch { return null; }
}

async function resolveLStream(url) {
  try {
    const r = await fetchUrl(url, 3, url);
    if (r.status >= 300 && r.status < 400 && r.headers.location) return r.headers.location;
    const m = (r.data || '').match(/<iframe[^>]*src=["']([^"']+)["']/i);
    if (m) return m[1];
    return null;
  } catch { return null; }
}

function toEmbedUrl(raw) {
  if (!raw) return null;
  if (raw.includes('mega.nz/file/')) return raw.replace('mega.nz/file/', 'mega.nz/embed/');
  if (raw.includes('mega.nz/#!'))   return raw.replace('mega.nz/#!', 'mega.nz/embed/#!');
  const ace = raw.match(/acefile\.co\/f\/(\d+)/);
  if (ace) return 'https://acefile.co/player/' + ace[1];
  const krak = raw.match(/krakenfiles\.com\/view\/([^/]+)/);
  if (krak) return 'https://krakenfiles.com/embed-video/' + krak[1];
  return raw;
}

function parseList(html) {
  const $ = cheerio.load(html);
  const items = [];
  $('div.xrelated').each((_, el) => {
    const $el = $(el);
    const link  = $el.find('a').attr('href');
    const image = $el.find('img').attr('src');
    const title = $el.find('div.titlelist').text().trim();
    const eps   = $el.find('div.eplist').text().trim();
    const score = $el.find('div.starlist').text().replace('★','').trim();
    if (title && link) items.push({
      title, link: link.startsWith('http') ? link : BASE_URL + link,
      image: image || null, eps, score,
    });
  });
  return items;
}

function parsePagination($, currentUrl) {
  const links = [];
  $('.pagination a, .pagination span').each((_, el) => {
    const href = $(el).attr('href'), text = $(el).text().trim();
    if (href) links.push({ text, href });
  });
  const nextLink = links.find(l => l.text === '»' || l.text.toLowerCase().includes('next'));
  const numbers  = links.filter(l => /^\d+$/.test(l.text));
  const m = (currentUrl || '').match(/\/page\/(\d+)/);
  return {
    current: m ? parseInt(m[1]) : 1,
    hasNext: !!nextLink,
    next:    nextLink ? (nextLink.href.startsWith('http') ? nextLink.href : BASE_URL + nextLink.href) : null,
    total:   numbers.length ? Math.max(...numbers.map(l => parseInt(l.text))) : null,
  };
}

// ─── HANDLERS ──────────────────────────────────────────────────────────────

async function cmdHome(page) {
  const url = page <= 1 ? BASE_URL + '/' : `${BASE_URL}/page/${page}/`;
  const html = (await fetchUrl(url)).data;
  const $ = cheerio.load(html);
  return { data: parseList(html), pagination: parsePagination($, url) };
}

async function cmdTerbaru(page) {
  const url = page <= 1 ? `${BASE_URL}/terbaru/` : `${BASE_URL}/terbaru/page/${page}`;
  const html = (await fetchUrl(url)).data;
  const $ = cheerio.load(html);
  return { data: parseList(html), pagination: parsePagination($, url) };
}

async function cmdOngoing(page) {
  const url = page <= 1 ? `${BASE_URL}/ongoing` : `${BASE_URL}/ongoing/page/${page}`;
  const html = (await fetchUrl(url)).data;
  const $ = cheerio.load(html);
  return { data: parseList(html), pagination: parsePagination($, url) };
}

async function cmdComplete(page) {
  const url = page <= 1 ? `${BASE_URL}/complete` : `${BASE_URL}/complete/page/${page}`;
  const html = (await fetchUrl(url)).data;
  const $ = cheerio.load(html);
  return { data: parseList(html), pagination: parsePagination($, url) };
}

async function cmdSearch(query, page) {
  const url = page <= 1
    ? `${BASE_URL}/search/?q=${encodeURIComponent(query)}`
    : `${BASE_URL}/search/page/${page}/?q=${encodeURIComponent(query)}`;
  const html = (await fetchUrl(url)).data;
  const $ = cheerio.load(html);
  return { data: parseList(html), pagination: parsePagination($, url) };
}

async function cmdSchedule() {
  const url = `${BASE_URL}/jadwal-rilis`;
  const html = (await fetchUrl(url)).data;
  const $ = cheerio.load(html);
  const schedule = {};
  $('.jdlist div').each((_, el) => {
    const day = $(el).find('h2').text().trim();
    const items = [];
    $(el).find('ul li a').each((__, a) => {
      const title = $(a).text().trim();
      const link  = $(a).attr('href');
      if (title && link) items.push({
        title,
        link: link.startsWith('http') ? link : BASE_URL + link,
      });
    });
    if (day && items.length) schedule[day] = items;
  });
  return { schedule };
}

async function cmdDetail(slug) {
  const url = `${BASE_URL}/${slug}/`;
  const html = (await fetchUrl(url)).data;
  const $ = cheerio.load(html);

  const title = $('div.htitle h1').text().trim() || $('h1').first().text().trim();
  const score = $('div.htitle span').text().trim() || null;
  const poster = $('div.infoanime img').attr('src') || $('img.attachment-post-thumbnail').attr('src') || null;

  const info = {};
  $('ul.infol li').each((_, el) => {
    const parts = $(el).text().trim().split(':');
    if (parts.length >= 2) info[parts[0].trim()] = parts.slice(1).join(':').trim();
  });

  const synopsis = $('div.sinopc').text().trim() || null;

  const episodes = [];
  $('#ctlist li').each((_, el) => {
    const $el = $(el);
    const link = $el.find('a').attr('href');
    const epTitle = $el.find('a').text().trim();
    const date = $el.find('span').last().text().trim();
    const epNum = epTitle.match(/Episode\s+(\d+)/i)?.[1] || null;
    if (link) episodes.push({
      title: epTitle,
      url: link.startsWith('http') ? link : BASE_URL + link,
      episode: epNum ? parseInt(epNum) : null,
      releaseDate: date || null,
    });
  });

  const genres = [];
  $('ul.infol li').each((_, el) => {
    const text = $(el).text();
    if (text.toLowerCase().includes('genre')) {
      $(el).find('a').each((__, a) => genres.push($(a).text().trim()));
    }
  });

  return { title, score, poster, synopsis, info, genres, episodes, totalEpisodes: episodes.length };
}

async function cmdEpisode(slug, epNum) {
  const url = `${EP_BASE}/episode/${slug}-episode-${epNum}-sub-indo/`;
  const html = (await fetchUrl(url)).data;
  const $ = cheerio.load(html);

  const title  = $('.tlpost').text().trim() || $('h1').first().text().trim();
  const poster = $('.imgrpv').attr('src') || null;

  const embedPlayers = [];
  const downloadLinks = [];
  const promises = [];

  $('.dlist ul li').each((_, el) => {
    const $li = $(el);
    const quality = $li.find('strong').text().trim();
    if (!quality) return;
    const embedServers = [], dlServers = [];

    $li.find('a').each((__, aEl) => {
      const srvName = $(aEl).text().trim();
      const href = $(aEl).attr('href') || '';
      const token = href.split('/go/')[1];
      if (!token) return;
      const realUrl = decodeToken(token);
      if (!realUrl) return;
      const isEmbed = ['acefile','mega','kfiles'].includes(srvName.toLowerCase());
      if (isEmbed) embedServers.push({ server: srvName, raw: realUrl });
      else         dlServers.push({ server: srvName, url: realUrl });
    });

    if (embedServers.length) {
      promises.push(
        Promise.all(embedServers.map(async s => {
          let final = s.raw;
          if (s.raw.includes('desustream')) {
            const res = await resolveLStream(s.raw);
            if (res) final = res;
          }
          return { server: s.server, embedUrl: toEmbedUrl(final) || final };
        })).then(resolved => {
          embedPlayers.push({ quality, servers: resolved.filter(s => s.embedUrl) });
        })
      );
    }
    if (dlServers.length) downloadLinks.push({ quality, servers: dlServers });
  });

  await Promise.all(promises);

  let next = null, prev = null;
  $('.othereps').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const n = parseInt(href.match(/episode-(\d+)-/)?.[1]);
    if (n === epNum + 1) next = href.startsWith('http') ? href : EP_BASE + href;
    if (n === epNum - 1) prev = href.startsWith('http') ? href : EP_BASE + href;
  });

  // Ambil embed pertama yang tersedia sebagai default player
  const defaultEmbed = embedPlayers[0]?.servers[0]?.embedUrl || null;

  return { title, poster, episode: epNum, embedPlayers, downloadLinks, defaultEmbed, nextEpisode: next, prevEpisode: prev };
}

// ─── VERCEL HANDLER ────────────────────────────────────────────────────────

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { cmd, slug, query, page = '1', epnum = '1' } = req.query;
  const p = Math.max(1, parseInt(page) || 1);

  try {
    let result;
    switch (cmd) {
      case 'home':      result = await cmdHome(p);              break;
      case 'terbaru':   result = await cmdTerbaru(p);           break;
      case 'ongoing':   result = await cmdOngoing(p);           break;
      case 'completed': result = await cmdComplete(p);          break;
      case 'search':
        if (!query) return res.status(400).json({ error: 'query required' });
        result = await cmdSearch(query, p);
        break;
      case 'schedule':  result = await cmdSchedule();           break;
      case 'detail':
        if (!slug) return res.status(400).json({ error: 'slug required' });
        result = await cmdDetail(slug);
        break;
      case 'episode':
        if (!slug) return res.status(400).json({ error: 'slug required' });
        result = await cmdEpisode(slug, parseInt(epnum) || 1);
        break;
      default:
        return res.status(400).json({ error: `Unknown cmd: ${cmd}` });
    }
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    console.error('[otakudesu]', err.message);
    return res.status(500).json({ error: err.message });
  }
};
