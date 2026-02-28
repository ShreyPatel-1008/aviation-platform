'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Stats {
  total: number;
  accidents: number;
  trades: number;
  regulations: number;
  general: number;
  pending: number;
  failed: number;
  last24h: number;
  lastUpdated: string | null;
  lastIngestion: {
    timestamp: string;
    fetched: number;
    newArticles: number;
    classified: number;
    failed: number;
    durationMs: number;
    triggeredBy: string;
  } | null;
  sources: { name: string; count: number }[];
}

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

interface PipelineResult {
  fetched: number;
  newArticles: number;
  classified: number;
  failed: number;
  durationMs: number;
}

interface SchedulerStatus {
  active: boolean;
  intervalMinutes: number;
  isRunning: boolean;
  lastRun: string | null;
  runCount: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentArticles, setRecentArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [pipelineResult, setPipelineResult] = useState<PipelineResult | null>(null);
  const [scheduler, setScheduler] = useState<SchedulerStatus | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, articlesRes, cronRes] = await Promise.all([
        fetch('/api/articles/stats'),
        fetch('/api/articles?limit=9'),
        fetch('/api/cron'),
      ]);
      const statsData = await statsRes.json();
      const articlesData = await articlesRes.json();
      const cronData = await cronRes.json();
      if (statsData.success) setStats(statsData.stats);
      if (articlesData.success) setRecentArticles(articlesData.data);
      if (cronData.success) setScheduler(cronData.scheduler);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const triggerIngestion = async () => {
    setIngesting(true);
    setPipelineResult(null);
    try {
      const res = await fetch('/api/ingest', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setPipelineResult(data.result);
        fetchData(); // Refresh stats
      }
    } catch (error) {
      console.error('Ingestion failed:', error);
    } finally {
      setIngesting(false);
    }
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

  const featuredArticle = recentArticles[0] || null;
  const trendingArticles = recentArticles.slice(1, 4);
  const gridArticles = recentArticles.slice(4);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>AviationIQ Dashboard</h1>
          <p>Premium aviation intelligence — news, fleets and risks in one view.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Scheduler Status Badge */}
          {scheduler && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 600,
                background: scheduler.active
                  ? 'rgba(52, 211, 153, 0.15)'
                  : 'rgba(239, 68, 68, 0.15)',
                color: scheduler.active
                  ? 'var(--accent-green, #34d399)'
                  : 'var(--accent-red, #ef4444)',
                border: `1px solid ${scheduler.active ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)'}`,
              }}
              title={scheduler.active
                ? `Auto-fetch every ${scheduler.intervalMinutes}min · ${scheduler.runCount} runs · Last: ${scheduler.lastRun ? new Date(scheduler.lastRun).toLocaleTimeString() : 'pending'}`
                : 'Scheduler inactive — news will go stale'}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: scheduler.active ? '#34d399' : '#ef4444', display: 'inline-block' }} />
              {scheduler.active ? `Auto ⟳ ${scheduler.intervalMinutes}m` : 'Scheduler Off'}
            </div>
          )}
          <button
            className={`btn btn-primary ${ingesting ? 'ingesting' : ''}`}
            onClick={triggerIngestion}
            disabled={ingesting}
          >
            <span className="btn-icon">{ingesting ? '⟳' : '🚀'}</span>
            {ingesting ? 'Ingesting...' : 'Fetch & Classify'}
          </button>
        </div>
      </div>

      {/* Pipeline Result */}
      {pipelineResult && (
        <div className="pipeline-result">
          <h4>✅ Pipeline Complete <span style={{ fontSize: '0.8rem', fontWeight: 400, opacity: 0.7 }}>({(pipelineResult.durationMs / 1000).toFixed(1)}s)</span></h4>
          <div className="result-grid">
            <div className="result-item">
              <div className="val">{pipelineResult.fetched}</div>
              <div className="lbl">Fetched</div>
            </div>
            <div className="result-item">
              <div className="val">{pipelineResult.newArticles}</div>
              <div className="lbl">New Articles</div>
            </div>
            <div className="result-item">
              <div className="val" style={{ color: 'var(--accent-green)' }}>{pipelineResult.classified}</div>
              <div className="lbl">Classified</div>
            </div>
            <div className="result-item">
              <div className="val" style={{ color: pipelineResult.failed > 0 ? 'var(--accent-red)' : 'var(--text-primary)' }}>{pipelineResult.failed}</div>
              <div className="lbl">Failed</div>
            </div>
          </div>
        </div>
      )}

      {/* Hero layout: Featured + Trending */}
      {featuredArticle && (
        <div className="aviationiq-main-grid">
          {/* Featured article */}
          <Link href={`/articles/${featuredArticle.id}`} className="featured-article-card">
            <div className="featured-image-wrapper">
              {featuredArticle.imageUrl ? (
                <img src={featuredArticle.imageUrl} alt={featuredArticle.title} loading="lazy" />
              ) : (
                <div className="featured-image-placeholder">✈️</div>
              )}
              <div className="featured-gradient" />
              <div className="featured-category-pill">AVIATION</div>
            </div>
            <div className="featured-body">
              <h2 className="featured-title">{featuredArticle.title}</h2>
              {featuredArticle.aiSummary && (
                <p className="featured-summary">
                  {featuredArticle.aiSummary.length > 220
                    ? `${featuredArticle.aiSummary.slice(0, 220)}…`
                    : featuredArticle.aiSummary}
                </p>
              )}
              <div className="featured-meta-row">
                <span className="meta-item">📡 {featuredArticle.sourceName || 'Unknown source'}</span>
                {featuredArticle.publishedAt && (
                  <span className="meta-item">
                    🕒 {new Date(featuredArticle.publishedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                )}
                <span className="meta-item">⏱ 4 min read</span>
              </div>
              {featuredArticle.tags && featuredArticle.tags.length > 0 && (
                <div className="featured-tags">
                  {featuredArticle.tags.slice(0, 3).map((tag, i) => (
                    <span key={i} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Link>

          {/* Trending list */}
          <div className="trending-card">
            <div className="trending-header">
              <h3>Trending Now</h3>
              <Link href="/articles" className="trending-view-all">
                View All →
              </Link>
            </div>
            <div className="trending-list">
              {trendingArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/articles/${article.id}`}
                  className="trending-item"
                >
                  <div className="trending-thumb">
                    {article.imageUrl ? (
                      <img src={article.imageUrl} alt={article.title} loading="lazy" />
                    ) : (
                      <div className="trending-thumb-placeholder">✈️</div>
                    )}
                  </div>
                  <div className="trending-content">
                    <div className="trending-title">{article.title}</div>
                    <div className="trending-meta">
                      <span>{article.sourceName || 'Unknown'}</span>
                      {article.publishedAt && (
                        <span>
                          {new Date(article.publishedAt).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
              {trendingArticles.length === 0 && (
                <div className="trending-empty">More articles will appear here as they are ingested.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent Articles */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', marginTop: '32px' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Recent Articles</h2>
        <Link href="/articles" className="btn btn-ghost" style={{ fontSize: '0.85rem' }}>
          View All →
        </Link>
      </div>

      {gridArticles.length > 0 ? (
        <div className="articles-grid">
          {gridArticles.map((article) => (
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
                      <span className="confidence-value">
                        {(article.aiConfidence * 100).toFixed(0)}%
                      </span>
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
      ) : (
        <div className="empty-state">
          <div className="empty-icon">🛫</div>
          <h3>No additional recent articles</h3>
          <p>Ingest more news to fill out the grid below the featured and trending stories.</p>
        </div>
      )}

      {/* Stats Cards (moved below Recent, above Sources) */}
      <div className="stats-grid" style={{ marginTop: '32px' }}>
        <div className="stat-card blue">
          <div className="stat-icon">📰</div>
          <div className="stat-value">{stats?.total || 0}</div>
          <div className="stat-label">Total Articles</div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon">🔴</div>
          <div className="stat-value">{stats?.accidents || 0}</div>
          <div className="stat-label">Accidents & Incidents</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">💼</div>
          <div className="stat-value">{stats?.trades || 0}</div>
          <div className="stat-label">Aviation Trades</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon">📜</div>
          <div className="stat-value">{stats?.regulations || 0}</div>
          <div className="stat-label">Regulations</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-icon">⏳</div>
          <div className="stat-value">{stats?.pending || 0}</div>
          <div className="stat-label">Pending Classification</div>
        </div>
      </div>

      {/* Observability Banner */}
      {stats && (
        <div style={{
          display: 'flex', gap: '16px', marginTop: '24px', flexWrap: 'wrap',
        }}>
          <div style={{
            flex: '1 1 150px', padding: '14px 18px', borderRadius: '12px',
            background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)',
          }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{stats.last24h}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Last 24 Hours</div>
          </div>
          <div style={{
            flex: '1 1 150px', padding: '14px 18px', borderRadius: '12px',
            background: stats.failed > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(52,211,153,0.08)',
            border: `1px solid ${stats.failed > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(52,211,153,0.15)'}`,
          }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: stats.failed > 0 ? 'var(--accent-red, #ef4444)' : 'var(--accent-green, #34d399)' }}>
              {stats.failed}
            </div>
            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Failed</div>
          </div>
          {stats.lastIngestion && (
            <div style={{
              flex: '2 1 250px', padding: '14px 18px', borderRadius: '12px',
              background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)',
            }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Last Ingestion: {new Date(stats.lastIngestion.timestamp).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '4px' }}>
                {stats.lastIngestion.triggeredBy} · {stats.lastIngestion.fetched} fetched → {stats.lastIngestion.classified} classified · {stats.lastIngestion.durationMs}ms
              </div>
            </div>
          )}
        </div>
      )}

      {/* Source distribution */}
      {stats?.sources && stats.sources.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '16px' }}>Source Distribution</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            {stats.sources.map((source, i) => (
              <div key={i} className="stat-card blue" style={{ padding: '16px' }}>
                <div className="stat-value" style={{ fontSize: '1.4rem' }}>{source.count}</div>
                <div className="stat-label">{source.name || 'Unknown'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
