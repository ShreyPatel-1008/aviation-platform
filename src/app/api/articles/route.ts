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

        if (tagsFilter) {
            where.tags = { contains: tagsFilter };
        }

        const [articles, total] = await Promise.all([
            prisma.article.findMany({
                where,
                orderBy: { publishedAt: 'desc' },
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
