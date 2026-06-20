const axios = require('axios');

/*
 * File ini jadi Vercel Serverless Function: /api/video.js → /api/video
 * Fungsi: proxy stream video Nimegami biar lolos proteksi hotlink (Referer check)
 * di domain CDN mereka (stordl.halahgan.com dkk).
 *
 * Mendukung HTTP Range requests, jadi seek/skip di video player tetap jalan
 * normal walau videonya di-proxy.
 *
 * Pemakaian dari frontend:
 *   <video src="/api/video?url=ENCODED_ORIGINAL_VIDEO_URL">
 */

module.exports = async (req, res) => {
  const { url } = req.query;
  if (!url) {
    res.status(400).json({ error: 'Missing url parameter' });
    return;
  }

  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Referer': 'https://nimegami.id/',
      'Accept': '*/*',
      'Accept-Encoding': 'identity' // jangan gzip biar Range/Content-Length akurat buat video
    };
    // Teruskan header Range dari browser (penting buat seek/skip & efisiensi loading)
    if (req.headers.range) headers['Range'] = req.headers.range;

    const upstream = await axios({
      url,
      method: 'GET',
      headers,
      responseType: 'stream',
      timeout: 30000,
      validateStatus: s => s >= 200 && s < 400
    });

    // Status 206 kalau partial content (Range request), 200 kalau full
    res.status(upstream.status);

    const passHeaders = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'cache-control'];
    passHeaders.forEach(h => {
      if (upstream.headers[h]) res.setHeader(h, upstream.headers[h]);
    });
    if (!upstream.headers['accept-ranges']) res.setHeader('Accept-Ranges', 'bytes');
    if (!upstream.headers['content-type']) res.setHeader('Content-Type', 'video/mp4');

    upstream.data.pipe(res);
  } catch (e) {
    if (!res.headersSent) {
      res.status(500).json({ error: e.message });
    } else {
      res.end();
    }
  }
};
