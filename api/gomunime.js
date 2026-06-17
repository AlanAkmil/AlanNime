/**
 * Gomunime Proxy — Vercel Serverless
 * Source: gomunime.top
 * Commands: home | search | ongoing | completed | genre | detail | watch
 */

const axios = require("axios");
const cheerio = require("cheerio");

const BASE = "https://gomunime.top";
const MAX_RETRIES = 3;
const BASE_DELAY = 800;

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Android 14; Mobile; rv:133.0) Gecko/133.0 Firefox/133.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/129.0.0.0",
];

const sleep = ms => new Promise(r => setTimeout(r, ms));
const randomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
const randomDelay = (min=200, max=800) => Math.floor(Math.random()*(max-min+1))+min;

function getHeaders() {
  return {
    "User-Agent": randomUA(),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Cache-Control": "max-age=0",
    "Referer": "https://gomunime.top/",
  };
}

async function fetchHTML(url) {
  let lastError;
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const res = await axios.get(url, {
        headers: getHeaders(),
        timeout: 15000,
      });
      if (res.status === 403 || res.status === 503) throw new Error(`Blocked (${res.status})`);
      return cheerio.load(res.data);
    } catch (e) {
      lastError = e;
      await sleep(BASE_DELAY * Math.pow(2, i) + randomDelay(0, 300));
    }
  }
  throw new Error(`Failed after ${MAX_RETRIES} retries: ${lastError?.message}`);
}

function cleanUrl(url) {
  if (!url) return null;
  url = url.trim().replace(/,$/, "");
  if (url.startsWith("//")) return "https:" + url;
  if (url.startsWith("/")) return BASE + url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return null;
}

function extractAnimeList($) {
  const items = [];
  const seen = new Set();
  $("img[src*='poster'], img[data-src*='poster'], img[src*='banner'], img[data-src*='banner']").each((_, el) => {
    const img = $(el);
    const src = img.attr("src") || img.attr("data-src");
    if (!src) return;
    const poster = cleanUrl(src);
    if (!poster) return;
    let linkEl = img.closest("a");
    if (!linkEl.length) linkEl = img.parent().find("a").first();
    if (!linkEl.length) return;
    const href = linkEl.attr("href");
    if (!href || href === "/" || href.length < 3) return;
    if (/7METER|banner|search|genre|status|type|koleksi|#/i.test(href)) return;
    if (/\.(jpg|png|gif|webp|css|js)$/i.test(href)) return;
    const link = cleanUrl(href);
    if (!link || seen.has(link)) return;
    seen.add(link);
    let title = img.attr("alt") || linkEl.text().trim() || href.split("/").pop().replace(/-/g," ");
    if (/7meter|banner/i.test(title)) return;
    items.push({ title: title.trim().substring(0,100), link, poster });
  });
  return items;
}

async function home() {
  const $ = await fetchHTML(BASE);
  const items = extractAnimeList($);
  return { creator:"rynaqrtz", data: items };
}

async function search(query) {
  const $ = await fetchHTML(`${BASE}/search?q=${encodeURIComponent(query)}`);
  return { creator:"rynaqrtz", data: extractAnimeList($) };
}

async function ongoing(page=1) {
  const url = page<=1 ? `${BASE}/status/ongoing` : `${BASE}/status/ongoing?page=${page}`;
  const $ = await fetchHTML(url);
  return { creator:"rynaqrtz", page, data: extractAnimeList($) };
}

async function completed(page=1) {
  const url = page<=1 ? `${BASE}/status/completed` : `${BASE}/status/completed?page=${page}`;
  const $ = await fetchHTML(url);
  return { creator:"rynaqrtz", page, data: extractAnimeList($) };
}

async function genre(slug, page=1) {
  const url = page<=1 ? `${BASE}/genre/${slug}` : `${BASE}/genre/${slug}?page=${page}`;
  const $ = await fetchHTML(url);
  return { creator:"rynaqrtz", genre:slug, page, data: extractAnimeList($) };
}

async function detail(slug) {
  const url = `${BASE}/${slug}`;
  const $ = await fetchHTML(url);
  let title = $("meta[property='og:title']").attr("content") || $("title").text().trim();
  title = title.replace(/\s*\|\s*Gomunime$/i,"").trim();
  const poster = cleanUrl($("meta[property='og:image']").attr("content"));
  const description = $("meta[property='og:description']").attr("content") || $("meta[name='description']").attr("content") || "";
  const rating = description.match(/rating\s*([\d.]+)/i)?.[1] || null;
  const status = description.match(/status\s*(\w+)/i)?.[1] || null;
  const episodesCount = description.match(/(\d+)\s*episode/i)?.[1] || null;

  // Episode list
  const epSet = new Set();
  $("a[href*='episode-']").each((_, el) => {
    const href = $(el).attr("href");
    if (href?.includes("episode-")) {
      const full = cleanUrl(href);
      if (full) epSet.add(full);
    }
  });
  const episodes = Array.from(epSet).sort((a,b)=>{
    const na = parseInt(a.match(/episode-(\d+)/)?.[1]||"0");
    const nb = parseInt(b.match(/episode-(\d+)/)?.[1]||"0");
    return na-nb;
  });
  const episodeList = episodes.map(epUrl=>({
    episode: epUrl.match(/episode-(\d+)/)?.[1]||"0",
    url: epUrl
  }));

  return { creator:"rynaqrtz", title, slug, poster, description, rating, status, episodesCount, totalEpisodes:episodeList.length, episodeList };
}

async function watch(episodeUrl) {
  const $ = await fetchHTML(episodeUrl);
  const iframes = [];
  $("iframe").each((_,el)=>{
    const src = $(el).attr("src");
    if(src){ const c=cleanUrl(src); if(c) iframes.push(c); }
  });
  if(!iframes.length){
    $("[data-embed],[data-url],[data-src]").each((_,el)=>{
      const val=$(el).attr("data-embed")||$(el).attr("data-url")||$(el).attr("data-src");
      if(val?.includes("http")){ const c=cleanUrl(val); if(c) iframes.push(c); }
    });
  }
  return { creator:"rynaqrtz", iframes:[...new Set(iframes)] };
}

// ── HANDLER ──────────────────────────────────────────────────────────────────
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { cmd, query, slug, url, page, genre: genreSlug } = req.query;
  const p = parseInt(page)||1;

  try {
    let data;
    switch(cmd) {
      case "home":      data = await home(); break;
      case "search":    if(!query) throw new Error("query required"); data = await search(query); break;
      case "ongoing":   data = await ongoing(p); break;
      case "completed": data = await completed(p); break;
      case "genre":     if(!genreSlug) throw new Error("genre required"); data = await genre(genreSlug,p); break;
      case "detail":    if(!slug) throw new Error("slug required"); data = await detail(slug); break;
      case "watch":     if(!url) throw new Error("url required"); data = await watch(url); break;
      default: return res.status(400).json({ error:`Unknown cmd: ${cmd}` });
    }
    res.status(200).json(data);
  } catch(err) {
    res.status(500).json({ error:err.message });
  }
};
