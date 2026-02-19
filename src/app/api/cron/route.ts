import { NextRequest, NextResponse } from 'next/server';
import { runPipeline } from '@/lib/pipeline';
import { cleanupOldArticles } from '@/lib/cleanup';

// In-memory scheduler state
let cronInterval: ReturnType<typeof setInterval> | null = null;
let lastRun: string | null = null;
let isRunning = false;
let runCount = 0;

const CRON_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

async function executeCronJob() {
    if (isRunning) {
        console.log('[Cron] Skipping — previous run still in progress');
        return;
    }

    isRunning = true;
    runCount++;
    console.log(`[Cron] Run #${runCount} starting at ${new Date().toISOString()}`);

    try {
        // Run ingestion pipeline
        const result = await runPipeline('cron');
        console.log(`[Cron] Pipeline complete — fetched: ${result.fetched}, new: ${result.newArticles}, classified: ${result.classified}`);

        // Run cleanup (delete articles older than 30 days)
        const deleted = await cleanupOldArticles(30);
        console.log(`[Cron] Cleanup complete — removed ${deleted} old articles`);

        lastRun = new Date().toISOString();
    } catch (error) {
        console.error('[Cron] Job failed:', error instanceof Error ? error.message : error);
    } finally {
        isRunning = false;
    }
}

// ── Auto-start scheduler on module load ──────────────────────────
// This ensures the cron job starts automatically when the Next.js server boots,
// without needing a manual POST to /api/cron?action=start.
function autoStart() {
    if (!cronInterval) {
        console.log('[Cron] ✅ Auto-starting scheduler (every 30 min)...');
        // Delay first run by 10 seconds to let the server stabilize
        setTimeout(() => {
            executeCronJob();
            cronInterval = setInterval(executeCronJob, CRON_INTERVAL_MS);
        }, 10_000);
    }
}
autoStart();

// Expose scheduler state for health checks and dashboard
export function getSchedulerStatus() {
    return {
        active: cronInterval !== null,
        intervalMs: CRON_INTERVAL_MS,
        intervalMinutes: CRON_INTERVAL_MS / 60000,
        isRunning,
        lastRun,
        runCount,
    };
}

// POST /api/cron — Start or stop the cron scheduler
export async function POST(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'start';

    if (action === 'start') {
        if (cronInterval) {
            return NextResponse.json({ success: true, message: 'Cron already running', lastRun, runCount });
        }

        // Run immediately, then every 30 minutes
        executeCronJob();
        cronInterval = setInterval(executeCronJob, CRON_INTERVAL_MS);

        return NextResponse.json({
            success: true,
            message: `Cron started — runs every ${CRON_INTERVAL_MS / 60000} minutes`,
            intervalMs: CRON_INTERVAL_MS,
        });
    }

    if (action === 'stop') {
        if (cronInterval) {
            clearInterval(cronInterval);
            cronInterval = null;
        }
        return NextResponse.json({ success: true, message: 'Cron stopped', lastRun, runCount });
    }

    // Run once
    if (action === 'run') {
        executeCronJob();
        return NextResponse.json({ success: true, message: 'Manual run triggered' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action. Use: start, stop, run' }, { status: 400 });
}

// GET /api/cron — Get cron status
export async function GET() {
    return NextResponse.json({
        success: true,
        scheduler: getSchedulerStatus(),
    });
}
