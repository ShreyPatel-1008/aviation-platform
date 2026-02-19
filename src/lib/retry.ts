/**
 * Generic retry wrapper with exponential backoff.
 * Retries a function up to `maxRetries` times with increasing delays.
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: {
        maxRetries?: number;
        baseDelayMs?: number;
        label?: string;
    } = {}
): Promise<T> {
    const { maxRetries = 3, baseDelayMs = 1000, label = 'Operation' } = options;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            const isLastAttempt = attempt === maxRetries;
            const errMsg = error instanceof Error ? error.message : String(error);

            if (isLastAttempt) {
                console.error(`[Retry] ${label} failed after ${maxRetries + 1} attempts: ${errMsg}`);
                throw error;
            }

            const delay = baseDelayMs * Math.pow(2, attempt); // 1s, 2s, 4s
            console.warn(`[Retry] ${label} attempt ${attempt + 1}/${maxRetries + 1} failed: ${errMsg}. Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    // TypeScript requires this, but it's unreachable
    throw new Error(`${label} failed unexpectedly`);
}
