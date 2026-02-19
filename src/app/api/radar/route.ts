import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const lamin = searchParams.get('lamin') || '-90';
        const lamax = searchParams.get('lamax') || '90';
        const lomin = searchParams.get('lomin') || '-180';
        const lomax = searchParams.get('lomax') || '180';

        const response = await axios.get('https://opensky-network.org/api/states/all', {
            params: { lamin, lamax, lomin, lomax },
            timeout: 15000,
            headers: {
                'User-Agent': 'AviationIntelligencePlatform/1.0',
            },
        });

        const states = response.data?.states || [];

        const flights = states.slice(0, 300).map((s: (string | number | boolean | null)[]) => ({
            icao24: s[0],
            callsign: s[1]?.toString().trim() || 'N/A',
            originCountry: s[2],
            longitude: s[5],
            latitude: s[6],
            altitude: s[7] || s[13],
            onGround: s[8],
            velocity: s[9],
            heading: s[10],
            verticalRate: s[11],
        })).filter((f: { latitude: number | null; longitude: number | null }) => f.latitude && f.longitude);

        return NextResponse.json({
            success: true,
            count: flights.length,
            timestamp: response.data?.time || Date.now(),
            flights,
        });
    } catch (error) {
        console.error('[Radar] OpenSky error:', error instanceof Error ? error.message : error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch flight data', flights: [] },
            { status: 200 } // Return 200 with empty data so frontend doesn't break
        );
    }
}
