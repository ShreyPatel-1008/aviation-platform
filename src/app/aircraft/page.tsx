'use client';

import { useState, useRef } from 'react';

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
    const inputRef = useRef<HTMLInputElement>(null);

    async function search(term: string) {
        const q = term.trim();
        if (!q) return;
        setLoading(true); setError(''); setAircraft(null); setTab('Overview');
        try {
            const r = await fetch(`/api/aircraft?name=${encodeURIComponent(q)}`);
            const j = await r.json();
            if (j.success) setAircraft(j.aircraft);
            else setError(j.error || 'Not found');
        } catch { setError('Network error'); }
        setLoading(false);
    }

    function handleKey(e: React.KeyboardEvent) { if (e.key === 'Enter') search(query); }

    const hasFleet = aircraft && aircraft.fleetComposition?.byModel?.length > 0;
    const hasIndividual = aircraft && aircraft.individualAircraft?.length > 0;

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
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKey}
                        placeholder='Try "Boeing 747", "IndiGo", "F-22 Raptor"...'
                        style={{
                            width: '100%', padding: '13px 14px 13px 44px',
                            borderRadius: '12px', fontSize: '0.95rem',
                            background: 'var(--bg-card, rgba(255,255,255,0.04))',
                            border: '1px solid var(--border-subtle, rgba(255,255,255,0.12))',
                            color: 'inherit', outline: 'none',
                        }}
                    />
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

            {/* Loading skeleton */}
            {loading && (
                <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                    {[320, 200, 160].map((h, i) => (
                        <div key={i} style={{
                            height: h, borderRadius: '16px', marginBottom: '16px',
                            background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%)',
                            animation: 'pulse 1.5s ease-in-out infinite',
                        }} />
                    ))}
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
                                <SectionTitle icon="📋" title={`Individual Aircraft (showing ${aircraft.individualAircraft.length} of ${aircraft.fleetComposition.totalInDatabase})`} />
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{
                                        width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem',
                                    }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid rgba(99,102,241,0.2)' }}>
                                                {['Reg.', 'MSN', 'Model', 'Engines', 'Delivery', 'Age', 'Status'].map(h => (
                                                    <th key={h} style={{
                                                        padding: '10px 12px', textAlign: 'left', fontWeight: 700,
                                                        fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.6,
                                                        whiteSpace: 'nowrap',
                                                    }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {aircraft.individualAircraft.map((plane, i) => (
                                                <tr key={i} style={{
                                                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                                                }}>
                                                    <td style={{ padding: '10px 12px', fontWeight: 700, fontFamily: 'monospace', color: '#818cf8' }}>{plane.registration || '—'}</td>
                                                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', opacity: 0.8 }}>{plane.serialNumber || '—'}</td>
                                                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>{plane.model || plane.iataType || '—'}</td>
                                                    <td style={{ padding: '10px 12px', opacity: 0.7 }}>{plane.enginesCount ? `${plane.enginesCount}× ${plane.enginesType || ''}` : '—'}</td>
                                                    <td style={{ padding: '10px 12px', opacity: 0.7, whiteSpace: 'nowrap' }}>{plane.deliveryDate || '—'}</td>
                                                    <td style={{ padding: '10px 12px', opacity: 0.7 }}>{plane.aircraftAge || '—'}</td>
                                                    <td style={{ padding: '10px 12px' }}>
                                                        {plane.status ? <StatusBadge status={plane.status} /> : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
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
