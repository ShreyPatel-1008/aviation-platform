'use client';

interface KeyDetailsProps {
    entities: {
        airline?: string | null;
        aircraft_type?: string | null;
        registration?: string | null;
        location?: string | null;
        event_date?: string | null; // Database field from entities
        date?: string | null;       // Alternative field name
        authority?: string | null;
        severity?: string | null;
        flightNumber?: string | null;
    } | null;
}

export default function KeyDetails({ entities }: KeyDetailsProps) {
    if (!entities) return null;

    // Normalize keys (handle DB field names vs component guide names)
    // DB: aircraft_type, event_date
    // Guide: aircraftType, date
    const data = {
        airline: entities.airline,
        aircraftType: entities.aircraft_type, // Map DB field
        registration: entities.registration,
        location: entities.location,
        date: entities.event_date || entities.date, // Map DB field with fallback
        authority: entities.authority,
        severity: entities.severity,
    };

    // Format date
    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return null;
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric'
            });
        } catch {
            return dateString;
        }
    };

    const formattedDate = formatDate(data.date);
    const severityLower = data.severity?.toLowerCase() || 'unknown';

    // Check if any data exists
    const hasData = Object.values({ ...data, formattedDate }).some(val => val !== null && val !== undefined && val !== '');

    // Helper for rendering items if value exists
    const renderItem = (label: string, icon: string, value: string | null | undefined, isSeverity = false) => {
        if (!value) return null;
        return (
            <div className="detail-item">
                <div className="detail-label">
                    <span className="label-icon">{icon}</span>
                    {label}
                </div>
                <div className={`detail-value ${isSeverity ? `severity-${value.toLowerCase()}` : ''}`}>
                    {isSeverity ? value.toUpperCase() : value}
                </div>
            </div>
        );
    };

    return (
        <div className="key-details-card">
            <h3 className="card-title">
                <span className="title-icon">📋</span>
                Key Details
            </h3>

            <div className="details-list">
                {!hasData && (
                    <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.9rem', padding: '8px 0' }}>
                        No key details available.
                    </div>
                )}
                {renderItem('AIRLINE', '✈️', data.airline)}
                {renderItem('AIRCRAFT', '🛩', data.aircraftType)}
                {renderItem('REGISTRATION', '🔖', data.registration)}
                {renderItem('LOCATION', '📍', data.location)}
                {renderItem('DATE', '📅', formattedDate)}
                {renderItem('AUTHORITY', '🏛', data.authority)}
                {renderItem('SEVERITY', '🚨', data.severity, true)}
            </div>

            <style jsx>{`
                .key-details-card {
                    background: #1e293b;
                    border: 1px solid #334155;
                    border-radius: 12px;
                    padding: 24px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                    height: 100%;
                }

                .card-title {
                    color: #f1f5f9;
                    font-size: 18px;
                    font-weight: 700;
                    margin: 0 0 20px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .title-icon {
                    font-size: 20px;
                }

                .details-list {
                    display: flex;
                    flex-direction: column;
                    gap: 18px;
                }

                .detail-item {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    transition: all 0.2s ease;
                    padding: 8px;
                    margin: -8px;
                    border-radius: 6px;
                }

                .detail-item:hover {
                    background: rgba(255, 255, 255, 0.03);
                }

                .detail-label {
                    color: #64748b;
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .label-icon {
                    font-size: 14px;
                    opacity: 0.8;
                }

                .detail-value {
                    color: #f1f5f9;
                    font-size: 16px;
                    font-weight: 600;
                    line-height: 1.4;
                }

                /* Severity Color Coding */
                .detail-value.severity-minor, .detail-value.severity-low {
                    color: #fbbf24;
                    text-shadow: 0 0 8px rgba(251, 191, 36, 0.3);
                }

                .detail-value.severity-serious, .detail-value.severity-medium {
                    color: #f97316;
                    text-shadow: 0 0 8px rgba(249, 115, 22, 0.3);
                }

                .detail-value.severity-fatal, .detail-value.severity-high {
                    color: #ef4444;
                    text-shadow: 0 0 8px rgba(239, 68, 68, 0.3);
                }

                .detail-value.severity-unknown {
                    color: #94a3b8;
                }

                /* Responsive Design */
                @media (max-width: 768px) {
                    .key-details-card {
                        padding: 20px;
                    }
                    .card-title {
                        font-size: 16px;
                    }
                    .detail-value {
                        font-size: 15px;
                    }
                    .details-list {
                        gap: 16px;
                    }
                }
            `}</style>
        </div>
    );
}
