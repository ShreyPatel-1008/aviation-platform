import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
        const search = searchParams.get('search') || '';

        const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);

        const where: Record<string, unknown> = {
            status: 'classified',
            category: 'AVIATION_TRADE',
            publishedAt: { gte: fifteenDaysAgo },
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
            }),
            prisma.article.count({ where }),
        ]);

        const formattedArticles = articles.map((a) => ({
            ...a,
            tags: a.tags ? JSON.parse(a.tags) : [],
            entities: a.entities ? JSON.parse(a.entities) : {},
        }));

        return NextResponse.json({
            success: true,
            section: 'Aviation Trades',
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
        console.error('[API] Error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 });
    }
}
