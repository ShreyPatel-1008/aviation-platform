'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

interface Article {
    id: string;
    title: string;
    aiSummary: string;
    category: string;
    aiConfidence: number;
    sourceName: string;
    publishedAt: string | null;
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

export default function AllArticlesPage() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [loading, setLoading] = useState(true);
    const [ingesting, setIngesting] = useState(false);

    // Search & Filter State
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [sort, setSort] = useState('newest');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    const [autoRefresh, setAutoRefresh] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const [countdown, setCountdown] = useState(AUTO_REFRESH_MS / 1000);

    const [pipelineStatus, setPipelineStatus] = useState('');
    const [searchFetchResults, setSearchFetchResults] = useState<Article[] | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const hasInitialFetch = useRef(false);

    // Fetch articles from the API (read-only, fast)
    const fetchArticles = useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const params = new URLSearchParams({ page: page.toString(), limit: '15' });
            if (search) params.set('search', search);
            if (sort) params.set('sort', sort);
            if (categoryFilter) params.set('category', categoryFilter);
            if (dateFrom) params.set('from', dateFrom);
            if (dateTo) params.set('to', dateTo);

            const res = await fetch(`/api/articles?${params}`);
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
    }, [page, search, sort, categoryFilter, dateFrom, dateTo]);

    // Trigger ingestion pipeline
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

    // Targeted search fetch
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
                    category: categoryFilter || undefined // Respect category if set
                }),
            });
            const data = await res.json();
            if (data.success) {
                setSearchFetchResults(data.data);
                setPipelineStatus(`✅ Found ${data.count} articles for "${query}"`);
                await fetchArticles(false);
            } else {
                setPipelineStatus(data.error || 'Search failed');
            }
        } catch {
            setPipelineStatus('❌ Search fetch failed');
        } finally {
            setIngesting(false);
        }
    }, [categoryFilter, fetchArticles]);

    // Auto-ingest + fetch on page load
    useEffect(() => {
        if (hasInitialFetch.current) return;
        hasInitialFetch.current = true;

        async function initialLoad() {
            await fetchArticles(true);
            await runIngestion();
            await fetchArticles(false);
        }

        initialLoad();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!hasInitialFetch.current) return;
        setSearchFetchResults(null);
        fetchArticles(true);
    }, [page, search, sort, categoryFilter, dateFrom, dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

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
            await runSearchFetch(search.trim());
        } else {
            await runIngestion();
            await fetchArticles(false);
        }
    };

    const clearFilters = () => {
        setSearch('');
        setCategoryFilter('');
        setSort('newest');
        setDateFrom('');
        setDateTo('');
        setPage(1);
    };

    const getCategoryClass = (cat: string) => {
        switch (cat) {
            case 'ACCIDENT_INCIDENT': return 'accident';
            case 'AVIATION_TRADE': return 'trade';
            case 'REGULATION': return 'regulation';
            default: return 'general';
        }
    };

    const getCategoryLabel = (cat: string) => {
        switch (cat) {
            case 'ACCIDENT_INCIDENT': return '🔴 Accident';
            case 'AVIATION_TRADE': return '💼 Trade';
            case 'REGULATION': return '📜 Regulation';
            default: return '📰 General';
        }
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

    // Use searchFetchResults if explicitly populated, otherwise DB results
    const displayArticles = searchFetchResults && searchFetchResults.length > 0
        ? searchFetchResults
        : articles;
    const showingSearchResults = searchFetchResults !== null && searchFetchResults.length > 0;
    const hasActiveFilters = categoryFilter || dateFrom || dateTo || sort !== 'newest';

    return (
        <div>
            {/* Header */}
            <div className="page-header" style={{ marginBottom: '0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h1>🌍 Global Aviation Intelligence</h1>
                        <p style={{ margin: '4px 0 0' }}>
                            Search and analyze the complete aviation event database
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                <span>📊 <strong style={{ color: 'var(--text-primary)' }}>{pagination?.total || 0}</strong> total articles</span>
                {showingSearchResults && (
                    <span style={{ color: '#8b5cf6', fontWeight: 600 }}>
                        🔍 Showing {searchFetchResults!.length} live search results
                    </span>
                )}
                {lastRefresh && (
                    <span>🔄 Updated {lastRefresh.toLocaleTimeString()}</span>
                )}
                {pipelineStatus && !ingesting && (
                    <span style={{ color: '#22c55e' }}>{pipelineStatus}</span>
                )}
            </div>

            {/* Search & Filter Section */}
            <div className="search-section" style={{ background: 'var(--glass-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                <form onSubmit={handleSearch} style={{ width: '100%' }}>
                    <div className="search-bar" style={{ marginBottom: '16px' }}>
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Search keywords (e.g. Boeing, strike, Dubai closure)..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <button type="submit" className="btn btn-primary" style={{ padding: '8px 24px' }}>
                            Search
                        </button>
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => setShowFilters(!showFilters)}
                            style={{ marginLeft: '8px', color: showFilters ? 'var(--text-primary)' : 'var(--text-muted)' }}
                        >
                            {showFilters ? '▼ Filters' : '▶ Filters'}
                        </button>
                    </div>

                    {showFilters && (
                        <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px',
                            paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            {/* Category Filter */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Category</label>
                                <select
                                    value={categoryFilter}
                                    onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                                    style={{
                                        padding: '8px', borderRadius: '6px',
                                        background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                                        color: 'var(--text-primary)'
                                    }}
                                >
                                    <option value="">All Categories</option>
                                    <option value="ACCIDENT_INCIDENT">Accidents & Incidents</option>
                                    <option value="AVIATION_TRADE">Aviation Trade</option>
                                    <option value="REGULATION">Regulations</option>
                                    <option value="GENERAL">General News</option>
                                </select>
                            </div>

                            {/* Sort Filter */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sort By</label>
                                <select
                                    value={sort}
                                    onChange={(e) => { setSort(e.target.value); setPage(1); }}
                                    style={{
                                        padding: '8px', borderRadius: '6px',
                                        background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                                        color: 'var(--text-primary)'
                                    }}
                                >
                                    <option value="newest">Newest First</option>
                                    <option value="oldest">Oldest First</option>
                                </select>
                            </div>

                            {/* Date From */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Date From</label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                                    style={{
                                        padding: '8px', borderRadius: '6px',
                                        background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                                        color: 'var(--text-primary)',
                                        colorScheme: 'dark'
                                    }}
                                />
                            </div>

                            {/* Date To */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Date To</label>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                                    style={{
                                        padding: '8px', borderRadius: '6px',
                                        background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                                        color: 'var(--text-primary)',
                                        colorScheme: 'dark'
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </form>
            </div>

            {/* Clear filters banner */}
            {(hasActiveFilters || showingSearchResults || search) && (
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 16px', marginBottom: '16px', marginTop: '16px', borderRadius: '8px',
                    background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)',
                }}>
                    <span style={{ fontSize: '0.85rem', color: '#60a5fa', fontWeight: 600 }}>
                        {showingSearchResults
                            ? `🔍 Search results for "${search}"`
                            : `⚡ Active Filters: ${categoryFilter ? categoryFilter : 'All Cats'} • ${sort} • ${dateFrom || dateTo ? 'Date Range' : 'All Time'}`
                        }
                    </span>
                    <button
                        className="btn btn-ghost"
                        onClick={() => { setSearchFetchResults(null); clearFilters(); }}
                        style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                    >
                        ✕ Clear All
                    </button>
                </div>
            )}

            {/* Articles List */}
            {loading ? (
                <div className="loading-container">
                    <div className="loading-spinner" />
                    <p>{ingesting ? 'Scanning global aviation sources...' : 'Loading aviation intelligence...'}</p>
                </div>
            ) : displayArticles.length > 0 ? (
                <>
                    <div className="articles-grid">
                        {displayArticles.map((article) => (
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
                                        {getCategoryLabel(article.category).split(' ')[0]}
                                    </div>
                                )}
                                <div className="article-body">
                                    <div className="article-header">
                                        <h3 className="article-title">{article.title}</h3>
                                        <span className={`category-badge ${getCategoryClass(article.category)}`}>
                                            {getCategoryLabel(article.category)}
                                        </span>
                                    </div>

                                    {article.aiSummary && (
                                        <p className="article-summary">{article.aiSummary}</p>
                                    )}

                                    <div className="article-meta">
                                        <span className="meta-item">📡 {article.sourceName || 'Unknown'}</span>
                                        <span className="meta-item">🕐 {formatTimeAgo(article.publishedAt)}</span>
                                        {article.aiConfidence > 0 && (
                                            <div className="confidence-meter">
                                                <div className="confidence-bar">
                                                    <div
                                                        className={`fill ${getConfidenceClass(article.aiConfidence)}`}
                                                        style={{ width: `${article.aiConfidence * 100}%` }}
                                                    />
                                                </div>
                                                <span className="confidence-value">{(article.aiConfidence * 100).toFixed(0)}%</span>
                                            </div>
                                        )}
                                    </div>

                                    {article.tags && article.tags.length > 0 && (
                                        <div className="article-tags">
                                            {article.tags.slice(0, 5).map((tag, i) => (
                                                <span key={i} className="tag">{tag}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>

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
                    <div className="empty-icon">🌍</div>
                    <h3>No articles found</h3>
                    <p>
                        {search ? `No results for "${search}". Try different keywords.` : 'No articles match your filters.'}
                    </p>
                    <button className="btn btn-ghost" onClick={clearFilters}>Clear Filters</button>
                </div>
            )}
        </div>
    );
}
