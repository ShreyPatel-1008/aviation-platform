'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import LoadingAnimation from '@/components/LoadingAnimation';

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
    return <LoadingAnimation message="Loading dashboard..." fullScreen />;
  }

  return (
    <div>
      {/* Page header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>AviationIQ Dashboard</h1>
          <p>Premium aviation intelligence — news, fleets and risks in one view.</p>
        </div>
      </div>

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

    </div>
  );
}
