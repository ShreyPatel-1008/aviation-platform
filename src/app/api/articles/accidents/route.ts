import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const ROLLING_WINDOW_DAYS = 15;

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
        const search = searchParams.get('search') || '';

        // 15-day rolling window — only show recent accidents
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - ROLLING_WINDOW_DAYS);

        const where: Record<string, unknown> = {
            status: 'classified',
            category: 'ACCIDENT_INCIDENT',
            publishedAt: {
                gte: cutoffDate,
            },
        };

        if (search) {
            where.OR = [
                { title: { contains: search } },
                { description: { contains: search } },
                { aiSummary: { contains: search } },
            ];
        }

        const [articles, total] = await Promise.all([
            prisma.article.findMany({
                where,
                orderBy: { publishedAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                select: {
                    id: true,
                    title: true,
                    aiSummary: true,
                    aiConfidence: true,
                    sourceName: true,
                    publishedAt: true,
                    tags: true,
                    entities: true,
                    url: true,
                    category: true,
                    createdAt: true,
                },
            }),
            prisma.article.count({ where }),
        ]);

        // Format response per spec
        const data = articles.map((a) => {
            const entities = a.entities ? JSON.parse(a.entities) : {};
            const tags = a.tags ? JSON.parse(a.tags) : [];
            return {
                id: a.id,
                title: a.title,
                summary: a.aiSummary || '',
                severity: entities.severity || 'unknown',
                confidence: a.aiConfidence || 0,
                source: a.sourceName || 'Unknown',
                published_date: a.publishedAt?.toISOString() || null,
                tags,
                entities,
                url: a.url,
            };
        });

        return NextResponse.json({
            success: true,
            count: total,
            window: `${ROLLING_WINDOW_DAYS} days`,
            cutoff: cutoffDate.toISOString(),
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasMore: page * limit < total,
            },
        });
    } catch (error) {
        console.error('[API] Accidents error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch accidents' }, { status: 500 });
    }
}
