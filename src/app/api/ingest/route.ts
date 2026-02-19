import { NextResponse } from 'next/server';
import { runPipeline } from '@/lib/pipeline';

let isRunning = false;

export async function POST() {
    if (isRunning) {
        return NextResponse.json(
            { success: false, error: 'Pipeline is already running' },
            { status: 409 }
        );
    }

    try {
        isRunning = true;
        const result = await runPipeline('manual');
        return NextResponse.json({ success: true, result });
    } catch (error) {
        console.error('[API] Ingest error:', error);
        return NextResponse.json(
            { success: false, error: 'Pipeline failed' },
            { status: 500 }
        );
    } finally {
        isRunning = false;
    }
}

export async function GET() {
    return NextResponse.json({
        success: true,
        status: isRunning ? 'running' : 'idle',
        message: 'Send POST to trigger ingestion pipeline',
    });
}
