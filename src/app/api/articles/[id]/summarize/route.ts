import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import Groq from 'groq-sdk';

const SUMMARIZE_PROMPT = `You are an expert Aviation Journalist AI. You are given the title, source snippet, and scraped web content of an aviation news article.

Your job: produce a DETAILED, COMPREHENSIVE summary of the article that a reader can understand WITHOUT visiting the original source. This summary IS the article for the reader.

RULES:
- Write 4-6 detailed paragraphs covering ALL key facts.
- Paragraph 1: What happened — the core event in detail (who, what, when, where).
- Paragraph 2: Circumstances — flight details, weather, phase of flight, or context leading up to the event.
- Paragraph 3: Aftermath — injuries, damage, passenger status, emergency response.
- Paragraph 4: Investigation/Response — authorities involved, initial findings, airline statements.
- Paragraph 5 (optional): Industry context — similar past incidents, fleet-wide implications, safety record.
- Paragraph 6 (optional): Current status — ongoing investigation, operational impact.
- Use factual, professional news-style tone. No speculation.
- Do NOT add any markdown formatting or headers. Just paragraphs separated by double newlines.
- If the content is too short, expand using the title and any available context, but mark uncertain details as "reported" or "according to sources."
- NEVER fabricate specific numbers, names, or facts not present in the source material.

TITLE: {TITLE}
SOURCE: {SOURCE}
CONTENT: {CONTENT}

Write the detailed article summary now:`;

async function fetchArticleContent(url: string): Promise<string> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0',
                'Accept': 'text/html,application/xhtml+xml',
            },
        });

        clearTimeout(timeout);

        if (!res.ok) return '';

        const html = await res.text();

        // Extract text content from HTML (strip tags, scripts, styles)
        let text = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
            .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
            .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
            .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, ' ')
            .trim();

        // Take a reasonable chunk (not the entire page)
        return text.slice(0, 6000);
    } catch (error) {
        console.error('[Summarize] Fetch failed:', error instanceof Error ? error.message : error);
        return '';
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const apiKey = process.env.GROQ_API_KEY;

        console.log(`[Summarize] API Triggered for ID: ${id}`);

        if (!apiKey) {
            console.error('[Summarize] Missing GROQ_API_KEY');
            return NextResponse.json(
                { success: false, error: 'Server configuration error: Missing AI API key' },
                { status: 500 }
            );
        }

        const article = await prisma.article.findUnique({ where: { id } });

        if (!article) {
            console.error(`[Summarize] Article not found: ${id}`);
            return NextResponse.json(
                { success: false, error: 'Article not found in database' },
                { status: 404 }
            );
        }

        // If already has a detailed summary (stored in content), return it
        if (article.content && article.content.length > 500) {
            console.log(`[Summarize] Returning cached summary for: ${article.title.slice(0, 40)}...`);
            return NextResponse.json({
                success: true,
                summary: article.content,
                cached: true,
            });
        }

        // Step 1: Fetch source content
        console.log(`[Summarize] Fetching source URL: ${article.url}`);
        const webContent = await fetchArticleContent(article.url);
        if (!webContent) {
            console.warn('[Summarize] Web scraping failed or was blocked. Falling back to local content.');
        }

        // Combine all available text
        const allContent = [
            article.title,
            article.description || '',
            article.aiSummary || '',
            webContent,
        ].join('\n\n').trim();

        if (allContent.length < 50) {
            console.error('[Summarize] Insufficient content to generate a detailed summary.');
            return NextResponse.json({
                success: false,
                error: 'Not enough available content to generate a detailed summary. Please try refreshing or visiting the source.',
            });
        }

        // Step 2: Generate detailed summary with Groq (LLaMA 3)
        console.log(`[Summarize] Invoking Groq (LLaMA 3) for: ${article.title.slice(0, 50)}... (${allContent.length} chars of context)`);

        const groq = new Groq({ apiKey });

        const prompt = SUMMARIZE_PROMPT
            .replace('{TITLE}', article.title)
            .replace('{SOURCE}', article.sourceName || 'Unknown')
            .replace('{CONTENT}', allContent.slice(0, 12000)); // Groq/LLaMA 3 has larger context window

        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.5,
            max_tokens: 1024,
        });

        const summary = completion.choices[0]?.message?.content?.trim();

        if (!summary || summary.length < 100) {
            console.error('[Summarize] Groq returned an empty or insufficient summary.');
            return NextResponse.json({
                success: false,
                error: 'AI failed to generate a comprehensive summary. Please try again.',
            });
        }

        // Step 3: Store the detailed summary in the content field for caching
        await prisma.article.update({
            where: { id },
            data: { content: summary },
        });

        console.log(`[Summarize] ✅ Successfully generated summary (${summary.length} chars)`);

        return NextResponse.json({
            success: true,
            summary,
            cached: false,
        });
    } catch (error) {
        console.error('[Summarize] FATAL ERROR:', error instanceof Error ? error.stack : error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? `Summarization failed: ${error.message}` : 'Internal server error during summarization'
            },
            { status: 500 }
        );
    }
}
