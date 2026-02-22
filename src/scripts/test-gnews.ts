
import dotenv from 'dotenv';
import { fetchGNews } from '../lib/fetcher';

dotenv.config();

async function test() {
    console.log('Testing GNews fetching...');
    const key = process.env.GNEWS_API_KEY;
    if (!key) {
        console.error('No GNEWS_API_KEY found in .env');
        return;
    }
    console.log('Key found:', key.slice(0, 5) + '...');

    try {
        const articles = await fetchGNews(key);
        console.log(`Successfully fetched ${articles.length} articles from GNews.`);
        articles.forEach(a => console.log(`- ${a.title} (${a.sourceName})`));
    } catch (e) {
        console.error('GNews fetch failed:', e);
    }
}

test();
