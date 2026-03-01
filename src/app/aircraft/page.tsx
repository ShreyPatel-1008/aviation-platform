'use client';

import { useState, useRef, useEffect } from 'react';

type FleetCsvRow = Record<string, string> & {
    REG: string;
    'AIRCRAFT TYPE'?: string;
    CONFIG?: string;
    DELIVERED?: string;
    'EXIT DATE'?: string;
    'STATUS / FATE'?: string;
    REMARK?: string;
    AGE?: string;
    'AIRCRAFT NAME'?: string;
    __category?: string;
};

/* ─── Types ─────────────────────────────────────────────────── */

interface AircraftData {
    name: string;
    description: string;
    extract: string;
    image: string | null;
    thumbnail: string | null;
    url: string;
    categories: string[];
    airlineProfile: {
        airlineName: string | null;
        iataCode: string | null;
        icaoCode: string | null;
        callsign: string | null;
        country: string | null;
        headquarters: string | null;
        founded: string | null;
        website: string | null;
        fleetSize: string | null;
        destinations: string | null;
        hubs: string | null;
        airlineType: string | null;
        airlineStatus: string | null;
        fleetAvgAge: string | null;
    };
    aircraftType: {
        manufacturer: string | null;
        model: string | null;
        family: string | null;
        role: string | null;
        aircraftCategory: string | null;
        lengthM: string | null;
        wingspanM: string | null;
        heightM: string | null;
        mtowKg: string | null;
        rangeKm: string | null;
        cruiseSpeed: string | null;
        maxSpeed: string | null;
        typicalCapacity: string | null;
        maxCapacity: string | null;
        engines: string | null;
        firstFlight: string | null;
        introduction: string | null;
        status: string | null;
        numberBuilt: string | null;
        unitCost: string | null;
        crew: string | null;
        ceiling: string | null;
        primaryUser: string | null;
    };
    fleetComposition: {
        totalInDatabase: number;
        sampleSize: number;
        byModel: Array<{
            model: string;
            modelCode: string;
            total: number;
            active: number;
            stored: number;
            engineType: string;
        }>;
    };
    individualAircraft: Array<{
        registration: string | null;
        serialNumber: string | null;
        lineNumber: string | null;
        model: string | null;
        iataType: string | null;
        productionLine: string | null;
        enginesCount: string | null;
        enginesType: string | null;
        firstFlightDate: string | null;
        deliveryDate: string | null;
        aircraftAge: string | null;
        status: string | null;
        owner: string | null;
        icaoHex: string | null;
        testRegistration: string | null;
    }>;
    dataSources: {
        wikipedia: boolean;
        aviationStack: boolean;
        fleetDataCount: number;
    };
}

/* ─── Constants ─────────────────────────────────────────────── */

const POPULAR = [
    { name: 'Boeing 747', emoji: '✈️', desc: 'Queen of the Skies' },
    { name: 'Concorde', emoji: '🚀', desc: 'Supersonic Airliner' },
    { name: 'F-22 Raptor', emoji: '🛡️', desc: 'Stealth Fighter' },
    { name: 'Airbus A380', emoji: '🛩️', desc: 'Largest Airliner' },
    { name: 'IndiGo', emoji: '💙', desc: 'Indian Low-Cost Airline' },
    { name: 'Emirates airline', emoji: '🇦🇪', desc: 'Dubai Flagship Carrier' },
    { name: 'Airbus A320', emoji: '🛫', desc: 'Best-Selling Airliner' },
    { name: 'SR-71 Blackbird', emoji: '🌑', desc: 'Fastest Ever' },
];

const TABS = ['Overview', 'Aircraft Specs', 'Fleet', 'Individual Aircraft'] as const;
type Tab = typeof TABS[number];

const MAJOR_SHEETS_AIRLINES = new Set([
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

/* ─── Sub-components ────────────────────────────────────────── */

function Fact({ icon, label, value }: { icon: string; label: string; value: string | null }) {
    if (!value) return null;
    return (
        <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '10px',
            padding: '10px 14px', borderRadius: '10px',
            background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.08)',
        }}>
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>{icon}</span>
            <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.45, marginBottom: '2px' }}>{label}</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 500, lineHeight: 1.4 }}>{value}</div>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const s = status.toLowerCase();
    const bg = s.includes('active') ? 'rgba(52,211,153,0.15)' : s.includes('retired') || s.includes('historical') ? 'rgba(239,68,68,0.15)' : 'rgba(250,204,21,0.15)';
    const fg = s.includes('active') ? '#34d399' : s.includes('retired') || s.includes('historical') ? '#f87171' : '#facc15';
    return <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.73rem', fontWeight: 700, background: bg, color: fg }}>{status}</span>;
}

function SectionTitle({ icon, title }: { icon: string; title: string }) {
    return <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}><span>{icon}</span>{title}</h3>;
}

/* ─── Page ──────────────────────────────────────────────────── */

export default function AircraftPage() {
    const [query, setQuery] = useState('');
    const [aircraft, setAircraft] = useState<AircraftData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [tab, setTab] = useState<Tab>('Overview');
    const [individualPage, setIndividualPage] = useState(1);
    const [individualSearch, setIndividualSearch] = useState('');
    const [individualCategory, setIndividualCategory] = useState<'all' | 'current' | 'historic' | 'special'>('all');
    const [sheetsFleetData, setSheetsFleetData] = useState<FleetCsvRow[] | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const airlineSearchName = aircraft ? (aircraft.airlineProfile?.airlineName || aircraft.name || '') : '';

    useEffect(() => {
        if (!aircraft || !airlineSearchName.trim()) {
            setSheetsFleetData(null);
            return;
        }
        let cancelled = false;
        fetch(`/api/fleet?airline=${encodeURIComponent(airlineSearchName.trim())}`)
            .then((r) => r.json())
            .then((j) => {
                if (cancelled) return;
                if (j.success && Array.isArray(j.data)) setSheetsFleetData(j.data);
                else setSheetsFleetData(null);
            })
            .catch(() => { if (!cancelled) setSheetsFleetData(null); });
        return () => { cancelled = true; };
    }, [aircraft?.name, airlineSearchName]);

    async function search(term: string) {
        const q = term.trim();
        if (!q) return;
        setLoading(true); setError(''); setAircraft(null); setTab('Overview'); setIndividualPage(1);

        const norm = q.toLowerCase().replace(/\s+/g, ' ').trim();
        const canonical =
            norm === 'singapore airlines' ? 'singapore' :
            norm === 'etihad airways' ? 'etihad' :
            norm === 'indigo airlines' ? 'indigo' :
            norm;

        const looksLikeRegistration = /^[A-Za-z0-9-]{3,10}$/.test(q);

        // If the query looks like an aircraft registration (e.g. VT-ALF, TC-FHL),
        // first resolve it against our Sheets data and then search by the airline,
        // instead of sending the raw registration to Wikipedia (which can return
        // unrelated pages like electronics brands).
        if (looksLikeRegistration) {
            try {
                const rr = await fetch(`/api/aircraft/registration?reg=${encodeURIComponent(q)}`);
                const rj = await rr.json();
                if (rj.success && rj.airlineName) {
                    const airlineName: string = rj.airlineName;
                    const ar = await fetch(`/api/aircraft?name=${encodeURIComponent(airlineName)}`);
                    const aj = await ar.json();
                    if (aj.success) {
                        setAircraft(aj.aircraft);
                        setTab('Individual Aircraft');
                        setIndividualSearch(q.toUpperCase());
                        setLoading(false);
                        return;
                    }
                }
            } catch {
                // If registration lookup fails, fall through to the normal flow below.
            }
        }

        try {
            const r = await fetch(`/api/aircraft?name=${encodeURIComponent(q)}`);
            const j = await r.json();
            if (j.success) {
                setAircraft(j.aircraft);
            } else {
                // If this looks like a direct aircraft registration, try resolving it
                // to an airline using Sheets, then re-run the search with that airline.
                if (looksLikeRegistration) {
                    try {
                        const rr = await fetch(`/api/aircraft/registration?reg=${encodeURIComponent(q)}`);
                        const rj = await rr.json();
                        if (rj.success && rj.airlineName) {
                            const airlineName: string = rj.airlineName;
                            // Run a second search with the resolved airline name.
                            const ar = await fetch(`/api/aircraft?name=${encodeURIComponent(airlineName)}`);
                            const aj = await ar.json();
                            if (aj.success) {
                                setAircraft(aj.aircraft);
                                setTab('Individual Aircraft');
                                setIndividualSearch(q.toUpperCase());
                                setLoading(false);
                                return;
                            }
                        }
                    } catch {
                        // fall through to normal handling
                    }
                }

                // For major airlines with dedicated Sheets folders, do not replace Wikipedia/AviationStack
                // data with a Sheets-only stub – surface the error instead.
                if (MAJOR_SHEETS_AIRLINES.has(canonical)) {
                    setError(j.error || 'Not found');
                    return;
                }

                // Fallback for local/other airlines: build a basic view from Sheets/Fleet Data.
                try {
                    const fr = await fetch(`/api/fleet?airline=${encodeURIComponent(q)}`);
                    const fj = await fr.json();
                    if (fj.success && Array.isArray(fj.data) && fj.data.length > 0) {
                        const rows: FleetCsvRow[] = fj.data;
                        const hasRegistrations = rows.some(r => r.REG);

                        const byModel = new Map<string, { model: string; modelCode: string; total: number; active: number; stored: number; engineType: string }>();
                        for (const row of rows) {
                            const model = row['AIRCRAFT TYPE'] || 'Unknown';
                            const key = model;
                            if (!byModel.has(key)) {
                                byModel.set(key, {
                                    model,
                                    modelCode: '',
                                    total: 0,
                                    active: 0,
                                    stored: 0,
                                    engineType: '',
                                });
                            }
                            const entry = byModel.get(key)!;
                            entry.total += 1;
                        }
                        const fleetComposition = Array.from(byModel.values()).sort((a, b) => b.total - a.total);

                        const aircraftFromSheets: AircraftData = {
                            name: q,
                            description: '',
                            extract: '',
                            image: null,
                            thumbnail: null,
                            url: '',
                            categories: [],
                            airlineProfile: {
                                airlineName: q,
                                iataCode: null,
                                icaoCode: null,
                                callsign: null,
                                country: null,
                                headquarters: null,
                                founded: null,
                                website: null,
                                fleetSize: String(rows.length),
                                destinations: null,
                                hubs: null,
                                airlineType: null,
                                airlineStatus: null,
                                fleetAvgAge: null,
                            },
                            aircraftType: {
                                manufacturer: null,
                                model: null,
                                family: null,
                                role: null,
                                aircraftCategory: null,
                                lengthM: null,
                                wingspanM: null,
                                heightM: null,
                                mtowKg: null,
                                rangeKm: null,
                                cruiseSpeed: null,
                                maxSpeed: null,
                                typicalCapacity: null,
                                maxCapacity: null,
                                engines: null,
                                firstFlight: null,
                                introduction: null,
                                status: null,
                                numberBuilt: null,
                                unitCost: null,
                                crew: null,
                                ceiling: null,
                                primaryUser: null,
                            },
                            fleetComposition: {
                                totalInDatabase: rows.length,
                                sampleSize: rows.length,
                                byModel: fleetComposition,
                            },
                            individualAircraft: hasRegistrations
                                ? rows.map((row) => {
                                    const remark = (row.REMARK || '').toLowerCase();
                                    const status =
                                        remark.includes('historic') || remark.includes('retired')
                                            ? 'Historic'
                                            : 'Active';
                                    return {
                                        registration: row.REG || null,
                                        serialNumber: null,
                                        lineNumber: null,
                                        model: row['AIRCRAFT TYPE'] || null,
                                        iataType: null,
                                        productionLine: null,
                                        enginesCount: null,
                                        enginesType: null,
                                        firstFlightDate: null,
                                        deliveryDate: row.DELIVERED || null,
                                        aircraftAge: row.AGE || null,
                                        status,
                                        owner: null,
                                        icaoHex: null,
                                        testRegistration: null,
                                    };
                                })
                                : [],
                            dataSources: {
                                wikipedia: false,
                                aviationStack: false,
                                fleetDataCount: rows.length,
                            },
                        };

                        setAircraft(aircraftFromSheets);
                        setError('');
                    } else {
                        setError(j.error || fj.error || 'Not found');
                    }
                } catch {
                    setError(j.error || 'Not found');
                }
            }
        } catch {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    }

    function handleKey(e: React.KeyboardEvent) { if (e.key === 'Enter') search(query); }

    const hasFleet = aircraft && aircraft.fleetComposition?.byModel?.length > 0;
    const hasIndividual = aircraft && (
        (aircraft.individualAircraft?.length ?? 0) > 0 ||
        (sheetsFleetData?.length ?? 0) > 0
    );

    // Determine visible tabs based on available data
    const visibleTabs = TABS.filter(t => {
        if (t === 'Fleet') return hasFleet;
        if (t === 'Individual Aircraft') return hasIndividual;
        return true;
    });

    return (
        <div style={{ padding: '28px 24px', maxWidth: '1100px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '6px' }}>✈️ Aircraft Encyclopedia</h1>
                <p style={{ opacity: 0.5, fontSize: '0.9rem' }}>Search any aircraft or airline — powered by Wikipedia + AviationStack</p>
            </div>

            {/* Search */}
            <div style={{ maxWidth: '600px', margin: '0 auto 28px', display: 'flex', gap: '8px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '1.1rem', opacity: 0.4 }}>🔍</span>
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => {
                            const v = e.target.value;
                            setQuery(v);
                            if (v.trim() === '') {
                                // Reset back to the empty/home state
                                setAircraft(null);
                                setError('');
                                setSheetsFleetData(null);
                                setIndividualPage(1);
                                setIndividualSearch('');
                                setIndividualCategory('all');
                            }
                        }}
                        onKeyDown={handleKey}
                        placeholder='Try "Boeing 747", "IndiGo", "F-22 Raptor"...'
                        style={{
                            width: '100%', padding: '13px 40px 13px 44px',
                            borderRadius: '12px', fontSize: '0.95rem',
                            background: 'var(--bg-card, rgba(255,255,255,0.04))',
                            border: '1px solid var(--border-subtle, rgba(255,255,255,0.12))',
                            color: 'inherit', outline: 'none',
                        }}
                    />
                    {query.trim() !== '' && (
                        <button
                            type="button"
                            onClick={() => {
                                setQuery('');
                                setAircraft(null);
                                setError('');
                                setSheetsFleetData(null);
                                setIndividualPage(1);
                                setIndividualSearch('');
                                setIndividualCategory('all');
                            }}
                            style={{
                                position: 'absolute',
                                right: 10,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: 20,
                                height: 20,
                                borderRadius: '999px',
                                border: 'none',
                                background: 'rgba(148,163,184,0.2)',
                                color: 'inherit',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                            }}
                        >
                            ✕
                        </button>
                    )}
                </div>
                <button
                    onClick={() => search(query)}
                    disabled={loading}
                    style={{
                        padding: '0 24px', borderRadius: '12px', fontWeight: 700, fontSize: '0.9rem',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff',
                        border: 'none', cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1,
                    }}
                >{loading ? '...' : 'Search'}</button>
            </div>

            {/* Error */}
            {error && (
                <div style={{ textAlign: 'center', padding: '40px 20px', opacity: 0.6 }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🔍</div>
                    <p>{error}</p>
                </div>
            )}

            {/* Loading animation */}
            {loading && (
                <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                    <div
                        style={{ width: 'min(200px, 40vw)', height: 'min(200px, 40vw)' }}
                        dangerouslySetInnerHTML={{
                            __html:
                                '<dotlottie-wc src="https://lottie.host/28231d9e-8b90-44f2-9227-1f01d2966866/HasQXK9Rdv.lottie" style="width: 100%; height: 100%" autoplay loop></dotlottie-wc>',
                        }}
                    />
                </div>
            )}

            {/* Results */}
            {!loading && aircraft && (
                <div style={{ maxWidth: '960px', margin: '0 auto' }}>

                    {/* Hero card */}
                    <div style={{
                        background: 'var(--bg-card, rgba(255,255,255,0.03))',
                        border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                        borderRadius: '20px', overflow: 'hidden', marginBottom: '20px',
                    }}>
                        {/* Image */}
                        {aircraft.image && (
                            <div style={{
                                width: '100%', height: '320px', position: 'relative',
                                background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                overflow: 'hidden',
                            }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={aircraft.image} alt={aircraft.name} style={{
                                    maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto',
                                    objectFit: 'contain', display: 'block',
                                }} onError={e => { const p = (e.target as HTMLImageElement).parentElement; if (p) p.style.display = 'none'; }} />
                                <div style={{
                                    position: 'absolute', bottom: 0, left: 0, right: 0, height: '80px',
                                    background: 'linear-gradient(to bottom, transparent, var(--bg-card, rgba(15,15,20,1)))',
                                    pointerEvents: 'none',
                                }} />
                            </div>
                        )}

                        {/* Name & description */}
                        <div style={{ padding: '20px 28px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                <h2 style={{ fontSize: '1.9rem', fontWeight: 800, lineHeight: 1.1, margin: 0 }}>{aircraft.name}</h2>
                                {(aircraft.airlineProfile.airlineStatus || aircraft.aircraftType.status) && (
                                    <StatusBadge status={aircraft.airlineProfile.airlineStatus || aircraft.aircraftType.status || ''} />
                                )}
                            </div>
                            {aircraft.description && <p style={{ fontSize: '0.88rem', opacity: 0.5, fontStyle: 'italic', margin: '0 0 12px' }}>{aircraft.description}</p>}

                            {/* Quick badges */}
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                {aircraft.aircraftType.role && (
                                    <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600, background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
                                        ✈ {aircraft.aircraftType.role.substring(0, 60)}
                                    </span>
                                )}
                                {aircraft.aircraftType.aircraftCategory && (
                                    <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600, background: 'rgba(250,204,21,0.1)', color: '#facc15', border: '1px solid rgba(250,204,21,0.2)' }}>
                                        {aircraft.aircraftType.aircraftCategory}
                                    </span>
                                )}
                                {aircraft.airlineProfile.country && (
                                    <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600, background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}>
                                        🌍 {aircraft.airlineProfile.country.substring(0, 40)}
                                    </span>
                                )}
                            </div>

                            {/* Data sources */}
                            <div style={{ display: 'flex', gap: '6px' }}>
                                {aircraft.dataSources.wikipedia && (
                                    <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.65rem', fontWeight: 700, background: 'rgba(99,102,241,0.08)', color: '#818cf8' }}>📖 Wikipedia</span>
                                )}
                                {aircraft.dataSources.aviationStack && (
                                    <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.65rem', fontWeight: 700, background: 'rgba(52,211,153,0.08)', color: '#34d399' }}>
                                        ✈️ AviationStack {aircraft.dataSources.fleetDataCount > 0 ? `(${aircraft.dataSources.fleetDataCount} aircraft)` : ''}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Tab bar */}
                    <div style={{
                        display: 'flex', gap: '4px', marginBottom: '20px', padding: '4px',
                        background: 'var(--bg-card, rgba(255,255,255,0.03))',
                        borderRadius: '14px', border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                    }}>
                        {visibleTabs.map(t => (
                            <button key={t} onClick={() => setTab(t)} style={{
                                flex: 1, padding: '10px 16px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 600,
                                background: tab === t ? 'rgba(99,102,241,0.15)' : 'transparent',
                                color: tab === t ? '#818cf8' : 'inherit',
                                border: tab === t ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                                cursor: 'pointer', transition: 'all 0.2s',
                                opacity: tab === t ? 1 : 0.5,
                            }}>{t}</button>
                        ))}
                    </div>

                    {/* Tab content */}
                    <div style={{
                        background: 'var(--bg-card, rgba(255,255,255,0.03))',
                        border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                        borderRadius: '20px', padding: '24px 28px',
                    }}>

                        {/* ─── Overview Tab ──────────────────── */}
                        {tab === 'Overview' && (
                            <div>
                                {/* Airline Profile */}
                                {Object.values(aircraft.airlineProfile).some(v => v) && (
                                    <div style={{ marginBottom: '28px' }}>
                                        <SectionTitle icon="🏢" title="Airline Profile" />
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                                            <Fact icon="🏷️" label="IATA Code" value={aircraft.airlineProfile.iataCode} />
                                            <Fact icon="📡" label="ICAO Code" value={aircraft.airlineProfile.icaoCode} />
                                            <Fact icon="📞" label="Callsign" value={aircraft.airlineProfile.callsign} />
                                            <Fact icon="🌍" label="Country" value={aircraft.airlineProfile.country} />
                                            <Fact icon="🏢" label="Headquarters" value={aircraft.airlineProfile.headquarters} />
                                            <Fact icon="📅" label="Founded" value={aircraft.airlineProfile.founded} />
                                            <Fact icon="🌐" label="Website" value={aircraft.airlineProfile.website} />
                                            <Fact icon="✈️" label="Fleet Size" value={aircraft.airlineProfile.fleetSize} />
                                            <Fact icon="📊" label="Fleet Avg Age" value={aircraft.airlineProfile.fleetAvgAge} />
                                            <Fact icon="🗺️" label="Destinations" value={aircraft.airlineProfile.destinations} />
                                            <Fact icon="🛫" label="Hubs" value={aircraft.airlineProfile.hubs} />
                                            <Fact icon="🏷" label="Airline Type" value={aircraft.airlineProfile.airlineType} />
                                        </div>
                                    </div>
                                )}

                                {/* Key facts */}
                                <div style={{ marginBottom: '28px' }}>
                                    <SectionTitle icon="📋" title="Key Facts" />
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '10px' }}>
                                        <Fact icon="🏭" label="Manufacturer" value={aircraft.aircraftType.manufacturer} />
                                        <Fact icon="🗓️" label="First Flight" value={aircraft.aircraftType.firstFlight} />
                                        <Fact icon="📅" label="Introduced" value={aircraft.aircraftType.introduction} />
                                        <Fact icon="🔢" label="Units Built" value={aircraft.aircraftType.numberBuilt} />
                                        <Fact icon="👥" label="Crew" value={aircraft.aircraftType.crew} />
                                        <Fact icon="💰" label="Unit Cost" value={aircraft.aircraftType.unitCost} />
                                        <Fact icon="🪖" label="Primary Operators" value={aircraft.aircraftType.primaryUser} />
                                    </div>
                                </div>

                                {/* History */}
                                {aircraft.extract && (
                                    <div>
                                        <SectionTitle icon="📜" title="History" />
                                        <p style={{ fontSize: '0.9rem', lineHeight: 1.7, opacity: 0.75 }}>{aircraft.extract}</p>
                                        <a href={aircraft.url} target="_blank" rel="noopener noreferrer" style={{
                                            display: 'inline-block', marginTop: '10px', fontSize: '0.8rem', fontWeight: 600,
                                            color: '#818cf8', opacity: 0.6, textDecoration: 'none',
                                        }}>📚 Full article on Wikipedia ↗</a>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ─── Aircraft Specs Tab ────────────── */}
                        {tab === 'Aircraft Specs' && (
                            <div>
                                <SectionTitle icon="⚙️" title="Technical Specifications" />
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                                    <Fact icon="🏭" label="Manufacturer" value={aircraft.aircraftType.manufacturer} />
                                    <Fact icon="📦" label="Model" value={aircraft.aircraftType.model} />
                                    <Fact icon="👨‍👩‍👧‍👦" label="Family" value={aircraft.aircraftType.family} />
                                    <Fact icon="🏷" label="Category" value={aircraft.aircraftType.aircraftCategory} />
                                    <Fact icon="✈" label="Role" value={aircraft.aircraftType.role} />
                                    <Fact icon="📏" label="Length" value={aircraft.aircraftType.lengthM} />
                                    <Fact icon="🔛" label="Wingspan" value={aircraft.aircraftType.wingspanM} />
                                    <Fact icon="📐" label="Height" value={aircraft.aircraftType.heightM} />
                                    <Fact icon="⚖️" label="MTOW" value={aircraft.aircraftType.mtowKg} />
                                    <Fact icon="🛣️" label="Range" value={aircraft.aircraftType.rangeKm} />
                                    <Fact icon="💨" label="Cruise Speed" value={aircraft.aircraftType.cruiseSpeed} />
                                    <Fact icon="🚀" label="Max Speed" value={aircraft.aircraftType.maxSpeed} />
                                    <Fact icon="💺" label="Typical Capacity" value={aircraft.aircraftType.typicalCapacity} />
                                    <Fact icon="🔢" label="Max Capacity" value={aircraft.aircraftType.maxCapacity} />
                                    <Fact icon="🔧" label="Engines" value={aircraft.aircraftType.engines} />
                                    <Fact icon="⛰️" label="Service Ceiling" value={aircraft.aircraftType.ceiling} />
                                    <Fact icon="👥" label="Crew" value={aircraft.aircraftType.crew} />
                                    <Fact icon="🔢" label="Units Built" value={aircraft.aircraftType.numberBuilt} />
                                    <Fact icon="💰" label="Unit Cost" value={aircraft.aircraftType.unitCost} />
                                </div>
                            </div>
                        )}

                        {/* ─── Fleet Tab ─────────────────────── */}
                        {tab === 'Fleet' && hasFleet && (
                            <div>
                                <SectionTitle icon="🛩️" title={`Fleet Composition (${aircraft.fleetComposition.totalInDatabase} aircraft in database)`} />
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{
                                        width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem',
                                    }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid rgba(99,102,241,0.2)' }}>
                                                {['Model', 'Code', 'Total', 'Active', 'Stored', 'Engine Type'].map(h => (
                                                    <th key={h} style={{
                                                        padding: '10px 12px', textAlign: 'left', fontWeight: 700,
                                                        fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.6,
                                                    }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {aircraft.fleetComposition.byModel.map((fm, i) => (
                                                <tr key={i} style={{
                                                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                                                }}>
                                                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{fm.model}</td>
                                                    <td style={{ padding: '10px 12px', opacity: 0.7, fontFamily: 'monospace' }}>{fm.modelCode}</td>
                                                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>{fm.total}</td>
                                                    <td style={{ padding: '10px 12px', color: '#34d399', fontWeight: 600 }}>{fm.active}</td>
                                                    <td style={{ padding: '10px 12px', color: fm.stored > 0 ? '#f87171' : '#34d399', fontWeight: 600 }}>{fm.stored}</td>
                                                    <td style={{ padding: '10px 12px', opacity: 0.7 }}>{fm.engineType}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* ─── Individual Aircraft Tab ────────── */}
                        {tab === 'Individual Aircraft' && hasIndividual && (
                            <div>
                                {(() => {
                                    const perPage = 20;
                                    const searchTerm = individualSearch.trim().toLowerCase();
                                    const useSheetsFleet = (sheetsFleetData?.length ?? 0) > 0;

                                    const baseList = useSheetsFleet
                                        ? (sheetsFleetData || [])
                                        : (aircraft.individualAircraft || []);

                                    const categoryFiltered = useSheetsFleet && Array.isArray(baseList)
                                        ? (baseList as FleetCsvRow[]).filter((p) => {
                                            const cat = (p.__category || '').toLowerCase();
                                            if (individualCategory === 'all') return true;
                                            if (individualCategory === 'current') return cat === 'current' || cat === '' || cat === 'other';
                                            if (individualCategory === 'historic') return cat === 'historic';
                                            if (individualCategory === 'special') return cat === 'special';
                                            return true;
                                        })
                                        : baseList;

                                    const filtered = useSheetsFleet
                                        ? (searchTerm
                                            ? (categoryFiltered as FleetCsvRow[]).filter((p) => (p.REG || '').toLowerCase().includes(searchTerm))
                                            : (categoryFiltered as FleetCsvRow[]))
                                        : (searchTerm
                                            ? (baseList as { registration?: string | null }[]).filter((p) => (p.registration || '').toLowerCase().includes(searchTerm))
                                            : (baseList as { registration?: string | null }[]));

                                    const total = filtered.length;
                                    const sheetColumns = [
                                        { id: 'REG', label: 'REG', accessor: (row: FleetCsvRow) => row.REG || '' },
                                        { id: 'AIRCRAFT TYPE', label: 'AIRCRAFT TYPE', accessor: (row: FleetCsvRow) => row['AIRCRAFT TYPE'] || '' },
                                        { id: 'CONFIG', label: 'CONFIG', accessor: (row: FleetCsvRow) => row.CONFIG || '' },
                                        { id: 'DELIVERED', label: 'DELIVERED', accessor: (row: FleetCsvRow) => row.DELIVERED || '' },
                                        { id: 'EXIT DATE', label: 'EXIT DATE', accessor: (row: FleetCsvRow) => row['EXIT DATE'] || '' },
                                        {
                                            id: 'REMARK',
                                            label: 'REMARK',
                                            accessor: (row: FleetCsvRow) => row.REMARK || row['STATUS / FATE'] || '',
                                        },
                                        { id: 'AIRCRAFT NAME', label: 'AIRCRAFT NAME', accessor: (row: FleetCsvRow) => row['AIRCRAFT NAME'] || '' },
                                        { id: 'AGE', label: 'AGE', accessor: (row: FleetCsvRow) => row.AGE || '' },
                                    ] as const;

                                    const activeSheetColumns = useSheetsFleet
                                        ? sheetColumns.filter(col => {
                                            if (col.id === 'REG') return true;
                                            return (filtered as FleetCsvRow[]).some((row) => (col.accessor(row) || '').trim().length > 0);
                                        })
                                        : [];
                                    const totalPages = Math.max(1, Math.ceil(total / perPage));
                                    const currentPage = Math.min(individualPage, totalPages);
                                    const start = (currentPage - 1) * perPage;
                                    const visible = filtered.slice(start, start + perPage);

                                    const totalLabel = useSheetsFleet ? total : (aircraft.fleetComposition?.totalInDatabase ?? total);
                                    const pageNumbers: number[] = [];
                                    const maxButtons = 7;
                                    if (totalPages <= maxButtons) {
                                        for (let p = 1; p <= totalPages; p++) pageNumbers.push(p);
                                    } else {
                                        const half = Math.floor(maxButtons / 2);
                                        let low = Math.max(1, currentPage - half);
                                        let high = Math.min(totalPages, low + maxButtons - 1);
                                        if (high - low + 1 < maxButtons) low = Math.max(1, high - maxButtons + 1);
                                        for (let p = low; p <= high; p++) pageNumbers.push(p);
                                    }

                                    return (
                                        <>
                                            <SectionTitle
                                                icon="📋"
                                                title={`Individual Aircraft (showing ${
                                                    total === 0 ? 0 : Math.min(start + visible.length, total)
                                                } of ${totalLabel}${searchTerm ? ' — filtered by registration' : ''}${useSheetsFleet ? ` — ${airlineSearchName} Fleet (Sheets)` : ''}`}
                                            />
                                            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                                {useSheetsFleet && (
                                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                        {[
                                                            { id: 'all', label: 'All' },
                                                            { id: 'current', label: 'Current' },
                                                            { id: 'historic', label: 'Historic' },
                                                            { id: 'special', label: 'Special' },
                                                        ].map(opt => (
                                                            <button
                                                                key={opt.id}
                                                                type="button"
                                                                onClick={() => { setIndividualCategory(opt.id as any); setIndividualPage(1); }}
                                                                style={{
                                                                    padding: '4px 10px',
                                                                    borderRadius: '999px',
                                                                    border: individualCategory === opt.id ? '1px solid #6366f1' : '1px solid var(--border-subtle, rgba(255,255,255,0.18))',
                                                                    background: individualCategory === opt.id ? 'rgba(99,102,241,0.18)' : 'var(--bg-card, rgba(15,23,42,0.7))',
                                                                    color: 'inherit',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: 600,
                                                                    cursor: 'pointer',
                                                                }}
                                                            >
                                                                {opt.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                                <input
                                                    value={individualSearch}
                                                    onChange={e => { setIndividualSearch(e.target.value); setIndividualPage(1); }}
                                                    placeholder="Search by registration (e.g. VT-ALF)"
                                                    style={{
                                                        flex: '1 1 200px',
                                                        minWidth: '0',
                                                        maxWidth: '280px',
                                                        padding: '8px 12px',
                                                        borderRadius: '8px',
                                                        border: '1px solid var(--border-subtle, rgba(255,255,255,0.12))',
                                                        background: 'var(--bg-card, rgba(15,23,42,0.7))',
                                                        color: 'inherit',
                                                        fontSize: '0.85rem',
                                                        outline: 'none',
                                                    }}
                                                />
                                            </div>

                                            <div style={{ overflowX: 'auto' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                                    <thead>
                                                        <tr style={{ borderBottom: '2px solid rgba(99,102,241,0.2)' }}>
                                                            {useSheetsFleet
                                                                ? activeSheetColumns.map(col => (
                                                                    <th
                                                                        key={col.id}
                                                                        style={{
                                                                            padding: '10px 12px',
                                                                            textAlign: 'left',
                                                                            fontWeight: 700,
                                                                            fontSize: '0.7rem',
                                                                            textTransform: 'uppercase',
                                                                            letterSpacing: '0.06em',
                                                                            opacity: 0.6,
                                                                            whiteSpace: 'nowrap',
                                                                        }}
                                                                    >
                                                                        {col.label}
                                                                    </th>
                                                                ))
                                                                : ['Reg.', 'MSN', 'Model', 'Engines', 'Delivery', 'Age', 'Status'].map(h => (
                                                                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.6, whiteSpace: 'nowrap' }}>{h}</th>
                                                                ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {useSheetsFleet
                                                            ? (visible as FleetCsvRow[]).map((row, i) => (
                                                                <tr key={`${(row.REG || '')}-${i}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                                                                    {activeSheetColumns.map(col => {
                                                                        const rawValue = col.accessor(row);
                                                                        const value = rawValue && rawValue.trim().length > 0 ? rawValue : '—';
                                                                        const isReg = col.id === 'REG';

                                                                        if (isReg) {
                                                                            const reg = row.REG || '';
                                                                            return (
                                                                                <td
                                                                                    key={col.id}
                                                                                    style={{
                                                                                        padding: '10px 12px',
                                                                                        fontWeight: 700,
                                                                                        fontFamily: 'monospace',
                                                                                        color: '#818cf8',
                                                                                    }}
                                                                                >
                                                                                    {reg ? (
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => { setQuery(reg); search(reg); }}
                                                                                            style={{
                                                                                                background: 'transparent',
                                                                                                border: 'none',
                                                                                                padding: 0,
                                                                                                margin: 0,
                                                                                                color: 'inherit',
                                                                                                cursor: 'pointer',
                                                                                                textDecoration: 'underline',
                                                                                                textUnderlineOffset: '2px',
                                                                                            }}
                                                                                        >
                                                                                            {reg}
                                                                                        </button>
                                                                                    ) : '—'}
                                                                                </td>
                                                                            );
                                                                        }

                                                                        return (
                                                                            <td
                                                                                key={col.id}
                                                                                style={{
                                                                                    padding: '10px 12px',
                                                                                    fontWeight: col.id === 'CONFIG' ? 500 : 400,
                                                                                    fontFamily: col.id === 'CONFIG' ? 'monospace' : 'inherit',
                                                                                    opacity: col.id === 'AIRCRAFT NAME' || col.id === 'AGE' || col.id === 'REMARK' || col.id === 'DELIVERED' || col.id === 'EXIT DATE' ? 0.85 : 1,
                                                                                    whiteSpace: col.id === 'DELIVERED' || col.id === 'EXIT DATE' ? 'nowrap' : 'normal',
                                                                                }}
                                                                            >
                                                                                {value}
                                                                            </td>
                                                                        );
                                                                    })}
                                                                </tr>
                                                            ))
                                                            : visible.map((plane: { registration?: string | null; serialNumber?: string | null; model?: string | null; iataType?: string | null; enginesCount?: string | null; enginesType?: string | null; deliveryDate?: string | null; aircraftAge?: string | null; status?: string | null }, i: number) => (
                                                                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                                                                    <td style={{ padding: '10px 12px', fontWeight: 700, fontFamily: 'monospace', color: '#818cf8' }}>
                                                                        {plane.registration ? (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => { setQuery(plane.registration || ''); search(plane.registration || ''); }}
                                                                                style={{
                                                                                    background: 'transparent',
                                                                                    border: 'none',
                                                                                    padding: 0,
                                                                                    margin: 0,
                                                                                    color: 'inherit',
                                                                                    cursor: 'pointer',
                                                                                    textDecoration: 'underline',
                                                                                    textUnderlineOffset: '2px',
                                                                                }}
                                                                            >
                                                                                {plane.registration}
                                                                            </button>
                                                                        ) : '—'}
                                                                    </td>
                                                                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', opacity: 0.8 }}>{plane.serialNumber || '—'}</td>
                                                                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>{plane.model || plane.iataType || '—'}</td>
                                                                    <td style={{ padding: '10px 12px', opacity: 0.7 }}>{plane.enginesCount ? `${plane.enginesCount}× ${plane.enginesType || ''}` : '—'}</td>
                                                                    <td style={{ padding: '10px 12px', opacity: 0.7, whiteSpace: 'nowrap' }}>{plane.deliveryDate || '—'}</td>
                                                                    <td style={{ padding: '10px 12px', opacity: 0.7 }}>{plane.aircraftAge || '—'}</td>
                                                                    <td style={{ padding: '10px 12px' }}>{plane.status ? <StatusBadge status={plane.status} /> : '—'}</td>
                                                                </tr>
                                                            ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                <button
                                                    onClick={() => setIndividualPage(p => Math.max(1, p - 1))}
                                                    disabled={currentPage === 1}
                                                    style={{
                                                        padding: '8px 14px',
                                                        borderRadius: '8px',
                                                        border: '1px solid var(--border-subtle, rgba(255,255,255,0.2))',
                                                        background: currentPage === 1 ? 'transparent' : 'var(--bg-card, rgba(15,23,42,0.8))',
                                                        color: 'inherit',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 600,
                                                        opacity: currentPage === 1 ? 0.4 : 1,
                                                        cursor: currentPage === 1 ? 'default' : 'pointer',
                                                    }}
                                                >
                                                    &lt; PREVIOUS PAGE
                                                </button>
                                                {pageNumbers.map((p) => (
                                                    <button
                                                        key={p}
                                                        onClick={() => setIndividualPage(p)}
                                                        style={{
                                                            minWidth: '36px',
                                                            padding: '8px 10px',
                                                            borderRadius: '8px',
                                                            border: p === currentPage ? '2px solid #6366f1' : '1px solid var(--border-subtle, rgba(255,255,255,0.2))',
                                                            background: p === currentPage ? 'rgba(99,102,241,0.2)' : 'var(--bg-card, rgba(15,23,42,0.6))',
                                                            color: 'inherit',
                                                            fontSize: '0.85rem',
                                                            fontWeight: p === currentPage ? 700 : 500,
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        {p}
                                                    </button>
                                                ))}
                                                <button
                                                    onClick={() => setIndividualPage(prev => Math.min(totalPages, prev + 1))}
                                                    disabled={currentPage === totalPages}
                                                    style={{
                                                        padding: '8px 14px',
                                                        borderRadius: '8px',
                                                        border: '1px solid var(--border-subtle, rgba(255,255,255,0.2))',
                                                        background: currentPage === totalPages ? 'transparent' : 'var(--bg-card, rgba(15,23,42,0.8))',
                                                        color: 'inherit',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 600,
                                                        opacity: currentPage === totalPages ? 0.4 : 1,
                                                        cursor: currentPage === totalPages ? 'default' : 'pointer',
                                                    }}
                                                >
                                                    NEXT PAGE &gt;
                                                </button>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        )}
                    </div>

                    {/* Categories */}
                    {aircraft.categories.length > 0 && (
                        <div style={{
                            marginTop: '16px', padding: '14px 24px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center',
                            background: 'var(--bg-card, rgba(255,255,255,0.03))',
                            border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                            borderRadius: '14px',
                        }}>
                            <span style={{ fontSize: '0.72rem', opacity: 0.4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tags</span>
                            {aircraft.categories.map((cat, i) => (
                                <span key={i} style={{
                                    padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 500,
                                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                                }}>{cat}</span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Popular aircraft grid */}
            {!loading && !aircraft && !error && (
                <div style={{ maxWidth: '700px', margin: '0 auto' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, opacity: 0.4, textAlign: 'center', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Popular Searches
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
                        {POPULAR.map(item => (
                            <button
                                key={item.name}
                                onClick={() => { setQuery(item.name); search(item.name); }}
                                style={{
                                    padding: '16px 12px', borderRadius: '14px', cursor: 'pointer',
                                    background: 'var(--bg-card, rgba(255,255,255,0.03))',
                                    border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                                    color: 'inherit', textAlign: 'center', transition: 'all 0.2s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                            >
                                <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>{item.emoji}</div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>{item.name}</div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.4, marginTop: '3px' }}>{item.desc}</div>
                            </button>
                        ))}
                    </div>

                    <div style={{
                        marginTop: '24px', padding: '14px 20px', borderRadius: '12px',
                        background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.1)',
                        display: 'flex', alignItems: 'flex-start', gap: '10px',
                    }}>
                        <span style={{ fontSize: '1rem' }}>💡</span>
                        <div style={{ fontSize: '0.8rem', opacity: 0.6, lineHeight: 1.5 }}>
                            Search aircraft (<em>Boeing 747</em>, <em>F-22 Raptor</em>) or airlines (<em>IndiGo</em>, <em>Emirates</em>).
                            Data sourced from <strong>Wikipedia</strong> + <strong>AviationStack API</strong>.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
