import { prisma } from './db';
import { fetchAllSources } from './fetcher';
import { filterDuplicates, hashUrl } from './dedup';
import { classifyArticle } from './classifier';

export interface PipelineResult {
    fetched: number;
    newArticles: number;
    classified: number;
    failed: number;
    errors: string[];
    durationMs: number;
    timestamp: string;
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function runPipeline(triggeredBy: string = 'manual'): Promise<PipelineResult> {
    const startTime = Date.now();
    const result: PipelineResult = {
        fetched: 0,
        newArticles: 0,
        classified: 0,
        failed: 0,
        errors: [],
        durationMs: 0,
        timestamp: new Date().toISOString(),
    };

    try {
        // Step 1: Fetch from all sources
        console.log('[Pipeline] Step 1: Fetching articles...');
        const rawArticles = await fetchAllSources();
        result.fetched = rawArticles.length;

        // Step 2: Deduplicate
        console.log('[Pipeline] Step 2: Deduplicating...');
        const uniqueArticles = await filterDuplicates(rawArticles);
        result.newArticles = uniqueArticles.length;
        console.log(`[Pipeline] ${uniqueArticles.length} new articles after dedup`);

        if (uniqueArticles.length === 0) {
            console.log('[Pipeline] No new articles to process.');
            result.durationMs = Date.now() - startTime;
            await logIngestion(result, triggeredBy);
            return result;
        }

        // Step 3: Store & Classify (with retry)
        console.log('[Pipeline] Step 3: Storing and classifying...');
        for (const article of uniqueArticles) {
            let attempt = 0;
            let success = false;

            while (attempt <= MAX_RETRIES && !success) {
                try {
                    if (attempt > 0) {
                        console.log(`[Pipeline] Retry ${attempt}/${MAX_RETRIES} for: ${article.title}`);
                        await sleep(RETRY_DELAY_MS * attempt);
                    }

                    // Upsert to prevent duplicate errors
                    const stored = await prisma.article.upsert({
                        where: { url: article.url },
                        create: {
                            title: article.title,
                            content: article.content || null,
                            description: article.description || null,
                            url: article.url,
                            urlHash: hashUrl(article.url),
                            sourceName: article.sourceName || null,
                            sourceUrl: article.sourceUrl || null,
                            author: article.author || null,
                            imageUrl: article.imageUrl || null,
                            publishedAt: article.publishedAt || null,
                            status: 'queued',
                        },
                        update: {}, // no-op if already exists
                    });

                    // Only classify if not already classified
                    if (stored.status !== 'classified') {
                        const classification = await classifyArticle(
                            article.title,
                            article.sourceName || 'Unknown',
                            `${article.description || ''} ${article.content || ''}`
                        );

                        // Update with classification results
                        await prisma.article.update({
                            where: { id: stored.id },
                            data: {
                                category: classification.category,
                                aiSummary: classification.summary,
                                aiConfidence: classification.confidence,
                                tags: JSON.stringify(classification.tags),
                                entities: JSON.stringify(classification.entities),
                                status: 'classified',
                                classifiedAt: new Date(),
                                retryCount: attempt,
                            },
                        });

                        result.classified++;
                        console.log(`[Pipeline] ✅ Classified: ${article.title.slice(0, 60)}... → ${classification.category} (${(classification.confidence * 100).toFixed(0)}%)`);
                    }

                    success = true;
                } catch (error) {
                    attempt++;
                    if (attempt > MAX_RETRIES) {
                        result.failed++;
                        const msg = error instanceof Error ? error.message : 'Unknown error';
                        result.errors.push(`${article.title.slice(0, 40)}: ${msg}`);
                        console.error(`[Pipeline] ❌ Failed after ${MAX_RETRIES} retries: ${article.title}`, msg);

                        // Mark as failed in DB
                        try {
                            await prisma.article.upsert({
                                where: { url: article.url },
                                create: {
                                    title: article.title,
                                    url: article.url,
                                    urlHash: hashUrl(article.url),
                                    status: 'failed',
                                    errorMessage: msg,
                                    retryCount: attempt,
                                },
                                update: {
                                    status: 'failed',
                                    errorMessage: msg,
                                    retryCount: attempt,
                                },
                            });
                        } catch { /* ignore cleanup error */ }
                    }
                }
            }
        }

        console.log(`[Pipeline] ✅ Complete! Classified: ${result.classified}, Failed: ${result.failed}`);
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(msg);
        console.error('[Pipeline] Fatal error:', msg);
    }

    result.durationMs = Date.now() - startTime;
    await logIngestion(result, triggeredBy);
    return result;
}

/**
 * Persist an ingestion log record for audit trail and monitoring.
 */
async function logIngestion(result: PipelineResult, triggeredBy: string) {
    try {
        await prisma.ingestionLog.create({
            data: {
                source: 'pipeline',
                fetched: result.fetched,
                newArticles: result.newArticles,
                classified: result.classified,
                failed: result.failed,
                errors: result.errors.length > 0 ? JSON.stringify(result.errors) : null,
                durationMs: result.durationMs,
                triggeredBy,
            },
        });
        console.log(`[Pipeline] 📝 Ingestion logged (${triggeredBy}, ${result.durationMs}ms)`);
    } catch (error) {
        console.error('[Pipeline] Failed to write ingestion log:', error instanceof Error ? error.message : error);
    }
}
