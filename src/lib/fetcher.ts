import RSSParser from 'rss-parser';
import axios from 'axios';
import { RawArticle, RSS_SOURCES, ACCIDENT_KEYWORDS, TRADE_KEYWORDS } from './sources';
import { withRetry } from './retry';

const rssParser = new RSSParser({
    timeout: 10000,
    headers: {
        'User-Agent': 'AviationIntelligencePlatform/1.0',
    },
});

export async function fetchRSSFeed(source: { name: string; url: string }): Promise<RawArticle[]> {
    try {
        const feed = await withRetry(
            () => rssParser.parseURL(source.url),
            { maxRetries: 2, baseDelayMs: 1000, label: `RSS:${source.name}` }
        );
        return (feed.items || []).map((item) => ({
            title: item.title || 'Untitled',
            content: item.contentSnippet || item.content || '',
            description: item.contentSnippet || item.summary || '',
            url: item.link || '',
            sourceName: source.name,
            sourceUrl: source.url,
            author: item.creator || item.author || undefined,
            imageUrl: item.enclosure?.url || undefined,
            publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
        })).filter(a => a.url);
    } catch (error) {
        console.warn(`[RSS] Failed to fetch ${source.name} after retries:`, error instanceof Error ? error.message : error);
        return [];
    }
}

export async function fetchAllRSS(): Promise<RawArticle[]> {
    const startTime = Date.now();
    const results = await Promise.allSettled(
        RSS_SOURCES.map((source) => fetchRSSFeed(source))
    );

    const articles: RawArticle[] = [];
    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            console.log(`[RSS] ${RSS_SOURCES[index].name}: ${result.value.length} articles`);
            articles.push(...result.value);
        }
    });

    console.log(`[RSS] All feeds fetched in ${Date.now() - startTime}ms`);
    return articles;
}

export async function fetchNewsAPI(apiKey: string): Promise<RawArticle[]> {
    if (!apiKey) return [];

    const startTime = Date.now();
    const allArticles: RawArticle[] = [];
    const keywords = [...ACCIDENT_KEYWORDS.slice(0, 3), ...TRADE_KEYWORDS.slice(0, 3)];

    for (const keyword of keywords) {
        try {
            const response = await withRetry(
                () => axios.get('https://newsapi.org/v2/everything', {
                    params: {
                        q: keyword,
                        language: 'en',
                        sortBy: 'publishedAt',
                        pageSize: 10,
                        apiKey,
                    },
                    timeout: 10000,
                }),
                { maxRetries: 2, baseDelayMs: 1000, label: `NewsAPI:${keyword}` }
            );

            const articles = (response.data.articles || []).map((item: Record<string, unknown>) => ({
                title: item.title as string || 'Untitled',
                content: item.content as string || '',
                description: item.description as string || '',
                url: item.url as string || '',
                sourceName: (item.source as Record<string, string>)?.name || 'NewsAPI',
                author: item.author as string || undefined,
                imageUrl: item.urlToImage as string || undefined,
                publishedAt: item.publishedAt ? new Date(item.publishedAt as string) : undefined,
            })).filter((a: RawArticle) => a.url);

            allArticles.push(...articles);
        } catch (error) {
            console.warn(`[NewsAPI] Failed for "${keyword}" after retries:`, error instanceof Error ? error.message : error);
        }
    }

    console.log(`[NewsAPI] Fetched ${allArticles.length} articles in ${Date.now() - startTime}ms`);
    return allArticles;
}

export async function fetchGNews(apiKey: string): Promise<RawArticle[]> {
    if (!apiKey) return [];

    const startTime = Date.now();
    const allArticles: RawArticle[] = [];
    const keywords = ['aviation accident', 'aircraft order', 'aviation regulation'];

    for (const keyword of keywords) {
        try {
            const response = await withRetry(
                () => axios.get('https://gnews.io/api/v4/search', {
                    params: {
                        q: keyword,
                        lang: 'en',
                        max: 10,
                        apikey: apiKey,
                    },
                    timeout: 10000,
                }),
                { maxRetries: 2, baseDelayMs: 1000, label: `GNews:${keyword}` }
            );

            const articles = (response.data.articles || []).map((item: Record<string, unknown>) => ({
                title: item.title as string || 'Untitled',
                content: item.content as string || '',
                description: item.description as string || '',
                url: item.url as string || '',
                sourceName: (item.source as Record<string, string>)?.name || 'GNews',
                author: undefined,
                imageUrl: item.image as string || undefined,
                publishedAt: item.publishedAt ? new Date(item.publishedAt as string) : undefined,
            })).filter((a: RawArticle) => a.url);

            allArticles.push(...articles);
        } catch (error) {
            console.warn(`[GNews] Failed for "${keyword}" after retries:`, error instanceof Error ? error.message : error);
        }
    }

    console.log(`[GNews] Fetched ${allArticles.length} articles in ${Date.now() - startTime}ms`);
    return allArticles;
}

export async function fetchAllSources(): Promise<RawArticle[]> {
    console.log('[Ingestion] Starting data fetch from all sources...');

    const [rssArticles, newsApiArticles, gnewsArticles] = await Promise.all([
        fetchAllRSS(),
        fetchNewsAPI(process.env.NEWS_API_KEY || ''),
        fetchGNews(process.env.GNEWS_API_KEY || ''),
    ]);

    const total = [...rssArticles, ...newsApiArticles, ...gnewsArticles];
    console.log(`[Ingestion] Total fetched: ${total.length} articles (RSS: ${rssArticles.length}, NewsAPI: ${newsApiArticles.length}, GNews: ${gnewsArticles.length})`);

    return total;
}
