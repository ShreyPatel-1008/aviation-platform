import React from 'react';

interface ExecutiveIntelligenceProps {
    article: any; // Flexible type to handle both Prisma object and API response
}

export default function ExecutiveIntelligence({ article }: ExecutiveIntelligenceProps) {
    // Parse keyInsights
    let insights: string[] = [];
    try {
        if (Array.isArray(article.keyInsights)) {
            insights = article.keyInsights;
        } else if (typeof article.keyInsights === 'string') {
            const parsed = JSON.parse(article.keyInsights);
            if (Array.isArray(parsed)) {
                insights = parsed;
            }
        }
    } catch (e) {
        console.error('Failed to parse keyInsights', e);
    }

    // Determine severity
    let severity = article.severity?.toLowerCase();
    if (!severity && article.entities) {
        try {
            let ent = article.entities;
            if (typeof ent === 'string') {
                ent = JSON.parse(ent);
            }
            if (ent?.severity) severity = ent.severity.toLowerCase();
        } catch (e) {
            // ignore
        }
    }

    const isAccident = article.category === 'ACCIDENT_INCIDENT';

    const getRiskDetails = (s?: string) => {
        switch (s) {
            case 'fatal': return { color: '#ef4444', label: 'FATAL', glow: '0 0 20px rgba(239, 68, 68, 0.4)' };
            case 'serious': return { color: '#f97316', label: 'SERIOUS', glow: '0 0 20px rgba(249, 115, 22, 0.4)' };
            case 'minor': return { color: '#fbbf24', label: 'MINOR', glow: '0 0 20px rgba(251, 191, 36, 0.4)' };
            default: return { color: '#9ca3af', label: 'UNKNOWN', glow: 'none' };
        }
    };

    const risk = getRiskDetails(severity);

    // Determine the best summary source
    let summary = "No summary available.";

    // 1. Prefer AI Summary if it exists and is substantial
    if (article.aiSummary && article.aiSummary.length > 50 && article.aiSummary !== article.title) {
        summary = article.aiSummary;
    }
    // 2. Fallback to truncated content (Detailed Report) if available (better than short description)
    else if (article.content && article.content.length > 100) {
        // Extract first ~250 chars cleanly (try to end at a period)
        const truncated = article.content.slice(0, 280);
        const lastPeriod = truncated.lastIndexOf('.');
        summary = lastPeriod > 100 ? truncated.slice(0, lastPeriod + 1) : truncated + '...';
    }
    // 3. Last resort: description (often short or tagline)
    else if (article.description) {
        summary = article.description;
    }

    return (
        <div style={{
            width: '100%',
            marginBottom: '32px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            overflow: 'hidden',
            backdropFilter: 'blur(10px)',
        }}>
            {/* Header */}
            <div style={{
                padding: '16px 24px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                fontSize: '0.9rem',
                fontWeight: 600,
                letterSpacing: '0.5px',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                🧠 Executive Intelligence <span style={{ fontSize: '0.7em', padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', color: 'var(--text-muted)' }}>AI-GENERATED</span>
            </div>

            {/* content grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '0',
                borderTop: '1px solid rgba(255,255,255,0.05)'
            }}>
                {/* CARD 1: AI SUMMARY */}
                <div style={{ padding: '24px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <span style={{ fontSize: '1.2rem' }}>📄</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#c084fc', letterSpacing: '1px' }}>EXECUTIVE SUMMARY</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '15px', lineHeight: '1.7', color: 'rgba(255,255,255,0.9)' }}>
                        {summary}
                    </p>
                </div>

                {/* CARD 2: KEY INSIGHTS */}
                <div style={{ padding: '24px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <span style={{ fontSize: '1.2rem' }}>💡</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#facc15', letterSpacing: '1px' }}>KEY INSIGHTS</span>
                    </div>
                    {insights.length > 0 ? (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {insights.map((insight, idx) => (
                                <li key={idx} style={{ marginBottom: '10px', display: 'flex', alignItems: 'start', gap: '8px', fontSize: '14px', color: 'rgba(255,255,255,0.85)' }}>
                                    <span style={{ color: '#c084fc', marginTop: '4px' }}>→</span>
                                    <span>{insight}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                            No key insights generated yet.
                        </p>
                    )}
                </div>

                {/* CARD 3: RISK ASSESSMENT (Only for Accidents) */}
                {isAccident && (
                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <span style={{ fontSize: '1.2rem' }}>🚨</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: risk.color, letterSpacing: '1px' }}>RISK ASSESSMENT</span>
                        </div>

                        <div style={{
                            fontSize: '32px',
                            fontWeight: 800,
                            color: risk.color,
                            textTransform: 'uppercase',
                            textShadow: risk.glow,
                            marginBottom: '12px'
                        }}>
                            {risk.label}
                        </div>

                        <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', color: 'rgba(255,255,255,0.5)' }}>
                            {severity === 'fatal' && "Casualties reported. Full investigation required."}
                            {severity === 'serious' && "Significant incident requiring immediate attention."}
                            {severity === 'minor' && "Low-impact event. No injuries reported."}
                            {!severity && "Severity not yet assessed."}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
