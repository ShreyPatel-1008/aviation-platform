import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { prisma } from '@/lib/db';
import { classifyArticle } from '@/lib/classifier';
import { hashUrl } from '@/lib/dedup';
import { withRetry } from '@/lib/retry';

/**
 * POST /api/articles/search-fetch
 *
 * On-demand search: fetches fresh articles from GNews matching the user's
 * query, classifies them with Gemini, stores them in the DB, and returns
 * the classified results immediately.
 *
 * Body: { query: string, category?: string }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const query = (body.query || '').trim();
        const categoryFilter = body.category || '';

        if (!query) {
            return NextResponse.json(
                { success: false, error: 'Search query is required' },
                { status: 400 }
            );
        }

        // Build search query — prepend "aviation" for relevance if not already present
        const searchQuery = query.toLowerCase().includes('aviation')
            ? query
            : `aviation ${query}`;

        console.log(`[SearchFetch] Searching for: "${searchQuery}"`);

        // Fetch from GNews (primary search source)
        const gnewsKey = process.env.GNEWS_API_KEY || '';
        const newsApiKey = process.env.NEWS_API_KEY || '';

        const fetchPromises: Promise<RawSearchResult[]>[] = [];

        // GNews search
        if (gnewsKey) {
            fetchPromises.push(
                withRetry(
                    () => axios.get('https://gnews.io/api/v4/search', {
                        params: {
                            q: searchQuery,
                            lang: 'en',
                            max: 10,
                            sortby: 'publishedAt',
                            apikey: gnewsKey,
                        },
                        timeout: 10000,
                    }),
                    { maxRetries: 2, label: 'GNews:search' }
                ).then(res => (res.data.articles || []).map((item: Record<string, unknown>) => ({
                    title: item.title as string || 'Untitled',
                    content: item.content as string || '',
                    description: item.description as string || '',
                    url: item.url as string || '',
                    sourceName: (item.source as Record<string, string>)?.name || 'GNews',
                    imageUrl: item.image as string || undefined,
                    publishedAt: item.publishedAt ? new Date(item.publishedAt as string) : undefined,
                }))).catch(() => [] as RawSearchResult[])
            );
        }

        // NewsAPI search
        if (newsApiKey) {
            fetchPromises.push(
                withRetry(
                    () => axios.get('https://newsapi.org/v2/everything', {
                        params: {
                            q: searchQuery,
                            language: 'en',
                            sortBy: 'publishedAt',
                            pageSize: 10,
                            apiKey: newsApiKey,
                        },
                        timeout: 10000,
                    }),
                    { maxRetries: 2, label: 'NewsAPI:search' }
                ).then(res => (res.data.articles || []).map((item: Record<string, unknown>) => ({
                    title: item.title as string || 'Untitled',
                    content: item.content as string || '',
                    description: item.description as string || '',
                    url: item.url as string || '',
                    sourceName: (item.source as Record<string, string>)?.name || 'NewsAPI',
                    imageUrl: item.urlToImage as string || undefined,
                    publishedAt: item.publishedAt ? new Date(item.publishedAt as string) : undefined,
                }))).catch(() => [] as RawSearchResult[])
            );
        }

        if (fetchPromises.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No news API keys configured. Set GNEWS_API_KEY or NEWS_API_KEY in .env' },
                { status: 500 }
            );
        }

        const results = await Promise.all(fetchPromises);
        const allArticles = results.flat().filter(a => a.url);
        console.log(`[SearchFetch] Found ${allArticles.length} articles for "${query}"`);

        if (allArticles.length === 0) {
            return NextResponse.json({
                success: true,
                count: 0,
                data: [],
                message: `No articles found for "${query}"`,
            });
        }

        // Deduplicate, store, and classify
        const classifiedArticles = [];
        for (const article of allArticles) {
            try {
                const urlHash = hashUrl(article.url);

                // Check if already exists
                const existing = await prisma.article.findUnique({ where: { urlHash } });
                if (existing && existing.status === 'classified') {
                    // Already classified — include if it matches category filter
                    if (!categoryFilter || existing.category === categoryFilter) {
                        const entities = existing.entities ? JSON.parse(existing.entities) : {};
                        const tags = existing.tags ? JSON.parse(existing.tags) : [];
                        classifiedArticles.push({
                            id: existing.id,
                            title: existing.title,
                            summary: existing.aiSummary || '',
                            severity: entities.severity || 'unknown',
                            confidence: existing.aiConfidence || 0,
                            source: existing.sourceName || 'Unknown',
                            published_date: existing.publishedAt?.toISOString() || null,
                            tags,
                            entities,
                            url: existing.url,
                            category: existing.category,
                        });
                    }
                    continue;
                }

                // Classify with AI
                const classification = await classifyArticle(
                    article.title,
                    article.sourceName,
                    `${article.description || ''} ${article.content || ''}`
                );

                // Store in DB
                const stored = await prisma.article.upsert({
                    where: { url: article.url },
                    create: {
                        title: article.title,
                        content: article.content || null,
                        description: article.description || null,
                        url: article.url,
                        urlHash,
                        sourceName: article.sourceName || null,
                        imageUrl: article.imageUrl || null,
                        publishedAt: article.publishedAt || null,
                        category: classification.category,
                        aiSummary: classification.summary,
                        aiConfidence: classification.confidence,
                        tags: JSON.stringify(classification.tags),
                        entities: JSON.stringify(classification.entities),
                        status: 'classified',
                        classifiedAt: new Date(),
                    },
                    update: {
                        category: classification.category,
                        aiSummary: classification.summary,
                        aiConfidence: classification.confidence,
                        tags: JSON.stringify(classification.tags),
                        entities: JSON.stringify(classification.entities),
                        status: 'classified',
                        classifiedAt: new Date(),
                    },
                });

                // Include if it matches category filter
                if (!categoryFilter || classification.category === categoryFilter) {
                    classifiedArticles.push({
                        id: stored.id,
                        title: stored.title,
                        summary: classification.summary,
                        severity: classification.entities.severity || 'unknown',
                        confidence: classification.confidence,
                        source: stored.sourceName || 'Unknown',
                        published_date: stored.publishedAt?.toISOString() || null,
                        tags: classification.tags,
                        entities: classification.entities,
                        url: stored.url,
                        category: classification.category,
                    });
                }

                console.log(`[SearchFetch] ✅ ${article.title.slice(0, 50)}... → ${classification.category}`);
            } catch (error) {
                console.warn(`[SearchFetch] Failed to process: ${article.title.slice(0, 40)}:`, error instanceof Error ? error.message : error);
            }
        }

        return NextResponse.json({
            success: true,
            count: classifiedArticles.length,
            query,
            data: classifiedArticles,
        });
    } catch (error) {
        console.error('[SearchFetch] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Search fetch failed' },
            { status: 500 }
        );
    }
}

interface RawSearchResult {
    title: string;
    content: string;
    description: string;
    url: string;
    sourceName: string;
    imageUrl?: string;
    publishedAt?: Date;
}
