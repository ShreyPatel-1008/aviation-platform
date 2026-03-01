'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import LoadingAnimation from '@/components/LoadingAnimation';

interface AccidentArticle {
    id: string;
    title: string;
    summary: string;
    severity: string;
    confidence: number;
    source: string;
    published_date: string | null;
    tags: string[];
    entities: Record<string, string | null>;
    url: string;
    imageUrl: string | null;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
}

const AUTO_REFRESH_MS = 5 * 60 * 1000; // 5 minutes

export default function AccidentsPage() {
    const [articles, setArticles] = useState<AccidentArticle[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [loading, setLoading] = useState(true);
    const [ingesting, setIngesting] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const [countdown, setCountdown] = useState(AUTO_REFRESH_MS / 1000);

    const [pipelineStatus, setPipelineStatus] = useState('');
    const [searchFetchResults, setSearchFetchResults] = useState<AccidentArticle[] | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const hasInitialFetch = useRef(false);

    // Fetch articles from the API (read-only, fast)
    const fetchArticles = useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const params = new URLSearchParams({ page: page.toString(), limit: '15' });
            if (search) params.set('search', search);
            const res = await fetch(`/api/articles/accidents?${params}`);
            const data = await res.json();
            if (data.success) {
                setArticles(data.data);
                setPagination(data.pagination);
            }
            setLastRefresh(new Date());
            setCountdown(AUTO_REFRESH_MS / 1000);
        } catch (error) {
            console.error('Failed to fetch:', error);
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    // Trigger ingestion pipeline (fetches fresh data from RSS/GNews + classifies with AI)
    const runIngestion = useCallback(async () => {
        setIngesting(true);
        setPipelineStatus('Fetching from RSS & GNews...');
        try {
            const res = await fetch('/api/ingest', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                const r = data.result;
                setPipelineStatus(`✅ ${r.classified} new articles classified`);
            } else {
                setPipelineStatus(data.error === 'Pipeline is already running' ? '⏳ Pipeline already running...' : '');
            }
        } catch {
            setPipelineStatus('');
        } finally {
            setIngesting(false);
        }
    }, []);

    // Targeted search fetch — queries GNews/NewsAPI with the user's search terms
    const runSearchFetch = useCallback(async (query: string) => {
        setIngesting(true);
        setSearchFetchResults(null);
        setPipelineStatus(`🔍 Searching for "${query}"...`);
        try {
            const res = await fetch('/api/articles/search-fetch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query,
                    category: 'ACCIDENT_INCIDENT',
                }),
            });
            const data = await res.json();
            if (data.success) {
                setSearchFetchResults(data.data);
                setPipelineStatus(`✅ Found ${data.count} articles for "${query}"`);
                // Also refresh the main DB view so new articles appear
                await fetchArticles(false);
            } else {
                setPipelineStatus(data.error || 'Search failed');
            }
        } catch {
            setPipelineStatus('❌ Search fetch failed');
        } finally {
            setIngesting(false);
        }
    }, [fetchArticles]);

    // Auto-ingest + fetch on page load (runs once)
    useEffect(() => {
        if (hasInitialFetch.current) return;
        hasInitialFetch.current = true;

        async function initialLoad() {
            // 1. Show any existing data immediately
            await fetchArticles(true);

            // 2. Trigger ingestion in background to get the latest
            await runIngestion();

            // 3. Refresh the display with newly ingested data
            await fetchArticles(false);
        }

        initialLoad();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Re-fetch when page or search changes (not on initial load)
    useEffect(() => {
        if (!hasInitialFetch.current) return;
        setSearchFetchResults(null); // Clear search-fetch results when search changes
        fetchArticles(true);
    }, [page, search]); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-refresh: every 5 min, ingest fresh data then refresh the view
    useEffect(() => {
        if (autoRefresh) {
            intervalRef.current = setInterval(async () => {
                setPipelineStatus('Auto-refreshing...');
                await runIngestion();
                await fetchArticles(false);
            }, AUTO_REFRESH_MS);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [autoRefresh, fetchArticles, runIngestion]);

    // Countdown timer
    useEffect(() => {
        if (autoRefresh) {
            countdownRef.current = setInterval(() => {
                setCountdown((prev) => (prev <= 1 ? AUTO_REFRESH_MS / 1000 : prev - 1));
            }, 1000);
        }
        return () => {
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, [autoRefresh]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
    };

    const handleManualRefresh = async () => {
        if (search.trim()) {
            // If there's a search query, do a targeted search-fetch
            await runSearchFetch(search.trim());
        } else {
            // No search query — run the generic pipeline
            await runIngestion();
            await fetchArticles(false);
        }
    };

    const getSeverityStyle = (severity: string): { bg: string; color: string; icon: string } => {
        const s = severity?.toLowerCase();
        if (s === 'fatal' || s === 'high') return { bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', icon: '🔴' };
        if (s === 'serious' || s === 'medium') return { bg: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', icon: '🟡' };
        if (s === 'minor' || s === 'low') return { bg: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', icon: '🔵' };
        return { bg: 'rgba(107, 114, 128, 0.2)', color: '#6b7280', icon: '⚪' };
    };

    const getConfidenceClass = (conf: number) => {
        if (conf >= 0.8) return 'high';
        if (conf >= 0.5) return 'medium';
        return 'low';
    };

    const formatTimeAgo = (dateStr: string | null): string => {
        if (!dateStr) return 'Unknown';
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHrs / 24);
        if (diffDays > 0) return `${diffDays}d ago`;
        if (diffHrs > 0) return `${diffHrs}h ago`;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return `${diffMins}m ago`;
    };

    // Decide which articles to display
    const displayArticles = searchFetchResults && searchFetchResults.length > 0
        ? searchFetchResults
        : articles;
    const showingSearchResults = searchFetchResults !== null && searchFetchResults.length > 0;

    return (
        <div>
            {/* Header */}
            <div className="page-header" style={{ marginBottom: '0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h1>🔴 Accidents &amp; Incidents</h1>
                        <p style={{ margin: '4px 0 0' }}>
                            Real-time aviation accident intelligence
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {/* Auto-refresh toggle */}
                        <button
                            className={`btn ${autoRefresh ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <span style={{
                                width: '8px', height: '8px', borderRadius: '50%',
                                background: autoRefresh ? '#22c55e' : '#6b7280',
                                display: 'inline-block',
                                animation: autoRefresh ? 'pulse 2s infinite' : 'none',
                            }} />
                            {autoRefresh ? `Live • ${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, '0')}` : 'Paused'}
                        </button>

                        {/* Manual refresh */}
                        <button
                            className="btn btn-ghost"
                            onClick={handleManualRefresh}
                            disabled={ingesting}
                            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                        >
                            {ingesting ? '⏳ Fetching...' : '🔄 Refresh Now'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Status bar */}
            <div style={{
                display: 'flex', gap: '16px', padding: '12px 16px', marginBottom: '20px',
                background: 'var(--glass-bg)', borderRadius: '8px', border: '1px solid var(--glass-border)',
                fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap', alignItems: 'center',
            }}>
                <span>📊 <strong style={{ color: 'var(--text-primary)' }}>{pagination?.total || 0}</strong> total accidents</span>
                {showingSearchResults && (
                    <span style={{ color: '#8b5cf6', fontWeight: 600 }}>
                        🔍 Showing {searchFetchResults!.length} search results
                    </span>
                )}
                {lastRefresh && (
                    <span>🔄 Updated {lastRefresh.toLocaleTimeString()}</span>
                )}
                {ingesting && (
                    <span style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                            width: '6px', height: '6px', borderRadius: '50%',
                            background: '#3b82f6', animation: 'pulse 1s infinite',
                            display: 'inline-block',
                        }} />
                        Ingesting new data...
                    </span>
                )}
                {pipelineStatus && !ingesting && (
                    <span style={{ color: '#22c55e' }}>{pipelineStatus}</span>
                )}
            </div>

            {/* Search */}
            <div className="search-section">
                <form onSubmit={handleSearch} className="search-bar">
                    <span className="search-icon">🔍</span>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <input
                            type="text"
                            placeholder="Search accidents... (e.g., Air India Ahmedabad, Boeing 737, runway excursion)"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ paddingRight: '32px' }}
                        />
                        {search.trim() !== '' && (
                            <button
                                type="button"
                                onClick={() => { setSearch(''); setPage(1); setSearchFetchResults(null); }}
                                style={{
                                    position: 'absolute',
                                    right: 8,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: 18,
                                    height: 18,
                                    borderRadius: '999px',
                                    border: 'none',
                                    background: 'rgba(148,163,184,0.25)',
                                    color: 'inherit',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    fontSize: '0.75rem',
                                }}
                            >
                                ✕
                            </button>
                        )}
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                        Search
                    </button>
                </form>
            </div>

            {/* Clear search results banner */}
            {showingSearchResults && (
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 16px', marginBottom: '16px', borderRadius: '8px',
                    background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)',
                }}>
                    <span style={{ fontSize: '0.85rem', color: '#8b5cf6', fontWeight: 600 }}>
                        🔍 Showing live search results for &quot;{search}&quot;
                    </span>
                    <button
                        className="btn btn-ghost"
                        onClick={() => { setSearchFetchResults(null); }}
                        style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                    >
                        ✕ Show DB results
                    </button>
                </div>
            )}

            {loading ? (
                <LoadingAnimation
                    message={ingesting ? 'Fetching & classifying aviation news...' : 'Loading accident reports...'}
                    fullScreen
                />
            ) : displayArticles.length > 0 ? (
                <>
                    <div className="articles-grid">
                        {displayArticles.map((article) => {
                            const sevStyle = getSeverityStyle(article.severity);
                            return (
                                <Link
                                    key={article.id}
                                    href={`/articles/${article.id}`}
                                    className="article-card"
                                    style={{ textDecoration: 'none' }}
                                >
                                    {article.imageUrl ? (
                                        <div className="article-image-wrapper">
                                            <img src={article.imageUrl} alt={article.title} loading="lazy" />
                                            <div className="image-overlay" />
                                        </div>
                                    ) : (
                                        <div className="article-image-placeholder">
                                            {sevStyle.icon}
                                        </div>
                                    )}
                                    <div className="article-body">
                                        <div className="article-header">
                                            <h3 className="article-title">{article.title}</h3>
                                            <span style={{
                                                padding: '4px 10px', borderRadius: '12px', fontSize: '0.72rem',
                                                fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase',
                                                background: sevStyle.bg, color: sevStyle.color,
                                                border: `1px solid ${sevStyle.color}30`,
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {sevStyle.icon} {article.severity}
                                            </span>
                                        </div>

                                        {article.summary && (
                                            <p className="article-summary">{article.summary}</p>
                                        )}

                                        <div className="article-meta">
                                            <span className="meta-item">📡 {article.source}</span>
                                            {article.entities?.airline && (
                                                <span className="meta-item">✈️ {article.entities.airline}</span>
                                            )}
                                            {article.entities?.aircraft_type && (
                                                <span className="meta-item">🛩️ {article.entities.aircraft_type}</span>
                                            )}
                                            {article.entities?.location && (
                                                <span className="meta-item">📍 {article.entities.location}</span>
                                            )}
                                            <span className="meta-item">🕐 {formatTimeAgo(article.published_date)}</span>
                                            {article.confidence > 0 && (
                                                <div className="confidence-meter">
                                                    <div className="confidence-bar">
                                                        <div
                                                            className={`fill ${getConfidenceClass(article.confidence)}`}
                                                            style={{ width: `${article.confidence * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="confidence-value">{(article.confidence * 100).toFixed(0)}%</span>
                                                </div>
                                            )}
                                        </div>

                                        {article.tags && article.tags.length > 0 && (
                                            <div className="article-tags">
                                                {article.tags.slice(0, 6).map((tag, i) => (
                                                    <span key={i} className="tag">{tag}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Pagination (only for DB results, not search-fetch results) */}
                    {!showingSearchResults && pagination && pagination.totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '32px' }}>
                            <button
                                className="btn btn-ghost"
                                disabled={page <= 1}
                                onClick={() => setPage(page - 1)}
                            >
                                ← Previous
                            </button>
                            <span style={{ display: 'flex', alignItems: 'center', padding: '0 16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                Page {pagination.page} of {pagination.totalPages} ({pagination.total} articles)
                            </span>
                            <button
                                className="btn btn-ghost"
                                disabled={!pagination.hasMore}
                                onClick={() => setPage(page + 1)}
                            >
                                Next →
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div className="empty-state">
                    <div className="empty-icon">{ingesting ? '⏳' : '🔴'}</div>
                    <h3>{ingesting ? 'Fetching accident reports...' : (search ? `No results for "${search}"` : 'No accident reports found')}</h3>
                    <p>{ingesting
                        ? 'The pipeline is fetching from RSS feeds and classifying with AI. This may take a moment...'
                        : search
                            ? `No aviation accidents matching "${search}" were found in the database. Click below to search live news sources.`
                            : 'No aviation accidents or incidents were found. Click Refresh to check again.'
                    }</p>
                    {!ingesting && (
                        <button
                            className="btn btn-primary"
                            onClick={handleManualRefresh}
                            style={{ marginTop: '16px' }}
                        >
                            🔄 Fetch Latest News{search ? ` for "${search}"` : ''}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
