export default async function handler(req, res) {
  const { endpoint } = req.query;

  if (!endpoint) {
    return res.status(400).json({ error: "Endpoint required" });
  }

  try {
    const targetUrl = `https://www.sankavollerei.com${endpoint}`;

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept": "*/*",
        "Referer": "https://www.sankavollerei.com/"
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Failed to fetch. Status: ${response.status}`
      });
    }

    const html = await response.text();

    res.status(200).json({
      success: true,
      source: targetUrl,
      data: html
    });

  } catch (error) {
    res.status(500).json({
      error: "Fetch failed",
      message: error.message
    });
  }
}
