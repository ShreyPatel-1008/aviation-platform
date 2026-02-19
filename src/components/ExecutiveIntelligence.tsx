'use client';

// components/ExecutiveIntelligence.tsx
// AI-generated executive summary with confidence scores and key insights

export default function ExecutiveIntelligence({ article }: { article: any }) {
    return (
        <section className="section executive-intelligence">
            <div className="section-header">
                <span className="section-icon">🧠</span>
                <h2>Executive Intelligence</h2>
                <span className="ai-badge">AI-Generated</span>
            </div>

            <div className="intel-grid">

                {/* Confidence Score */}
                <div className="intel-card confidence">
                    <div className="card-icon">🎯</div>
                    <div className="card-content">
                        <h4>Classification Confidence</h4>
                        <div className="confidence-bar">
                            <div
                                className="confidence-fill"
                                style={{ width: `${(article.aiConfidence || 0) * 100}%` }}
                            />
                        </div>
                        <p className="confidence-text">
                            {((article.aiConfidence || 0) * 100).toFixed(1)}% confident
                        </p>
                    </div>
                </div>

                {/* AI Summary */}
                <div className="intel-card summary">
                    <div className="card-icon">📝</div>
                    <div className="card-content">
                        <h4>AI Summary</h4>
                        <p className="summary-text">{article.aiSummary}</p>
                    </div>
                </div>

                {/* Key Insights (extracted from summary) */}
                {article.keyPoints && article.keyPoints.length > 0 && (
                    <div className="intel-card insights">
                        <div className="card-icon">💡</div>
                        <div className="card-content">
                            <h4>Key Insights</h4>
                            <ul className="insights-list">
                                {article.keyPoints.map((point: string, i: number) => (
                                    <li key={i}>{point}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                {/* Risk Assessment (for accidents) */}
                {article.category === 'ACCIDENT_INCIDENT' && article.entities?.severity && (
                    <div className={`intel-card risk risk-${article.entities.severity}`}>
                        <div className="card-icon">🚨</div>
                        <div className="card-content">
                            <h4>Risk Assessment</h4>
                            <div className="risk-level">{article.entities.severity.toUpperCase()}</div>
                            <p className="risk-description">
                                {getRiskDescription(article.entities.severity)}
                            </p>
                        </div>
                    </div>
                )}

            </div>

            <style jsx>{`
        .executive-intelligence {
          background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
          border-radius: 16px;
          padding: 32px;
          margin: 32px 0;
          border: 1px solid rgba(139, 92, 246, 0.2);
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }

        .section-icon {
          font-size: 28px;
        }

        .section-header h2 {
          color: #f1f5f9;
          font-size: 24px;
          font-weight: 700;
          margin: 0;
          flex: 1;
        }

        .ai-badge {
          background: rgba(139, 92, 246, 0.2);
          color: #a78bfa;
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 100px;
          padding: 4px 12px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .intel-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 16px;
        }

        .intel-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 20px;
          display: flex;
          gap: 16px;
        }

        .card-icon {
          font-size: 32px;
          flex-shrink: 0;
        }

        .card-content h4 {
          color: #cbd5e1;
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .summary-text {
          color: #e2e8f0;
          font-size: 15px;
          line-height: 1.6;
          margin: 0;
        }

        .confidence-bar {
          width: 100%;
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 100px;
          overflow: hidden;
          margin: 8px 0;
        }

        .confidence-fill {
          height: 100%;
          background: linear-gradient(90deg, #8b5cf6, #6366f1);
          border-radius: 100px;
          transition: width 0.6s ease;
        }

        .confidence-text {
          color: #a78bfa;
          font-size: 13px;
          font-weight: 600;
          margin: 4px 0 0;
        }

        .insights-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .insights-list li {
          color: #e2e8f0;
          font-size: 14px;
          line-height: 1.6;
          padding-left: 20px;
          position: relative;
          margin-bottom: 8px;
        }

        .insights-list li::before {
          content: '→';
          position: absolute;
          left: 0;
          color: #8b5cf6;
          font-weight: 700;
        }

        .risk-level {
          font-size: 18px;
          font-weight: 700;
          margin: 8px 0;
        }

        .risk-minor .risk-level { color: #fbbf24; }
        .risk-serious .risk-level { color: #f97316; }
        .risk-fatal .risk-level { color: #ef4444; }

        .risk-description {
          color: #cbd5e1;
          font-size: 13px;
          margin: 0;
        }
      `}</style>
        </section>
    );
}

function getRiskDescription(severity: string): string {
    const descriptions = {
        minor: 'Low-impact incident with no injuries or significant damage.',
        serious: 'Significant incident requiring immediate attention and investigation.',
        fatal: 'Critical incident with casualties. Full investigation underway.',
        unknown: 'Severity assessment pending official reports.',
    };
    return descriptions[severity as keyof typeof descriptions] || descriptions.unknown;
}
