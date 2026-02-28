import Parser from "rss-parser";

const parser = new Parser();

export default async function handler(req, res) {
  try {
    const feed = await parser.parseURL(process.env.RSS_FEED_URL);

    console.log("Fetched:", feed.items.length);

    // store to DB here

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("RSS error:", err);
    res.status(500).json({ error: "RSS fetch failed" });
  }
}