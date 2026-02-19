'use client';

import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

interface RadarMapProps {
    flights: Flight[];
}

export default function RadarMap({ flights }: RadarMapProps) {
    useEffect(() => {
        const map = L.map('radar-map', {
            center: [30, 0],
            zoom: 3,
            minZoom: 2,
            maxZoom: 14,
            zoomControl: true,
        });

        // Dark-themed map tiles
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19,
        }).addTo(map);

        // Custom aircraft icon
        const createAircraftIcon = (heading: number, onGround: boolean) => {
            const color = onGround ? '#f59e0b' : '#3b82f6';
            const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" 
             style="transform: rotate(${heading || 0}deg)">
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" 
                fill="${color}" stroke="#fff" stroke-width="0.5"/>
        </svg>`;
            return L.divIcon({
                html: svg,
                className: '',
                iconSize: [20, 20],
                iconAnchor: [10, 10],
            });
        };

        // Add flight markers
        flights.forEach((flight) => {
            if (flight.latitude && flight.longitude) {
                const marker = L.marker([flight.latitude, flight.longitude], {
                    icon: createAircraftIcon(flight.heading, flight.onGround),
                }).addTo(map);

                const altFt = flight.altitude ? Math.round(flight.altitude * 3.281) : 'N/A';
                const speedKts = flight.velocity ? Math.round(flight.velocity * 1.944) : 'N/A';

                marker.bindPopup(`
          <div style="font-family: Inter, sans-serif; font-size: 13px; min-width: 180px;">
            <div style="font-weight: 700; font-size: 15px; margin-bottom: 8px; color: #1e293b;">
              ${flight.callsign || 'Unknown'}
            </div>
            <div style="display: grid; gap: 4px; font-size: 12px; color: #475569;">
              <div><b>ICAO24:</b> ${flight.icao24}</div>
              <div><b>Country:</b> ${flight.originCountry}</div>
              <div><b>Altitude:</b> ${altFt} ft</div>
              <div><b>Speed:</b> ${speedKts} kts</div>
              <div><b>Heading:</b> ${flight.heading ? Math.round(flight.heading) : 'N/A'}°</div>
              <div><b>Status:</b> ${flight.onGround ? '🛬 On Ground' : '✈️ In Flight'}</div>
              ${flight.verticalRate ? `<div><b>V/S:</b> ${Math.round(flight.verticalRate * 196.85)} ft/min</div>` : ''}
            </div>
          </div>
        `, { maxWidth: 250 });
            }
        });

        return () => {
            map.remove();
        };
    }, [flights]);

    return <div id="radar-map" style={{ width: '100%', height: '100%' }} />;
}
