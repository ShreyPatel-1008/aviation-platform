import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
        const search = searchParams.get('search') || '';
        const source = searchParams.get('source') || '';
        const from = searchParams.get('from') || '';
        const to = searchParams.get('to') || '';
        const tagsFilter = searchParams.get('tags') || '';
        const category = searchParams.get('category') || '';

        const sort = searchParams.get('sort') || 'newest';

        // Default: only show articles from the last 15 days unless caller
        // explicitly passes a custom from/to range.
        const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);

        const where: Record<string, unknown> = {
            status: 'classified',
        };

        if (category) {
            where.category = category;
        }

        if (search) {
            where.OR = [
                { title: { contains: search } },
                { description: { contains: search } },
                { aiSummary: { contains: search } },
                { content: { contains: search } }, // Added content search
                { tags: { contains: search } },    // Added tags search
            ];
        }

        if (source) {
            where.sourceName = { contains: source };
        }

        if (from) {
            where.publishedAt = { ...(where.publishedAt as object || {}), gte: new Date(from) };
        }

        if (to) {
            where.publishedAt = { ...(where.publishedAt as object || {}), lte: new Date(to) };
        }

        // Apply default 15‑day window only when no explicit date range is provided.
        if (!from && !to) {
            where.publishedAt = { ...(where.publishedAt as object || {}), gte: fifteenDaysAgo };
        }

        if (tagsFilter) {
            where.tags = { contains: tagsFilter };
        }

        // Determine sort order
        let orderBy: Record<string, string> = { publishedAt: 'desc' };
        if (sort === 'oldest') {
            orderBy = { publishedAt: 'asc' };
        } else if (sort === 'newest') {
            orderBy = { publishedAt: 'desc' };
        }
        // 'relevance' is tricky with just 'contains', defaulting to newest for now unless we do raw SQL

        const [articles, total] = await Promise.all([
            prisma.article.findMany({
                where,
                orderBy,
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.article.count({ where }),
        ]);

        // Parse JSON fields
        const formattedArticles = articles.map((a) => ({
            ...a,
            tags: a.tags ? JSON.parse(a.tags) : [],
            entities: a.entities ? JSON.parse(a.entities) : {},
        }));

        return NextResponse.json({
            success: true,
            data: formattedArticles,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasMore: page * limit < total,
            },
        });
    } catch (error) {
        console.error('[API] Error fetching articles:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch articles' },
            { status: 500 }
        );
    }
}
