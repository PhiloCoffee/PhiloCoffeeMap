'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  Map,
  AdvancedMarker,
  MapMouseEvent,
  useMap,
} from '@vis.gl/react-google-maps';
import CoffeePin from './CoffeePin';
import type { CoffeeSpot } from '@/types';

const ESPRESSO_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1a1208' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#c4783a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1c0a00' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#3d1a00' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1c0a00' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#5c2a00' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d0d1a' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#3d1a00' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#1c0a00' }] },
];

interface CoffeeMapProps {
  spots: CoffeeSpot[];
  selectedSpot: CoffeeSpot | null;
  pendingLat?: number | null;
  pendingLng?: number | null;
  onSpotClick: (spot: CoffeeSpot) => void;
  onMapClick: (lat: number, lng: number) => void;
}

/** Pan to user's location on first load and expose position for a marker */
function MapGeolocation({
  onPosition,
  onError,
}: {
  onPosition: (lat: number, lng: number) => void;
  onError: () => void;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    if (!navigator.geolocation) { onError(); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        map.panTo({ lat, lng });
        map.setZoom(14);
        onPosition(lat, lng);
      },
      () => onError()
    );
  }, [map, onPosition, onError]);
  return null;
}

export default function CoffeeMap({
  spots, selectedSpot, pendingLat, pendingLng, onSpotClick, onMapClick,
}: CoffeeMapProps) {
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [geoBlocked, setGeoBlocked] = useState(false);

  const handleMapClick = useCallback(
    (e: MapMouseEvent) => {
      if (!e.detail?.latLng) return;
      onMapClick(e.detail.latLng.lat, e.detail.latLng.lng);
    },
    [onMapClick]
  );

  const handlePosition = useCallback((lat: number, lng: number) => {
    setUserPos({ lat, lng });
  }, []);

  const handleGeoError = useCallback(() => setGeoBlocked(true), []);

  return (
    <Map
      defaultCenter={{ lat: 39.95, lng: -75.16 }}
      defaultZoom={12}
      gestureHandling="greedy"
      disableDefaultUI={false}
      mapTypeControl={false}
      streetViewControl={false}
      fullscreenControl={false}
      mapId={mapId}
      styles={mapId ? undefined : ESPRESSO_MAP_STYLE}
      onClick={handleMapClick}
      className="w-full h-full"
    >
      <MapGeolocation onPosition={handlePosition} onError={handleGeoError} />

      {geoBlocked && (
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-full text-xs font-lora pointer-events-none"
          style={{ background: 'rgba(28,10,0,0.85)', color: '#E8D5B7', border: '1px solid #C4783A55' }}
        >
          Location unavailable — requires HTTPS
        </div>
      )}

      {userPos && (
        <AdvancedMarker position={userPos} title="You are here">
          <div style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#4A90E2',
            border: '3px solid #fff',
            boxShadow: '0 0 0 3px rgba(74,144,226,0.35)',
          }} />
        </AdvancedMarker>
      )}

      {spots.map((spot) => (
        <AdvancedMarker
          key={spot.id}
          position={{ lat: spot.lat, lng: spot.lng }}
          onClick={() => onSpotClick(spot)}
          title={spot.name}
        >
          <CoffeePin listType={spot.list_type} selected={selectedSpot?.id === spot.id} />
        </AdvancedMarker>
      ))}

      {pendingLat != null && pendingLng != null && (
        <AdvancedMarker position={{ lat: pendingLat, lng: pendingLng }}>
          <CoffeePin selected />
        </AdvancedMarker>
      )}
    </Map>
  );
}
