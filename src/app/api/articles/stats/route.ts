import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
    try {
        const [total, accidents, trades, regulations, general, pending, failed, lastUpdated] = await Promise.all([
            prisma.article.count({ where: { status: 'classified' } }),
            prisma.article.count({ where: { category: 'ACCIDENT_INCIDENT', status: 'classified' } }),
            prisma.article.count({ where: { category: 'AVIATION_TRADE', status: 'classified' } }),
            prisma.article.count({ where: { category: 'REGULATION', status: 'classified' } }),
            prisma.article.count({ where: { category: 'GENERAL', status: 'classified' } }),
            prisma.article.count({ where: { status: 'pending' } }),
            prisma.article.count({ where: { status: 'failed' } }),
            prisma.article.findFirst({ orderBy: { classifiedAt: 'desc' }, select: { classifiedAt: true } }),
        ]);

        // Articles created in the last 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const last24h = await prisma.article.count({
            where: { createdAt: { gte: twentyFourHoursAgo } },
        });

        // Get source distribution
        const sources = await prisma.article.groupBy({
            by: ['sourceName'],
            _count: true,
            where: { status: 'classified' },
            orderBy: { _count: { sourceName: 'desc' } },
            take: 10,
        });

        // Get last ingestion log
        let lastIngestion = null;
        try {
            const log = await prisma.ingestionLog.findFirst({
                orderBy: { createdAt: 'desc' },
                select: {
                    createdAt: true,
                    fetched: true,
                    newArticles: true,
                    classified: true,
                    failed: true,
                    durationMs: true,
                    triggeredBy: true,
                },
            });
            if (log) {
                lastIngestion = {
                    timestamp: log.createdAt,
                    fetched: log.fetched,
                    newArticles: log.newArticles,
                    classified: log.classified,
                    failed: log.failed,
                    durationMs: log.durationMs,
                    triggeredBy: log.triggeredBy,
                };
            }
        } catch {
            // IngestionLog table might not exist yet
        }

        return NextResponse.json({
            success: true,
            stats: {
                total,
                accidents,
                trades,
                regulations,
                general,
                pending,
                failed,
                last24h,
                lastUpdated: lastUpdated?.classifiedAt || null,
                lastIngestion,
                sources: sources.map((s) => ({ name: s.sourceName, count: s._count })),
            },
        });
    } catch (error) {
        console.error('[API] Stats error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch stats' }, { status: 500 });
    }
}
