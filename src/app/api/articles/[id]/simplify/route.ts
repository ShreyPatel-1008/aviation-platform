import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import Groq from 'groq-sdk';

const SIMPLIFY_PROMPT = `You are an expert Aviation Communicator.
Your goal: specificially explain this aviation event to a non-expert, general audience in the simplest terms possible.

RULES:
- Write exactly 2-3 short, clear sentences.
- Explain WHAT happened and WHY it matters.
- Remove ALL aviation jargon (e.g., replace "FL370" with "cruising altitude", "souls on board" with "people", "hull loss" with "destroyed").
- Focus on the "bottom line" impact.
- Tone: Calm, informative, accessible (like a good news anchor).

TEXT TO SIMPLIFY:
{TEXT}

Simple explanation:`;

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json().catch(() => ({}));
        const { text } = body; // Optional: pass text directly to save DB fetch

        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { success: false, error: 'Server configuration error: Missing AI API key' },
                { status: 500 }
            );
        }

        let contentToSimplify = text;

        // If no text provided, fetch from DB
        if (!contentToSimplify || contentToSimplify.length < 50) {
            const article = await prisma.article.findUnique({
                where: { id },
                select: { content: true, aiSummary: true, description: true, title: true }
            });

            if (!article) {
                return NextResponse.json({ success: false, error: 'Article not found' }, { status: 404 });
            }

            // Prioritize: Detailed Report (content) -> AI Summary -> Description -> Title
            contentToSimplify = article.content || article.aiSummary || article.description || article.title;
        }

        if (!contentToSimplify || contentToSimplify.length < 20) {
            return NextResponse.json({ success: false, error: 'Not enough content to summarize' });
        }

        const groq = new Groq({ apiKey });

        const completion = await groq.chat.completions.create({
            messages: [{
                role: 'user',
                content: SIMPLIFY_PROMPT.replace('{TEXT}', contentToSimplify.slice(0, 8000))
            }],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.5,
            max_tokens: 200, // Short output
        });

        const simplified = completion.choices[0]?.message?.content?.trim();

        if (!simplified) {
            return NextResponse.json({ success: false, error: 'Failed to generate simple summary' });
        }

        return NextResponse.json({
            success: true,
            summary: simplified
        });

    } catch (error) {
        console.error('[Simplify] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
