export default async function handler(req, res) {
  const { endpoint } = req.query;

  if (!endpoint) {
    return res.status(400).json({ error: "Endpoint required" });
  }

  try {
    const response = await fetch(
      `https://www.sankavollerei.com${endpoint}`
    );

    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Fetch failed" });
  }
                                      }
