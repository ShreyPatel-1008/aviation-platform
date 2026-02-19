import CryptoJS from 'crypto-js';
import { prisma } from './db';
import { RawArticle } from './sources';

export function hashUrl(url: string): string {
    const normalized = url.trim().toLowerCase().replace(/\/+$/, '');
    return CryptoJS.SHA256(normalized).toString();
}

export async function isDuplicate(url: string): Promise<boolean> {
    const hash = hashUrl(url);
    const existing = await prisma.article.findUnique({
        where: { urlHash: hash },
    });
    return !!existing;
}

export async function filterDuplicates(articles: RawArticle[]): Promise<RawArticle[]> {
    const unique: RawArticle[] = [];
    for (const article of articles) {
        if (!(await isDuplicate(article.url))) {
            unique.push(article);
        }
    }
    return unique;
}
