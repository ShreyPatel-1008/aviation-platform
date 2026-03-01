import { NextRequest, NextResponse } from 'next/server';
import { createReadStream } from 'fs';
import path from 'path';
import { readdirSync, statSync } from 'fs';
import csv from 'csv-parser';

export const dynamic = 'force-dynamic';

function normalize(str: string): string {
    return (str || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

const ALIASES: Record<string, string> = {
    'air new zealand': 'air newzeland',
    'cathay pacific': 'cathey pacific',
    'singapore airlines': 'singapore',
};

function matchesAirline(search: string, folderName: string): boolean {
    let s = normalize(search);
    s = ALIASES[s] || s;
    const f = normalize(folderName);
    if (!s || !f) return false;
    if (s === f) return true;
    if (s.includes(f) || f.includes(s)) return true;
    if (s.replace(/\s/g, '') === f.replace(/\s/g, '')) return true;
    return false;
}

function loadCsv(filePath: string): Promise<Array<Record<string, string>>> {
    return new Promise((resolve, reject) => {
        const rows: Array<Record<string, string>> = [];
        createReadStream(filePath)
            .pipe(csv())
            .on('data', (row: Record<string, string>) => rows.push(row))
            .on('end', () => resolve(rows))
            .on('error', reject);
    });
}

export async function GET(request: NextRequest) {
    const airline = request.nextUrl.searchParams.get('airline');
    if (!airline || !airline.trim()) {
        return NextResponse.json({ success: false, error: 'airline param required' }, { status: 400 });
    }

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

        // List of airlines that should always use dedicated per-airline sheets folders.
        const majorSheetsAirlines = new Set([
            'air france',
            'air india',
            'air india express',
            'air new zealand',
            'akasa',
            'cathay pacific',
            'emirates',
            'etihad',
            'indigo',
            'singapore',
            'spicejet',
            'vistara',
        ]);

        const airlineNorm = normalize(airline.trim());

        const matched = dirs.find((d) => matchesAirline(airline.trim(), d));
        // Case 1: we have a dedicated folder (major airline) – use per-aircraft CSVs.
        if (matched && majorSheetsAirlines.has(airlineNorm.replace(/\s+/g, ' '))) {
            const folderPath = path.join(sheetsDir, matched);
            const files = readdirSync(folderPath).filter((f) => f.endsWith('.csv'));

            const priority = ['current', 'historic', 'history', 'fleet_list', 'special', 'special_fleet', 'historic_fleet'];
            const ordered = files.slice().sort((a, b) => {
                const aIdx = priority.findIndex((p) => a.toLowerCase().includes(p));
                const bIdx = priority.findIndex((p) => b.toLowerCase().includes(p));
                const ai = aIdx === -1 ? 999 : aIdx;
                const bi = bIdx === -1 ? 999 : bIdx;
                return ai - bi;
            });

            const allRows: Array<Record<string, string>> = [];
            const seen = new Set<string>();
            for (const f of ordered) {
                const rows = await loadCsv(path.join(folderPath, f));
                const lower = f.toLowerCase();
                const category =
                    lower.includes('special') ? 'special' :
                    (lower.includes('historic') || lower.includes('history')) ? 'historic' :
                    lower.includes('current') ? 'current' :
                    'other';
                for (const row of rows) {
                    const reg = (row.REG || row.reg || '').trim();
                    const key = `${reg}-${row['AIRCRAFT TYPE'] || row['Aircraft Type'] || ''}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        (row as any).__category = category;
                        allRows.push(row);
                    }
                }
            }

            return NextResponse.json({
                success: true,
                mode: 'per-aircraft',
                data: allRows,
                total: allRows.length,
                source: `Sheets/${matched}`,
            });
        }

        // Case 2: local/other airlines – fall back to global Fleet Data.csv summary.
        const fleetCsvPath = path.join(sheetsDir, 'Fleet Data.csv');
        try {
            const allRows = await loadCsv(fleetCsvPath);
            const target = normalize(airline.trim());
            const filtered = allRows.filter((row) => {
                const a = normalize((row as any).Airline || '');
                const p = normalize((row as any)['Parent Airline'] || '');
                if (!a && !p) return false;
                return (
                    a === target ||
                    p === target ||
                    a.includes(target) ||
                    target.includes(a) ||
                    p.includes(target) ||
                    target.includes(p)
                );
            });

            if (filtered.length === 0) {
                return NextResponse.json({
                    success: false,
                    error: 'No fleet rows found for this airline',
                    data: [],
                });
            }

            return NextResponse.json({
                success: true,
                mode: 'summary',
                data: filtered,
                total: filtered.length,
                source: 'Sheets/Fleet Data.csv',
            });
        } catch {
            return NextResponse.json({
                success: false,
                error: 'Fleet Data.csv not available',
                data: [],
            });
        }
    } catch (error) {
        console.error('[API] Fleet error:', error);
        return NextResponse.json({ success: false, error: 'Failed to load fleet data' }, { status: 500 });
    }
}
