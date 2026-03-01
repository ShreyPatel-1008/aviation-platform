'use client';

import { useState, useEffect, useMemo } from 'react';

type FleetRow = {
    REG: string;
    'AIRCRAFT TYPE': string;
    CONFIG: string;
    DELIVERED: string;
    REMARK: string;
    AGE: string;
};

type TabId = 'current' | 'historic' | 'special';

const TABS: { id: TabId; label: string }[] = [
    { id: 'current', label: 'CURRENT FLEET' },
    { id: 'historic', label: 'HISTORIC FLEET' },
    { id: 'special', label: 'SPECIAL COLORS / STICKERS' },
];

const COLUMNS: { key: keyof FleetRow | 'AIRCRAFT NAME'; label: string }[] = [
    { key: 'REG', label: 'REG' },
    { key: 'AIRCRAFT TYPE', label: 'AIRCRAFT TYPE' },
    { key: 'CONFIG', label: 'CONFIG' },
    { key: 'DELIVERED', label: 'DELIVERED' },
    { key: 'REMARK', label: 'REMARK' },
    { key: 'AIRCRAFT NAME', label: 'AIRCRAFT NAME' },
    { key: 'AGE', label: 'AGE' },
];

export default function IndiGoFleetPage() {
    const [data, setData] = useState<FleetRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [tab, setTab] = useState<TabId>('current');
    const [sortKey, setSortKey] = useState<keyof FleetRow | 'AIRCRAFT NAME'>('REG');
    const [sortAsc, setSortAsc] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError('');
        fetch('/api/fleet?airline=IndiGo')
            .then((r) => r.json())
            .then((j) => {
                if (cancelled) return;
                if (j.success) setData(j.data || []);
                else setError(j.error || 'Failed to load');
            })
            .catch(() => { if (!cancelled) setError('Network error'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const filteredData = useMemo(() => {
        if (tab === 'current') return data;
        if (tab === 'historic') return data.filter((r) => (r.REMARK || '').toLowerCase().includes('historic') || (r.REMARK || '').toLowerCase().includes('retired'));
        if (tab === 'special') return data.filter((r) => (r.REMARK || '').toLowerCase().includes('special') || (r.REMARK || '').toLowerCase().includes('sticker'));
        return data;
    }, [data, tab]);

    const sortedData = useMemo(() => {
        const key = sortKey;
        const asc = sortAsc;
        return [...filteredData].sort((a, b) => {
            const aVal = key === 'AIRCRAFT NAME' ? '' : (a[key] || '');
            const bVal = key === 'AIRCRAFT NAME' ? '' : (b[key] || '');
            const cmp = aVal.localeCompare(bVal, undefined, { numeric: true });
            return asc ? cmp : -cmp;
        });
    }, [filteredData, sortKey, sortAsc]);

    const handleSort = (key: keyof FleetRow | 'AIRCRAFT NAME') => {
        if (sortKey === key) setSortAsc((a) => !a);
        else { setSortKey(key); setSortAsc(true); }
    };

    return (
        <div style={{ padding: '28px 24px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '4px' }}>IndiGo Fleet List</h1>
                <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>Fleet data from Sheets/IndiGo</p>
            </div>

            <div style={{
                display: 'flex',
                gap: '4px',
                borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.12))',
                marginBottom: '20px',
            }}>
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        style={{
                            padding: '12px 20px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            letterSpacing: '0.06em',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: tab === t.id ? '3px solid #3b82f6' : '3px solid transparent',
                            color: tab === t.id ? '#93c5fd' : 'var(--text-secondary, #94a3b8)',
                            cursor: 'pointer',
                        }}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {loading && (
                <div style={{ textAlign: 'center', padding: '48px', opacity: 0.7 }}>Loading fleet data...</div>
            )}
            {error && (
                <div style={{ textAlign: 'center', padding: '48px', color: 'var(--accent-red, #ef4444)' }}>{error}</div>
            )}

            {!loading && !error && (
                <div style={{ overflowX: 'auto', background: 'var(--bg-card, rgba(255,255,255,0.03))', border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))', borderRadius: '12px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid rgba(99,102,241,0.25)' }}>
                                <th style={{ width: '40px', padding: '12px 8px' }} />
                                {COLUMNS.map((col) => (
                                    <th
                                        key={col.key}
                                        onClick={() => handleSort(col.key)}
                                        style={{
                                            padding: '12px 14px',
                                            textAlign: 'left',
                                            fontWeight: 700,
                                            fontSize: '0.72rem',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            opacity: 0.85,
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {col.label}
                                        <span style={{ marginLeft: '4px', opacity: 0.6 }}>
                                            {sortKey === col.key ? (sortAsc ? '↑' : '↓') : '↕'}
                                        </span>
                                    </th>
                                ))}
                                <th style={{ width: '36px', padding: '12px 8px' }} />
                            </tr>
                        </thead>
                        <tbody>
                            {sortedData.map((row, i) => (
                                <tr
                                    key={`${row.REG}-${i}`}
                                    style={{
                                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                                        background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                                    }}
                                >
                                    <td style={{ padding: '10px 8px', textAlign: 'center', opacity: 0.6 }} title="View">
                                        <span style={{ cursor: 'pointer' }}>🖼️</span>
                                    </td>
                                    <td style={{ padding: '10px 14px', fontWeight: 600, fontFamily: 'monospace', color: '#93c5fd' }}>
                                        {row.REG || '—'}
                                    </td>
                                    <td style={{ padding: '10px 14px' }}>{row['AIRCRAFT TYPE'] || '—'}</td>
                                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', opacity: 0.9 }}>{row.CONFIG || '—'}</td>
                                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>{row.DELIVERED || '—'}</td>
                                    <td style={{ padding: '10px 14px', opacity: 0.85 }}>{row.REMARK || '—'}</td>
                                    <td style={{ padding: '10px 14px', opacity: 0.5 }}>{'—'}</td>
                                    <td style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {row.AGE || '—'}
                                        <span style={{ opacity: 0.5, cursor: 'pointer' }} title="Edit">✏️</span>
                                    </td>
                                    <td style={{ padding: '10px 8px' }} />
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {sortedData.length === 0 && (
                        <div style={{ padding: '32px', textAlign: 'center', opacity: 0.6 }}>
                            No aircraft in this tab.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
