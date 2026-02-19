'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import map to avoid SSR issues
const MapComponent = dynamic(() => import('@/components/RadarMap'), {
    ssr: false,
    loading: () => (
        <div className="loading-container" style={{ height: '100%' }}>
            <div className="loading-spinner" />
            <p>Loading map...</p>
        </div>
    ),
});

interface Flight {
    icao24: string;
    callsign: string;
    originCountry: string;
    longitude: number;
    latitude: number;
    altitude: number;
    onGround: boolean;
    velocity: number;
    heading: number;
    verticalRate: number;
}

export default function RadarPage() {
    const [flights, setFlights] = useState<Flight[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const fetchFlights = useCallback(async () => {
        try {
            const res = await fetch('/api/radar');
            const data = await res.json();
            if (data.flights) {
                setFlights(data.flights);
                setLastUpdate(new Date());
            }
        } catch (error) {
            console.error('Failed to fetch flights:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFlights();

        if (autoRefresh) {
            intervalRef.current = setInterval(fetchFlights, 15000);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [fetchFlights, autoRefresh]);

    const inAir = flights.filter(f => !f.onGround).length;
    const onGround = flights.filter(f => f.onGround).length;
    const countries = new Set(flights.map(f => f.originCountry)).size;

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>🛩️ Flight Radar</h1>
                    <p>Real-time aircraft positions via OpenSky Network ADS-B data</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className={`btn ${autoRefresh ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setAutoRefresh(!autoRefresh)}
                    >
                        {autoRefresh ? '⏸ Auto-Refresh ON' : '▶ Auto-Refresh OFF'}
                    </button>
                    <button className="btn btn-ghost" onClick={fetchFlights}>
                        🔄 Refresh Now
                    </button>
                </div>
            </div>

            <div className="radar-stats">
                <div className="radar-stat">
                    <span style={{ fontSize: '1.3rem' }}>✈️</span>
                    <div>
                        <div className="value">{flights.length}</div>
                        <div className="label">Total Aircraft</div>
                    </div>
                </div>
                <div className="radar-stat">
                    <span style={{ fontSize: '1.3rem' }}>🛫</span>
                    <div>
                        <div className="value">{inAir}</div>
                        <div className="label">In Air</div>
                    </div>
                </div>
                <div className="radar-stat">
                    <span style={{ fontSize: '1.3rem' }}>🛬</span>
                    <div>
                        <div className="value">{onGround}</div>
                        <div className="label">On Ground</div>
                    </div>
                </div>
                <div className="radar-stat">
                    <span style={{ fontSize: '1.3rem' }}>🌍</span>
                    <div>
                        <div className="value">{countries}</div>
                        <div className="label">Countries</div>
                    </div>
                </div>
                {lastUpdate && (
                    <div className="radar-stat">
                        <span style={{ fontSize: '1.3rem' }}>🕐</span>
                        <div>
                            <div className="value" style={{ fontSize: '0.85rem' }}>
                                {lastUpdate.toLocaleTimeString()}
                            </div>
                            <div className="label">Last Update</div>
                        </div>
                    </div>
                )}
            </div>

            <div className="radar-container">
                {loading ? (
                    <div className="loading-container" style={{ height: '100%' }}>
                        <div className="loading-spinner" />
                        <p>Connecting to ADS-B network...</p>
                    </div>
                ) : (
                    <MapComponent flights={flights} />
                )}
            </div>
        </div>
    );
}
