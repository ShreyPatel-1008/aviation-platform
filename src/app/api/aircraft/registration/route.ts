import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { readdirSync, statSync, createReadStream } from 'fs';
import csv from 'csv-parser';

export const dynamic = 'force-dynamic';

function normalizeReg(reg: string): string {
    return (reg || '')
        .toUpperCase()
        .replace(/\s+/g, '')
        .replace(/-/g, '');
}

export async function GET(request: NextRequest) {
    const regParam = request.nextUrl.searchParams.get('reg');
    if (!regParam || !regParam.trim()) {
        return NextResponse.json({ success: false, error: 'reg param required' }, { status: 400 });
    }

    const targetNorm = normalizeReg(regParam);

    try {
        const sheetsDir = path.join(process.cwd(), 'Sheets');
        let dirs: string[];
        try {
            dirs = readdirSync(sheetsDir).filter((name) => {
                const full = path.join(sheetsDir, name);
                return statSync(full).isDirectory() && !name.startsWith('.');
            });
        } catch {
            return NextResponse.json({ success: false, error: 'Sheets folder not found' }, { status: 404 });
        }

        for (const dir of dirs) {
            const folderPath = path.join(sheetsDir, dir);
            const files = readdirSync(folderPath).filter((f) => f.endsWith('.csv'));

            for (const file of files) {
                const fullPath = path.join(folderPath, file);
                const lower = file.toLowerCase();
                const category =
                    lower.includes('special') ? 'special' :
                    (lower.includes('historic') || lower.includes('history')) ? 'historic' :
                    lower.includes('current') ? 'current' :
                    'other';

                const foundRow = await new Promise<Record<string, string> | null>((resolve, reject) => {
                    let matched: Record<string, string> | null = null;
                    createReadStream(fullPath)
                        .pipe(csv())
                        .on('data', (row: Record<string, string>) => {
                            if (matched) return;
                            const r = normalizeReg(row.REG || row.reg || '');
                            if (r && r === targetNorm) {
                                matched = row;
                            }
                        })
                        .on('end', () => resolve(matched))
                        .on('error', (err) => reject(err));
                });

                if (foundRow) {
                    return NextResponse.json({
                        success: true,
                        registration: regParam.trim().toUpperCase(),
                        airlineFolder: dir,
                        airlineName: dir.replace(/[_-]+/g, ' '),
                        category,
                        row: foundRow,
                    });
                }
            }
        }

        return NextResponse.json({ success: false, error: 'Registration not found in Sheets' }, { status: 404 });
    } catch (error) {
        console.error('[Aircraft registration API]', error);
        return NextResponse.json({ success: false, error: 'Failed to search registration' }, { status: 500 });
    }
}

