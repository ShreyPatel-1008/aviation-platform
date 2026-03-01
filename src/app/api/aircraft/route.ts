import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const AV_KEY = 'acd5a3889645f09581cbc68e8570d67c';
const UA = 'AviationIQ/1.0';

// ─── Wikitext cleaning ─────────────────────────────────────────

function stripTemplates(text: string): string {
    let r = '', d = 0, i = 0;
    while (i < text.length) {
        if (text[i] === '{' && text[i + 1] === '{') { d++; i += 2; }
        else if (text[i] === '}' && text[i + 1] === '}') { if (d > 0) d--; i += 2; }
        else { if (d === 0) r += text[i]; i++; }
    }
    return r;
}

function clean(t: string): string {
    return stripTemplates(t)
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '')
        .replace(/<ref[^>]*\/>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g, '$2')
        .replace(/\[https?:\/\/[^\s\]]*\s+([^\]]+)\]/g, '$1')
        .replace(/\[https?:\/\/[^\]\s]+\]/g, '')
        .replace(/'{2,3}/g, '')
        .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&[a-z]+;/gi, '')
        .replace(/\[\d+\]/g, '')
        .replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
}

function field(wt: string, ...names: string[]): string | null {
    for (const n of names) {
        const m = wt.match(new RegExp(`\\|\\s*${n}\\s*=\\s*([\\s\\S]*?)(?=\\n[ \\t]*\\||\\n[ \\t]*}})`, 'i'));
        if (m?.[1]) {
            // Some infobox lines pack multiple parameters on a single line, e.g.:
            // | headquarters = Boise, Idaho |url=https://...
            // We only want the first value ("Boise, Idaho") and should drop any
            // trailing "|param=..." segments that are actually other fields.
            let raw = m[1];
            const extraParamIdx = raw.search(/\|\s*\w+\s*=/);
            if (extraParamIdx !== -1) {
                raw = raw.slice(0, extraParamIdx);
            }
            const v = clean(raw);
            if (v && v.length > 1 && v !== '–' && v !== '-' && v !== 'N/A') return v.substring(0, 300);
        }
    }
    return null;
}

// ─── AviationStack fetchers ────────────────────────────────────

async function avFetch(endpoint: string, params: Record<string, string>) {
    const qs = new URLSearchParams({ access_key: AV_KEY, ...params }).toString();
    try {
        const r = await fetch(`http://api.aviationstack.com/v1/${endpoint}?${qs}`, { cache: 'force-cache' });
        if (!r.ok) return null;
        return await r.json();
    } catch { return null; }
}

// ─── Wikipedia page resolution ─────────────────────────────────

async function wikiResolve(name: string): Promise<string | null> {
    const enc = encodeURIComponent(name.replace(/ /g, '_'));
    const r1 = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${enc}`, { headers: { 'User-Agent': UA }, cache: 'force-cache' });
    if (r1.ok) { const d = await r1.json() as { title?: string }; return d.title || name; }
    const r2 = await fetch(`https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(name)}&limit=3&namespace=0&format=json`, { headers: { 'User-Agent': UA }, cache: 'force-cache' });
    if (!r2.ok) return null;
    const d2 = await r2.json() as [string, string[]];
    return d2[1]?.[0] || null;
}

// ─── Main API handler ──────────────────────────────────────────

export async function GET(request: NextRequest) {
    const name = new URL(request.url).searchParams.get('name')?.trim();
    if (!name) return NextResponse.json({ success: false, error: 'Missing name' }, { status: 400 });

    try {
        // Parallel: resolve Wikipedia + AviationStack airline lookup
        const [pageTitle, avAirlineData] = await Promise.all([
            wikiResolve(name),
            avFetch('airlines', { airline_name: name, limit: '3' }),
        ]);

        if (!pageTitle) return NextResponse.json({ success: false, error: `"${name}" not found` }, { status: 404 });

        // Determine best airline match from AviationStack
        const avAirline = avAirlineData?.data?.[0] || null;
        const airlineIata = avAirline?.iata_code?.replace('*', '') || null;

        // Parallel: Wikipedia summary + wikitext + categories + AviationStack fleet
        const encodedTitle = encodeURIComponent(pageTitle.replace(/ /g, '_'));
        const [summaryRes, revRes, catRes, avFleetData] = await Promise.all([
            fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodedTitle}`, { headers: { 'User-Agent': UA }, cache: 'force-cache' }),
            fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2`, { headers: { 'User-Agent': UA }, cache: 'force-cache' }),
            fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=categories&clshow=!hidden&cllimit=10&format=json&formatversion=2`, { headers: { 'User-Agent': UA }, cache: 'force-cache' }),
            airlineIata ? avFetch('airplanes', { airline_iata_code: airlineIata, limit: '100' }) : Promise.resolve(null),
        ]);

        if (!summaryRes.ok) return NextResponse.json({ success: false, error: `"${name}" not found` }, { status: 404 });

        // Parse Wikipedia summary
        const summary = await summaryRes.json() as {
            title?: string; description?: string; extract?: string;
            thumbnail?: { source?: string }; originalimage?: { source?: string };
            content_urls?: { desktop?: { page?: string } };
        };

        // Parse wikitext
        let wt = '';
        try {
            if (revRes.ok) {
                const j = await revRes.json() as { query?: { pages?: Array<{ revisions?: Array<{ slots?: { main?: string | { content?: string } } }> }> } };
                const s = j?.query?.pages?.[0]?.revisions?.[0]?.slots?.main;
                if (typeof s === 'string') wt = s;
                else if (s && typeof s === 'object') wt = (s as { content?: string }).content || '';
            }
        } catch { /* */ }

        // Parse categories
        let categories: string[] = [];
        try {
            if (catRes.ok) {
                const cj = await catRes.json() as { query?: { pages?: Array<{ categories?: Array<{ title: string }> }> } };
                categories = (cj?.query?.pages?.[0]?.categories || []).map(c => c.title?.replace('Category:', '') || '').filter(Boolean).slice(0, 10);
            }
        } catch { /* */ }

        // ─── SECTION 1: Airline Profile ────────────────────────
        const airlineProfile = {
            airlineName: avAirline?.airline_name || field(wt, 'airline') || null,
            iataCode: field(wt, 'IATA', 'iata') || airlineIata,
            icaoCode: field(wt, 'ICAO', 'icao') || avAirline?.icao_code || null,
            callsign: avAirline?.callsign || field(wt, 'callsign') || null,
            country: field(wt, 'country', 'origin', 'country_origin') || avAirline?.country_name || null,
            headquarters: field(wt, 'headquarters', 'location') || null,
            founded: field(wt, 'founded', 'established') || (avAirline?.date_founded ? new Date(avAirline.date_founded).getFullYear().toString() : null),
            website: field(wt, 'website', 'homepage') || null,
            fleetSize: field(wt, 'fleet_size', 'fleet') || avAirline?.fleet_size || null,
            destinations: field(wt, 'destinations') || null,
            hubs: field(wt, 'hubs', 'hub') || avAirline?.hub_code || null,
            airlineType: avAirline?.type || null,
            airlineStatus: avAirline?.status || field(wt, 'status') || null,
            fleetAvgAge: avAirline?.fleet_average_age ? `${avAirline.fleet_average_age} years` : null,
        };

        // ─── SECTION 2: Aircraft Type Specs (Wikipedia infobox) ──
        const aircraftType = {
            manufacturer: field(wt, 'manufacturer', 'designer', 'builder'),
            model: field(wt, 'variant', 'variants', 'model'),
            family: field(wt, 'name', 'type'),
            role: field(wt, 'role', 'type', 'aircraft_type'),
            aircraftCategory: categorizeAircraft(wt, categories),
            lengthM: field(wt, 'length'),
            wingspanM: field(wt, 'wingspan', 'span'),
            heightM: field(wt, 'height'),
            mtowKg: field(wt, 'max_takeoff_weight', 'gross_weight', 'MTOW'),
            rangeKm: field(wt, 'range', 'combat_range', 'ferry_range'),
            cruiseSpeed: field(wt, 'cruise_speed', 'max_speed', 'maximum_speed'),
            maxSpeed: field(wt, 'max_speed', 'maximum_speed'),
            typicalCapacity: field(wt, 'capacity', 'passengers'),
            maxCapacity: field(wt, 'max_passengers', 'maximum_capacity'),
            engines: field(wt, 'engine', 'engines', 'powerplant'),
            firstFlight: field(wt, 'first_flight', 'maiden_flight'),
            introduction: field(wt, 'introduction', 'introduced', 'service_entry'),
            status: field(wt, 'status'),
            numberBuilt: field(wt, 'number_built', 'unitbuilt', 'units_built'),
            unitCost: field(wt, 'unit_cost', 'cost'),
            crew: field(wt, 'crew'),
            ceiling: field(wt, 'ceiling', 'service_ceiling'),
            primaryUser: field(wt, 'primary_user', 'users', 'operators'),
        };

        // ─── SECTION 3: Fleet Composition ──────────────────────────────
        // 1) Default from AviationStack airplanes
        const avPlanes = avFleetData?.data || [];
        let fleetTotal = avFleetData?.pagination?.total || avPlanes.length;

        const fleetByModelFromApi: Record<string, { model: string; modelCode: string; total: number; active: number; stored: number; engineType: string }> = {};
        for (const plane of avPlanes) {
            const key = plane.model_name || plane.iata_type || 'Unknown';
            if (!fleetByModelFromApi[key]) {
                fleetByModelFromApi[key] = {
                    model: key,
                    modelCode: plane.model_code || plane.iata_type || '',
                    total: 0,
                    active: 0,
                    stored: 0,
                    engineType: plane.engines_type || '',
                };
            }
            fleetByModelFromApi[key].total++;
            if (plane.plane_status === 'active') fleetByModelFromApi[key].active++;
            else fleetByModelFromApi[key].stored++;
        }

        let fleetComposition = Object.values(fleetByModelFromApi).sort((a, b) => b.total - a.total);

        // 2) Override fleet composition from local DB (ingested Fleet Data.csv) when available.
        try {
            const airlineNameKey = airlineProfile.airlineName || summary.title || name;
            if (airlineNameKey) {
                const dbAirline = await prisma.airline.findFirst({
                    where: { name: airlineNameKey },
                    include: {
                        fleets: {
                            include: { aircraftType: true },
                        },
                    },
                });

                if (dbAirline && dbAirline.fleets.length > 0) {
                    const byModelDb: Record<string, { model: string; modelCode: string; total: number; active: number; stored: number; engineType: string }> = {};

                    for (const f of dbAirline.fleets) {
                        const modelName = f.aircraftType?.name || f.aircraftTypeRaw || 'Unknown';
                        if (!byModelDb[modelName]) {
                            byModelDb[modelName] = {
                                model: modelName,
                                modelCode: f.aircraftType?.iataCode || f.aircraftType?.icaoCode || '',
                                total: 0,
                                active: 0,
                                stored: 0,
                                engineType: '',
                            };
                        }
                        const totalForType = typeof f.total === 'number'
                            ? f.total
                            : (f.current ?? 0) + (f.future ?? 0) + (f.historic ?? 0);

                        byModelDb[modelName].total += totalForType;
                        byModelDb[modelName].active += f.current ?? 0;
                        byModelDb[modelName].stored += f.historic ?? 0;
                    }

                    fleetComposition = Object.values(byModelDb).sort((a, b) => b.total - a.total);
                    fleetTotal = fleetComposition.reduce((sum, row) => sum + row.total, 0);
                }
            }
        } catch {
            // If DB is not seeded or query fails, silently fall back to AviationStack data.
        }

        // ─── SECTION 4: Individual Aircraft (full sample from API) ──────
        const individualAircraft = avPlanes.map((p: Record<string, string | null>) => ({
            registration: p.registration_number || null,
            serialNumber: p.construction_number || null,        // MSN
            lineNumber: p.line_number || null,
            model: p.model_code || p.model_name || null,
            iataType: p.iata_type || null,
            productionLine: p.production_line || null,
            enginesCount: p.engines_count || null,
            enginesType: p.engines_type || null,
            firstFlightDate: p.first_flight_date ? formatDate(p.first_flight_date) : null,
            deliveryDate: p.delivery_date ? formatDate(p.delivery_date) : null,
            aircraftAge: p.plane_age ? `${p.plane_age} years` : null,
            status: p.plane_status || null,
            owner: p.plane_owner || null,
            icaoHex: p.icao_code_hex || null,
            testRegistration: p.test_registration_number || null,
        }));

        // ─── Build response ────────────────────────────────────
        const result = {
            // Core info (Wikipedia)
            name: summary.title || name,
            description: summary.description || '',
            extract: summary.extract || '',
            image: summary.originalimage?.source || summary.thumbnail?.source || null,
            thumbnail: summary.thumbnail?.source || null,
            url: summary.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodedTitle}`,
            categories,

            // Organized data sections
            airlineProfile,
            aircraftType,
            fleetComposition: {
                totalInDatabase: fleetTotal,
                sampleSize: avPlanes.length,
                byModel: fleetComposition,
            },
            individualAircraft,

            // Data sources
            dataSources: {
                wikipedia: true,
                aviationStack: !!avAirline || avPlanes.length > 0,
                fleetDataCount: fleetTotal,
            },
        };

        return NextResponse.json({ success: true, aircraft: result });

    } catch (error) {
        console.error('[Aircraft API]', error instanceof Error ? error.message : error);
        return NextResponse.json({ success: false, error: 'Failed to fetch data.' }, { status: 500 });
    }
}

// ─── Helpers ───────────────────────────────────────────────────

function formatDate(isoDate: string): string {
    try {
        const d = new Date(isoDate);
        if (isNaN(d.getTime()) || d.getFullYear() < 1900) return '';
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return ''; }
}

function categorizeAircraft(wt: string, categories: string[]): string | null {
    const text = (wt + ' ' + categories.join(' ')).toLowerCase();
    if (text.includes('widebody') || text.includes('wide-body') || text.includes('twin-aisle')) return 'Widebody';
    if (text.includes('narrowbody') || text.includes('narrow-body') || text.includes('single-aisle')) return 'Narrowbody';
    if (text.includes('regional')) return 'Regional';
    if (text.includes('cargo') || text.includes('freighter')) return 'Cargo';
    if (text.includes('fighter') || text.includes('military')) return 'Military';
    if (text.includes('helicopter') || text.includes('rotorcraft')) return 'Helicopter';
    if (text.includes('business jet') || text.includes('private')) return 'Business Jet';
    return null;
}
