import { NextResponse } from 'next/server';
import { createReadStream } from 'fs';
import path from 'path';
import csv from 'csv-parser';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const csvPath = path.join(process.cwd(), 'Sheets', 'IndiGo', 'indiGo Current fleet.csv');
        const rows: Array<Record<string, string>> = [];

        await new Promise<void>((resolve, reject) => {
            createReadStream(csvPath)
                .pipe(csv())
                .on('data', (row: Record<string, string>) => rows.push(row))
                .on('end', () => resolve())
                .on('error', (err) => reject(err));
        });

        return NextResponse.json({
            success: true,
            data: rows,
            total: rows.length,
        });
    } catch (error) {
        console.error('[API] IndiGo fleet CSV error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to load IndiGo fleet data' },
            { status: 500 }
        );
    }
}
