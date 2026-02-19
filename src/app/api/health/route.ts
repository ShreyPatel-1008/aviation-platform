import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
    const checks: Record<string, string> = {};
    let healthy = true;

    // Check database connectivity
    try {
        await prisma.$queryRaw`SELECT 1`;
        checks.database = 'connected';
    } catch {
        checks.database = 'disconnected';
        healthy = false;
    }

    // Check article count
    try {
        const count = await prisma.article.count();
        checks.articles = `${count} total`;
    } catch {
        checks.articles = 'error';
        healthy = false;
    }

    // Check last ingestion
    try {
        const lastLog = await prisma.ingestionLog.findFirst({
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true, triggeredBy: true, durationMs: true, classified: true, failed: true },
        });
        if (lastLog) {
            checks.lastIngestion = `${lastLog.createdAt.toISOString()} (${lastLog.triggeredBy}, ${lastLog.durationMs}ms, ${lastLog.classified} classified, ${lastLog.failed} failed)`;
        } else {
            checks.lastIngestion = 'never';
        }
    } catch {
        checks.lastIngestion = 'error';
    }

    return NextResponse.json({
        status: healthy ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        checks,
    }, { status: healthy ? 200 : 503 });
}
