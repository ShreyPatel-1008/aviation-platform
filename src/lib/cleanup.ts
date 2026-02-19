import { prisma } from './db';

/**
 * Delete articles older than the specified number of days.
 * Keeps the database light and performant.
 */
export async function cleanupOldArticles(olderThanDays: number = 30): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    try {
        const result = await prisma.article.deleteMany({
            where: {
                publishedAt: {
                    lt: cutoff,
                },
            },
        });

        if (result.count > 0) {
            console.log(`[Cleanup] Deleted ${result.count} articles older than ${olderThanDays} days`);
        }

        return result.count;
    } catch (error) {
        console.error('[Cleanup] Failed:', error instanceof Error ? error.message : error);
        return 0;
    }
}

/**
 * Delete articles that failed classification and are stuck.
 */
export async function cleanupFailedArticles(): Promise<number> {
    try {
        const result = await prisma.article.deleteMany({
            where: {
                status: 'queued',
                retryCount: {
                    gte: 3,
                },
            },
        });

        return result.count;
    } catch (error) {
        console.error('[Cleanup] Failed articles cleanup error:', error);
        return 0;
    }
}
