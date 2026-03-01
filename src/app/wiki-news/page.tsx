'use client';

import { useState, useEffect, useCallback } from 'react';
import LoadingAnimation from '@/components/LoadingAnimation';

interface WikiNewsEntry {
    date: string;
    headline: string;
    description: string;
    wikipediaUrl: string;
    category: string;
    matchedKeywords: string[];
}

interface WikiNewsResponse {
    success: boolean;
    source?: string;
    month?: string;
    totalEntries?: number;
    entries?: WikiNewsEntry[];
    error?: string;
}

const categoryStyles: Record<string, { bg: string; color: string; border: string; label: string; icon: string }> = {
    ACCIDENT: {
        bg: 'rgba(239, 68, 68, 0.15)',
        color: '#fca5a5',
        border: 'rgba(239, 68, 68, 0.25)',
        label: 'Accident',
        icon: '🔴',
    },
    TRADE: {
        bg: 'rgba(16, 185, 129, 0.15)',
        color: '#6ee7b7',
        border: 'rgba(16, 185, 129, 0.25)',
        label: 'Trade',
        icon: '💼',
    },
    REGULATION: {
        bg: 'rgba(139, 92, 246, 0.15)',
        color: '#c4b5fd',
        border: 'rgba(139, 92, 246, 0.25)',
        label: 'Regulation',
        icon: '📜',
    },
    MILITARY: {
        bg: 'rgba(249, 115, 22, 0.15)',
        color: '#fdba74',
        border: 'rgba(249, 115, 22, 0.25)',
        label: 'Military',
        icon: '🎖️',
    },
    GENERAL: {
        bg: 'rgba(100, 116, 139, 0.15)',
        color: '#94a3b8',
        border: 'rgba(100, 116, 139, 0.25)',
        label: 'General',
        icon: '📰',
    },
};

export default function WikiNewsPage() {
    const [data, setData] = useState<WikiNewsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filterCategory, setFilterCategory] = useState<string>('ALL');

    const fetchNews = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const res = await fetch('/api/wiki-news');
            const json = await res.json();
            setData(json);
        } catch (error) {
            console.error('Failed to fetch Wikipedia news:', error);
            setData({ success: false, error: 'Failed to connect to API' });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchNews();
    }, [fetchNews]);

    // Group entries by date
    const groupedEntries: Record<string, WikiNewsEntry[]> = {};
    const entries = data?.entries || [];
    const filteredEntries = filterCategory === 'ALL'
        ? entries
        : entries.filter(e => e.category === filterCategory);

    for (const entry of filteredEntries) {
        if (!groupedEntries[entry.date]) groupedEntries[entry.date] = [];
        groupedEntries[entry.date].push(entry);
    }

    // Count by category
    const categoryCounts: Record<string, number> = {};
    for (const entry of entries) {
        categoryCounts[entry.category] = (categoryCounts[entry.category] || 0) + 1;
    }

    if (loading) {
        return <LoadingAnimation message="Fetching aviation news from Wikipedia..." fullScreen />;
    }

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>Wikipedia Aviation News</h1>
                    <p>
                        Aviation-related events from Wikipedia&apos;s Current Events portal
                        {data?.month && <span style={{ opacity: 0.7 }}> — {data.month}</span>}
                    </p>
                </div>
                <button
                    className={`btn btn-primary ${refreshing ? 'ingesting' : ''}`}
                    onClick={() => fetchNews(true)}
                    disabled={refreshing}
                >
                    <span className="btn-icon">{refreshing ? '⟳' : '🔄'}</span>
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {/* Stats Bar */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <div
                    style={{
                        padding: '10px 18px', borderRadius: '12px',
                        background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)',
                        display: 'flex', alignItems: 'center', gap: '8px',
                    }}
                >
                    <span style={{ fontSize: '1.3rem', fontWeight: 700 }}>{data?.totalEntries || 0}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Aviation Entries Found</span>
                </div>
                {data?.source && (
                    <div
                        style={{
                            padding: '10px 18px', borderRadius: '12px',
                            background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.15)',
                            display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem',
                            color: 'var(--text-secondary)',
                        }}
                    >
                        📖 Source: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{data.source}</span>
                    </div>
                )}
            </div>

            {/* Category Filter Chips */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <button
                    onClick={() => setFilterCategory('ALL')}
                    style={{
                        padding: '6px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                        fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit',
                        background: filterCategory === 'ALL' ? 'var(--gradient-blue)' : 'var(--bg-glass)',
                        color: filterCategory === 'ALL' ? 'white' : 'var(--text-secondary)',
                        transition: 'all 0.2s ease',
                    }}
                >
                    All ({entries.length})
                </button>
                {Object.entries(categoryCounts).map(([cat, count]) => {
                    const style = categoryStyles[cat] || categoryStyles.GENERAL;
                    return (
                        <button
                            key={cat}
                            onClick={() => setFilterCategory(cat)}
                            style={{
                                padding: '6px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                                fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit',
                                background: filterCategory === cat ? style.bg : 'var(--bg-glass)',
                                color: filterCategory === cat ? style.color : 'var(--text-secondary)',
                                borderWidth: '1px', borderStyle: 'solid',
                                borderColor: filterCategory === cat ? style.border : 'transparent',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            {style.icon} {style.label} ({count})
                        </button>
                    );
                })}
            </div>

            {/* Timeline */}
            {Object.keys(groupedEntries).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    {Object.entries(groupedEntries).map(([date, dateEntries]) => (
                        <div key={date}>
                            {/* Date Header */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px',
                            }}>
                                <div style={{
                                    width: '12px', height: '12px', borderRadius: '50%',
                                    background: 'var(--gradient-blue)',
                                    boxShadow: '0 0 12px rgba(59, 130, 246, 0.4)',
                                    flexShrink: 0,
                                }} />
                                <h2 style={{
                                    fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)',
                                    letterSpacing: '-0.01em',
                                }}>
                                    {date}
                                </h2>
                                <div style={{
                                    flex: 1, height: '1px',
                                    background: 'linear-gradient(to right, var(--border-medium), transparent)',
                                }} />
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {dateEntries.length} {dateEntries.length === 1 ? 'entry' : 'entries'}
                                </span>
                            </div>

                            {/* Entry Cards */}
                            <div style={{
                                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
                                gap: '16px', paddingLeft: '24px',
                                borderLeft: '2px solid var(--border-subtle)',
                                marginLeft: '5px',
                            }}>
                                {dateEntries.map((entry, i) => {
                                    const catStyle = categoryStyles[entry.category] || categoryStyles.GENERAL;
                                    return (
                                        <a
                                            key={i}
                                            href={entry.wikipediaUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                display: 'block', textDecoration: 'none', color: 'inherit',
                                                background: 'var(--bg-card)',
                                                border: '1px solid var(--border-subtle)',
                                                borderRadius: 'var(--radius-lg)',
                                                padding: '20px',
                                                transition: 'all 0.3s ease',
                                                cursor: 'pointer',
                                            }}
                                            onMouseEnter={e => {
                                                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-glow)';
                                                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                                                (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-glow-blue)';
                                            }}
                                            onMouseLeave={e => {
                                                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)';
                                                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                                                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                                            }}
                                        >
                                            {/* Category Badge */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                                                    padding: '3px 10px', borderRadius: '20px',
                                                    fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase',
                                                    letterSpacing: '0.05em',
                                                    background: catStyle.bg, color: catStyle.color,
                                                    border: `1px solid ${catStyle.border}`,
                                                }}>
                                                    {catStyle.icon} {catStyle.label}
                                                </span>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    🔗 Wikipedia
                                                </span>
                                            </div>

                                            {/* Headline */}
                                            <h3 style={{
                                                fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.5,
                                                marginBottom: entry.description ? '8px' : '12px',
                                                color: 'var(--text-primary)',
                                            }}>
                                                {entry.headline}
                                            </h3>

                                            {/* Description */}
                                            {entry.description && (
                                                <p style={{
                                                    fontSize: '0.83rem', lineHeight: 1.6,
                                                    color: 'var(--text-secondary)',
                                                    marginBottom: '12px',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 3,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                }}>
                                                    {entry.description}
                                                </p>
                                            )}

                                            {/* Keyword Tags */}
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                {entry.matchedKeywords.map((kw, j) => (
                                                    <span key={j} className="tag">
                                                        {kw}
                                                    </span>
                                                ))}
                                            </div>
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <div className="empty-icon">🌍</div>
                    <h3>No aviation news found</h3>
                    <p>
                        No aviation-related entries were found in Wikipedia&apos;s Current Events for this month.
                        Try refreshing or check back later.
                    </p>
                </div>
            )}
        </div>
    );
}
