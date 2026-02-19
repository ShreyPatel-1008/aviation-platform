'use client';

// components/KeyDetails.tsx
export default function KeyDetails({ article }: { article: any }) {
    const { entities = {}, publishedAt } = article;

    // Format date
    const dateStr = entities.event_date || (publishedAt ? new Date(publishedAt).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
    }) : 'Unknown');

    // Helper for severity color
    const getSevColor = (s: string) => {
        const sv = s?.toLowerCase();
        if (sv === 'fatal' || sv === 'high') return '#ef4444';
        if (sv === 'serious' || sv === 'medium') return '#f97316';
        if (sv === 'minor' || sv === 'low') return '#eab308';
        return '#94a3b8';
    };

    return (
        <div className="key-details-card">
            <h3 className="card-title">📋 Key Details</h3>

            <div className="details-list">
                {/* Airline */}
                {entities.airline && (
                    <div className="detail-item">
                        <div className="detail-label">✈️ AIRLINE</div>
                        <div className="detail-value">{entities.airline}</div>
                    </div>
                )}

                {/* Aircraft */}
                {entities.aircraft_type && (
                    <div className="detail-item">
                        <div className="detail-label">🛫 AIRCRAFT</div>
                        <div className="detail-value">{entities.aircraft_type}</div>
                    </div>
                )}

                {/* Location */}
                {entities.location && (
                    <div className="detail-item">
                        <div className="detail-label">📍 LOCATION</div>
                        <div className="detail-value">{entities.location}</div>
                    </div>
                )}

                {/* Date */}
                <div className="detail-item">
                    <div className="detail-label">📅 DATE</div>
                    <div className="detail-value">{dateStr}</div>
                </div>

                {/* Authority */}
                {entities.authority && (
                    <div className="detail-item">
                        <div className="detail-label">🏛️ AUTHORITY</div>
                        <div className="detail-value">{entities.authority}</div>
                    </div>
                )}

                {/* Severity */}
                {entities.severity && (
                    <div className="detail-item">
                        <div className="detail-label">🚨 SEVERITY</div>
                        <div
                            className="detail-value"
                            style={{ color: getSevColor(entities.severity), fontWeight: 800 }}
                        >
                            {entities.severity.toUpperCase()}
                        </div>
                    </div>
                )}
            </div>

            <style jsx>{`
                .key-details-card {
                    background: #1e2030; /* Dark blue/slate background matches screenshot */
                    border-radius: 12px;
                    padding: 24px;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    height: 100%;
                }
                .card-title {
                    margin: 0 0 24px;
                    font-size: 1.1rem;
                    color: #fff;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .details-list {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                .detail-label {
                    font-size: 0.7rem;
                    color: #64748b;
                    font-weight: 700;
                    margin-bottom: 4px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .detail-value {
                    color: #f1f5f9;
                    font-size: 0.95rem;
                    font-weight: 600;
                }
            `}</style>
        </div>
    );
}
