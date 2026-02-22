import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const article = await prisma.article.findUnique({
            where: { id },
        });

        if (!article) {
            return NextResponse.json(
                { success: false, error: 'Article not found' },
                { status: 404 }
            );
        }

        // Parse JSON fields
        const formatted = {
            ...article,
            tags: article.tags ? JSON.parse(article.tags) : [],
            entities: article.entities ? JSON.parse(article.entities) : {},
            keyInsights: article.keyInsights ? JSON.parse(article.keyInsights) : [],
        };

        return NextResponse.json({ success: true, article: formatted });
    } catch (error) {
        console.error('[API] Article detail error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch article' },
            { status: 500 }
        );
    }
}
