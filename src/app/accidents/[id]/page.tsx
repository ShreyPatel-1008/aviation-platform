'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface ArticleDetail {
    id: string;
    title: string;
    content: string | null;
    description: string | null;
    url: string;
    sourceName: string | null;
    sourceUrl: string | null;
    author: string | null;
    imageUrl: string | null;
    publishedAt: string | null;
    category: string;
    aiSummary: string | null;
    aiConfidence: number | null;
    tags: string[];
    entities: Record<string, string | null>;
    status: string;
    classifiedAt: string | null;
    createdAt: string;
}

export default function ArticleDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [article, setArticle] = useState<ArticleDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [imageError, setImageError] = useState(false);
    const [detailedSummary, setDetailedSummary] = useState('');
    const [summarizing, setSummarizing] = useState(false);
    const [summaryError, setSummaryError] = useState('');

    useEffect(() => {
        async function loadArticle() {
            try {
                const res = await fetch(`/api/articles/${params.id}`);
                const data = await res.json();
                if (data.success) {
                    setArticle(data.article);

                    // If content already exists and is detailed, show it
                    if (data.article.content && data.article.content.length > 500) {
                        setDetailedSummary(data.article.content);
                    } else if (params.id) {
                        // Auto-trigger deep summarization
                        fetchDeepSummary(params.id as string);
                    }
                } else {
                    setError(data.error || 'Article not found');
                }
            } catch {
                setError('Failed to load article');
            } finally {
                setLoading(false);
            }
        }
        if (params.id) loadArticle();
    }, [params.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchDeepSummary = async (articleId: string) => {
        setSummarizing(true);
        setSummaryError('');
        try {
            const res = await fetch(`/api/articles/${articleId}/summarize`, { method: 'POST' });
            const data = await res.json();
            if (data.success && data.summary) {
                setDetailedSummary(data.summary);
            } else {
                setSummaryError(data.error || 'Failed to generate summary');
            }
        } catch (err) {
            console.error('Summarization failed:', err);
            setSummaryError('Network error or server timeout. Please try again.');
        } finally {
            setSummarizing(false);
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner" />
                <p>Loading article...</p>
            </div>
        );
    }

    if (error || !article) {
        return (
            <div className="empty-state">
                <div className="empty-icon">❌</div>
                <h3>{error || 'Article not found'}</h3>
                <button className="btn btn-primary" onClick={() => router.back()} style={{ marginTop: '16px' }}>
                    ← Go Back
                </button>
            </div>
        );
    }

    const severity = article.entities?.severity || 'unknown';
    const publishedDate = article.publishedAt ? new Date(article.publishedAt) : null;

    const getSevColor = (s: string) => {
        const sv = s?.toLowerCase();
        if (sv === 'fatal' || sv === 'high') return '#ef4444';
        if (sv === 'serious' || sv === 'medium') return '#f59e0b';
        if (sv === 'minor' || sv === 'low') return '#3b82f6';
        return '#6b7280';
    };

    const getStatusText = () => {
        if (!publishedDate) return 'Ongoing';
        const daysDiff = Math.floor((Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 1) return 'Developing';
        if (daysDiff <= 3) return 'Active';
        if (daysDiff <= 7) return 'Under Investigation';
        return 'Reported';
    };

    const getStatusColor = () => {
        const status = getStatusText();
        if (status === 'Developing') return '#ef4444';
        if (status === 'Active') return '#f59e0b';
        if (status === 'Under Investigation') return '#8b5cf6';
        return '#22c55e';
    };

    // Build timeline points from AI summary
    const timelinePoints: string[] = [];
    if (article.aiSummary) {
        article.aiSummary.split(/\.\s+/).filter(s => s.trim().length > 10).forEach(s => {
            timelinePoints.push(s.trim().endsWith('.') ? s.trim() : s.trim() + '.');
        });
    }
    if (article.entities?.airline) timelinePoints.push(`Airline involved: ${article.entities.airline}`);
    if (article.entities?.aircraft_type) timelinePoints.push(`Aircraft type: ${article.entities.aircraft_type}`);
    if (article.entities?.location) timelinePoints.push(`Incident location: ${article.entities.location}`);
    if (article.entities?.registration) timelinePoints.push(`Aircraft registration: ${article.entities.registration}`);

    // Impact categories
    const impactCards = [
        {
            title: 'SAFETY IMPACT',
            icon: '🛡️',
            color: '#ef4444',
            description: severity.toLowerCase() === 'fatal' || severity.toLowerCase() === 'high'
                ? 'Significant safety concerns raised requiring immediate attention'
                : severity.toLowerCase() === 'serious' || severity.toLowerCase() === 'medium'
                    ? 'Moderate safety implications under review by authorities'
                    : 'Minor safety event with limited operational impact',
        },
        {
            title: 'OPERATIONAL STATUS',
            icon: '⚙️',
            color: '#3b82f6',
            description: article.entities?.location
                ? `Operations at ${article.entities.location} may be affected`
                : 'No reported operational downtime or disruption',
        },
        {
            title: 'REGULATORY RESPONSE',
            icon: '🏛️',
            color: '#8b5cf6',
            description: article.entities?.authority
                ? `${article.entities.authority} has been notified and is monitoring the situation`
                : 'Aviation authorities have been notified per standard protocol',
        },
        {
            title: 'INDUSTRY ALERT',
            icon: '📡',
            color: '#f59e0b',
            description: `Incident classified as ${severity} severity by AI analysis with ${article.aiConfidence ? (article.aiConfidence * 100).toFixed(0) : '—'}% confidence`,
        },
    ];

    // Split the detailed summary into paragraphs for rendering
    const summaryParagraphs = detailedSummary
        ? detailedSummary.split(/\n\n+/).filter(p => p.trim().length > 0)
        : [];

    return (
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
            {/* Top Bar */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '24px',
            }}>
                <Link
                    href="/accidents"
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.85rem',
                        padding: '8px 0', transition: 'color 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#3b82f6')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                    ← Back to Feed
                </Link>
                <button
                    className="btn btn-ghost"
                    onClick={() => window.location.reload()}
                    style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                >
                    🔄 Refresh
                </button>
            </div>

            {/* ─── HERO CARD ─── */}
            <div style={{
                background: 'linear-gradient(145deg, rgba(15, 15, 35, 0.95), rgba(20, 20, 50, 0.9))',
                borderRadius: '16px', padding: '36px 36px 28px',
                border: '1px solid rgba(255,255,255,0.06)',
                marginBottom: '32px', position: 'relative', overflow: 'hidden',
            }}>
                {article.imageUrl && !imageError && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        opacity: 0.15, zIndex: 0,
                    }}>
                        <img
                            src={article.imageUrl}
                            alt=""
                            onError={() => setImageError(true)}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(2px)' }}
                        />
                    </div>
                )}

                <div style={{ position: 'relative', zIndex: 1 }}>
                    <h1 style={{
                        fontSize: '1.7rem', fontWeight: 900, lineHeight: 1.3,
                        color: '#ffffff', margin: '0 0 24px', textTransform: 'uppercase',
                        letterSpacing: '-0.3px',
                    }}>
                        {article.title}
                    </h1>

                    <div style={{
                        display: 'flex', gap: '32px', flexWrap: 'wrap',
                        fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)',
                    }}>
                        {publishedDate && (
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                    📅 <span style={{ textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.65rem' }}>Date</span>
                                </div>
                                <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.9rem' }}>
                                    {publishedDate.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                                </div>
                            </div>
                        )}
                        {article.entities?.airline && (
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                    ✈️ <span style={{ textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.65rem' }}>Affected</span>
                                </div>
                                <div style={{ color: '#3b82f6', fontWeight: 700, fontSize: '0.9rem' }}>
                                    {article.entities.airline}
                                </div>
                            </div>
                        )}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                ⚠️ <span style={{ textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.65rem' }}>Severity</span>
                            </div>
                            <div style={{ color: getSevColor(severity), fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase' }}>
                                {severity}
                            </div>
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                🔄 <span style={{ textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.65rem' }}>Status</span>
                            </div>
                            <div style={{ color: getStatusColor(), fontWeight: 700, fontSize: '0.9rem' }}>
                                {getStatusText()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── REAL SOURCE IMAGE ─── */}
            {article.imageUrl && !imageError && (
                <div style={{
                    marginBottom: '32px', borderRadius: '12px', overflow: 'hidden',
                    border: '1px solid var(--glass-border)',
                }}>
                    <img
                        src={article.imageUrl}
                        alt={article.title}
                        onError={() => setImageError(true)}
                        style={{ width: '100%', height: 'auto', maxHeight: '440px', objectFit: 'cover', display: 'block' }}
                    />
                    <div style={{
                        padding: '10px 16px', fontSize: '0.72rem', color: 'var(--text-muted)',
                        background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'space-between',
                    }}>
                        <span>📸 Source: {article.sourceName || 'News Agency'}</span>
                        <span>Photo from original report</span>
                    </div>
                </div>
            )}

            {/* ─── EXECUTIVE INTELLIGENCE ─── */}
            {article.aiSummary && (
                <div style={{ marginBottom: '32px' }}>
                    <SectionHeader icon="✨" label="EXECUTIVE INTELLIGENCE" color="#f59e0b" />
                    <div style={{
                        padding: '28px 32px', borderRadius: '12px',
                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.06), rgba(139, 92, 246, 0.04))',
                        border: '1px solid rgba(245, 158, 11, 0.15)',
                    }}>
                        <p style={{
                            margin: 0, fontSize: '1.05rem', lineHeight: 1.8,
                            color: 'var(--text-secondary)', fontStyle: 'italic', fontWeight: 500,
                        }}>
                            &ldquo;{article.aiSummary}&rdquo;
                        </p>
                    </div>
                </div>
            )}

            {/* ─── DETAILED ARTICLE (Inline summarized content) ─── */}
            <div style={{ marginBottom: '32px' }}>
                <SectionHeader icon="📰" label="DETAILED REPORT" color="#3b82f6" />
                <div style={{
                    padding: '32px 32px', borderRadius: '12px',
                    background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                }}>
                    {summarizing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '40px 0' }}>
                            <div className="loading-spinner" />
                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                🤖 AI is reading and summarizing the full article...
                            </p>
                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.75rem', opacity: 0.6 }}>
                                Fetching source → Extracting content → Generating detailed summary
                            </p>
                        </div>
                    ) : summaryParagraphs.length > 0 ? (
                        <div>
                            {summaryParagraphs.map((para, i) => (
                                <p key={i} style={{
                                    margin: i === 0 ? '0 0 20px' : i === summaryParagraphs.length - 1 ? '0' : '0 0 20px',
                                    fontSize: '0.95rem', lineHeight: 1.9, color: 'var(--text-secondary)',
                                    textIndent: i > 0 ? '2em' : '0',
                                }}>
                                    {i === 0 && (
                                        <span style={{
                                            fontSize: '3rem', fontWeight: 900, color: 'var(--accent-primary)',
                                            float: 'left', lineHeight: 1, marginRight: '8px', marginTop: '4px',
                                        }}>
                                            {para.charAt(0)}
                                        </span>
                                    )}
                                    {i === 0 ? para.slice(1) : para}
                                </p>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '20px' }}>
                            {summaryError ? (
                                <div style={{ marginBottom: '16px' }}>
                                    <p style={{ color: '#ef4444', fontSize: '0.9rem', marginBottom: '8px' }}>
                                        ⚠️ {summaryError}
                                    </p>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '12px' }}>
                                        {article.description || 'Partial data available below.'}
                                    </p>
                                </div>
                            ) : (
                                <p style={{ color: 'var(--text-muted)', margin: '0 0 12px' }}>
                                    {article.description || 'Summary not yet available.'}
                                </p>
                            )}
                            <button
                                className="btn btn-primary"
                                onClick={() => fetchDeepSummary(article.id)}
                                disabled={summarizing}
                                style={{
                                    fontSize: '0.85rem',
                                    background: summaryError ? '#ef4444' : 'var(--accent-primary)',
                                    opacity: summarizing ? 0.7 : 1
                                }}
                            >
                                {summarizing ? '⌛ Generating...' : summaryError ? '🔄 Retry Generation' : '🤖 Generate Detailed Summary'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ─── TIMELINE ANALYSIS ─── */}
            {timelinePoints.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                    <SectionHeader icon="🔍" label="TIMELINE ANALYSIS" color="#22c55e" />
                    <div style={{
                        padding: '24px 28px', borderRadius: '12px',
                        background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                    }}>
                        {timelinePoints.map((point, i) => (
                            <div
                                key={i}
                                style={{
                                    display: 'flex', gap: '16px', alignItems: 'flex-start',
                                    padding: '14px 0',
                                    borderBottom: i < timelinePoints.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                                }}
                            >
                                <div style={{
                                    width: '10px', height: '10px', borderRadius: '50%', marginTop: '6px', flexShrink: 0,
                                    background: i === 0 ? '#ef4444' : i === 1 ? '#f59e0b' : i === 2 ? '#3b82f6' : '#22c55e',
                                    boxShadow: `0 0 8px ${i === 0 ? '#ef444460' : i === 1 ? '#f59e0b60' : i === 2 ? '#3b82f660' : '#22c55e60'}`,
                                }} />
                                <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                                    {point}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── IMPACT ASSESSMENT ─── */}
            <div style={{ marginBottom: '32px' }}>
                <SectionHeader icon="⚡" label="IMPACT ASSESSMENT" color="#ef4444" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    {impactCards.map((card, i) => (
                        <div key={i} style={{
                            padding: '20px 22px', borderRadius: '12px',
                            background: 'var(--glass-bg)',
                            border: `1px solid ${card.color}20`,
                            position: 'relative', overflow: 'hidden',
                        }}>
                            <div style={{
                                position: 'absolute', top: '16px', right: '16px',
                                fontSize: '1.2rem', opacity: 0.5,
                            }}>{card.icon}</div>
                            <div style={{
                                fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase',
                                letterSpacing: '1.5px', color: card.color, marginBottom: '10px',
                            }}>{card.title}</div>
                            <p style={{ margin: 0, fontSize: '0.84rem', lineHeight: 1.6, color: 'var(--text-muted)' }}>
                                {card.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ─── INVESTIGATION PROTOCOL ─── */}
            <div style={{ marginBottom: '32px' }}>
                <SectionHeader icon="🔒" label="INVESTIGATION PROTOCOL" color="#8b5cf6" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    <div style={{ padding: '20px 22px', borderRadius: '12px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#22c55e', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            ✈️ Aviation Response
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.84rem', lineHeight: 2, color: 'var(--text-muted)' }}>
                            <li>Investigation team dispatched to the site</li>
                            <li>Flight data and cockpit voice recorders secured</li>
                            <li>Preliminary report expected within 30 days</li>
                            {article.entities?.authority && <li>{article.entities.authority} overseeing the investigation</li>}
                        </ul>
                    </div>
                    <div style={{ padding: '20px 22px', borderRadius: '12px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#ef4444', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            🏛️ Regulatory Actions
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.84rem', lineHeight: 2, color: 'var(--text-muted)' }}>
                            <li>Safety advisory under review</li>
                            <li>Relevant operators notified of incident</li>
                            <li>Airworthiness directives being assessed</li>
                            {article.entities?.aircraft_type && <li>Fleet-wide check on {article.entities.aircraft_type} recommended</li>}
                        </ul>
                    </div>
                </div>
            </div>

            {/* ─── TAGS ─── */}
            {article.tags && article.tags.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                    <div className="article-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {article.tags.map((tag, i) => (
                            <span key={i} className="tag">{tag}</span>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── FOOTER ─── */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                flexWrap: 'wrap', gap: '12px', padding: '16px 24px', marginBottom: '40px',
                borderRadius: '12px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                fontSize: '0.72rem', color: 'var(--text-muted)',
            }}>
                <div>
                    Classified by Gemini AI • {article.classifiedAt ? new Date(article.classifiedAt).toLocaleString() : '—'}
                    {' • '} Report ID: {article.id.slice(0, 8).toUpperCase()}
                </div>
                <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--text-muted)', textDecoration: 'underline', fontSize: '0.72rem' }}
                >
                    Original source ↗
                </a>
            </div>
        </div>
    );
}

function SectionHeader({ icon, label, color }: { icon: string; label: string; color: string }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            marginBottom: '16px', paddingLeft: '4px',
        }}>
            <span style={{ fontSize: '1rem' }}>{icon}</span>
            <span style={{
                fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase',
                letterSpacing: '2px', color,
            }}>
                {label}
            </span>
        </div>
    );
}
