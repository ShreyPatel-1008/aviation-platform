'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import LoadingAnimation from '@/components/LoadingAnimation';

interface Article {
    id: string;
    title: string;
    aiSummary: string;
    category: string;
    aiConfidence: number;
    sourceName: string;
    publishedAt: string;
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

export default function RegulationsPage() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    const fetchArticles = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: page.toString(), limit: '15' });
            if (search) params.set('search', search);
            const res = await fetch(`/api/articles/regulations?${params}`);
            const data = await res.json();
            if (data.success) {
                setArticles(data.data);
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error('Failed to fetch:', error);
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => {
        fetchArticles();
    }, [fetchArticles]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchArticles();
    };

    const getConfidenceClass = (conf: number) => {
        if (conf >= 0.8) return 'high';
        if (conf >= 0.5) return 'medium';
        return 'low';
    };

    const getAuthorityColor = (authority: string | null) => {
        switch (authority?.toUpperCase()) {
            case 'FAA': return '#3b82f6';
            case 'EASA': return '#8b5cf6';
            case 'ICAO': return '#06b6d4';
            case 'DGCA': return '#f59e0b';
            default: return '#64748b';
        }
    };

    return (
        <div>
            <div className="page-header">
                <h1>📜 Regulations &amp; Guidelines</h1>
                <p>Airworthiness directives, NOTAMs, safety bulletins, and policy updates from global authorities</p>
            </div>

            <div className="search-section">
                <form onSubmit={handleSearch} className="search-bar">
                    <span className="search-icon">🔍</span>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <input
                            type="text"
                            placeholder="Search regulations... (e.g., FAA, NOTAM, airworthiness directive)"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ paddingRight: '32px' }}
                        />
                        {search.trim() !== '' && (
                            <button
                                type="button"
                                onClick={() => { setSearch(''); setPage(1); }}
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

            {loading ? (
                <LoadingAnimation message="Loading regulations..." fullScreen />
            ) : articles.length > 0 ? (
                <>
                    <div className="articles-grid">
                        {articles.map((article) => (
                            <Link
                                key={article.id}
                                href={`/articles/${article.id}`}
                                className="article-card"
                            >
                                {article.imageUrl ? (
                                    <div className="article-image-wrapper">
                                        <img src={article.imageUrl} alt={article.title} loading="lazy" />
                                        <div className="image-overlay" />
                                    </div>
                                ) : (
                                    <div className="article-image-placeholder">
                                        📜
                                    </div>
                                )}
                                <div className="article-body">
                                    <div className="article-header">
                                        <h3 className="article-title">{article.title}</h3>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            {article.entities?.authority && (
                                                <span style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '8px',
                                                    fontSize: '0.72rem',
                                                    fontWeight: 700,
                                                    background: `${getAuthorityColor(article.entities.authority)}20`,
                                                    color: getAuthorityColor(article.entities.authority),
                                                    border: `1px solid ${getAuthorityColor(article.entities.authority)}30`,
                                                }}>
                                                    {article.entities.authority}
                                                </span>
                                            )}
                                            <span className="category-badge regulation">📜 Regulation</span>
                                        </div>
                                    </div>

                                    {article.aiSummary && (
                                        <p className="article-summary">{article.aiSummary}</p>
                                    )}

                                    <div className="article-meta">
                                        <span className="meta-item">📡 {article.sourceName || 'Unknown'}</span>
                                        {article.publishedAt && (
                                            <span className="meta-item">
                                                🕐 {new Date(article.publishedAt).toLocaleDateString('en-US', {
                                                    month: 'short', day: 'numeric', year: 'numeric'
                                                })}
                                            </span>
                                        )}
                                        {article.aiConfidence && (
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
                                            {article.tags.slice(0, 6).map((tag, i) => (
                                                <span key={i} className="tag">{tag}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>

                    {pagination && pagination.totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '32px' }}>
                            <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                                ← Previous
                            </button>
                            <span style={{ display: 'flex', alignItems: 'center', padding: '0 16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                Page {pagination.page} of {pagination.totalPages} ({pagination.total} articles)
                            </span>
                            <button className="btn btn-ghost" disabled={!pagination.hasMore} onClick={() => setPage(page + 1)}>
                                Next →
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div className="empty-state">
                    <div className="empty-icon">📜</div>
                    <h3>No regulations found</h3>
                    <p>Run the ingestion pipeline from the Dashboard to fetch aviation news.</p>
                </div>
            )}
        </div>
    );
}
