'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom animated red marker icon
const createPulsingIcon = () => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="marker-container">
        <div class="marker-pulse"></div>
        <div class="marker-pin"></div>
        <div class="marker-dot"></div>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });
};

// Component to update map view and marker
function MapUpdater({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    // Update map view
    map.setView([latitude, longitude], 17, { animate: true, duration: 0.5 });

    // Remove old marker
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
    }

    // Create new marker with pulsing animation
    const marker = L.marker([latitude, longitude], {
      icon: createPulsingIcon(),
    }).addTo(map);

    markerRef.current = marker;

    return () => {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
      }
    };
  }, [map, latitude, longitude]);

  return null;
}

export default function LeafletMap({ latitude, longitude, accuracy }: { latitude: number; longitude: number; accuracy?: number }) {
  return (
    <>
      {/* CSS for animated marker */}
      <style jsx global>{`
        .leaflet-container {
          background: #1a1a2e;
          font-family: inherit;
          width: 100%;
          height: 100%;
        }
        
        .custom-marker {
          background: transparent !important;
          border: none !important;
        }
        
        .marker-container {
          position: relative;
          width: 30px;
          height: 30px;
        }
        
        .marker-pulse {
          position: absolute;
          width: 30px;
          height: 30px;
          background: rgba(255, 0, 0, 0.3);
          border-radius: 50%;
          animation: pulse 2s ease-out infinite;
          transform-origin: center center;
        }
        
        .marker-pin {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 16px;
          height: 16px;
          background: linear-gradient(135deg, #ff4444 0%, #cc0000 100%);
          border-radius: 50% 50% 50% 0;
          transform: translate(-50%, -50%) rotate(-45deg);
          box-shadow: 0 2px 8px rgba(255, 0, 0, 0.5);
          animation: bounce 1s ease-in-out infinite;
        }
        
        .marker-dot {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 6px;
          height: 6px;
          background: white;
          border-radius: 50%;
          z-index: 1;
        }
        
        @keyframes pulse {
          0% {
            transform: scale(0.5);
            opacity: 1;
          }
          100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }
        
        @keyframes bounce {
          0%, 100% {
            transform: translate(-50%, -50%) rotate(-45deg) translateY(0);
          }
          50% {
            transform: translate(-50%, -50%) rotate(-45deg) translateY(-3px);
          }
        }
        
        .leaflet-control-zoom a {
          background: rgba(15, 32, 39, 0.9) !important;
          color: white !important;
          border-color: rgba(106, 17, 203, 0.3) !important;
        }
        
        .leaflet-control-zoom a:hover {
          background: rgba(106, 17, 203, 0.5) !important;
        }
        
        .leaflet-control-attribution {
          background: rgba(15, 32, 39, 0.8) !important;
          color: rgba(255, 255, 255, 0.5) !important;
        }
        
        .leaflet-control-attribution a {
          color: rgba(106, 17, 203, 0.8) !important;
        }
      `}</style>
      
      <MapContainer
        center={[latitude, longitude]}
        zoom={17}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        {/* Using OpenStreetMap tiles for accuracy */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Accuracy circle */}
        {accuracy && (
          <Circle
            center={[latitude, longitude]}
            radius={accuracy}
            pathOptions={{
              fillColor: '#ff4444',
              fillOpacity: 0.15,
              color: '#ff4444',
              opacity: 0.4,
              weight: 2,
            }}
          />
        )}
        
        {/* Update marker dynamically */}
        <MapUpdater latitude={latitude} longitude={longitude} />
      </MapContainer>
    </>
  );
}
