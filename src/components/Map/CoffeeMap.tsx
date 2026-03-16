'use client';
import { useCallback } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  MapMouseEvent,
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

function MapInner({ spots, selectedSpot, pendingLat, pendingLng, onSpotClick, onMapClick }: CoffeeMapProps) {
  const handleMapClick = useCallback(
    (e: MapMouseEvent) => {
      if (!e.detail?.latLng) return;
      onMapClick(e.detail.latLng.lat, e.detail.latLng.lng);
    },
    [onMapClick]
  );

  return (
    <Map
      defaultCenter={{ lat: 25.0, lng: 121.5 }}
      defaultZoom={12}
      gestureHandling="greedy"
      disableDefaultUI={false}
      mapTypeControl={false}
      streetViewControl={false}
      fullscreenControl={false}
      styles={ESPRESSO_MAP_STYLE}
      onClick={handleMapClick}
      className="w-full h-full"
    >
      {spots.map((spot) => (
        <AdvancedMarker
          key={spot.id}
          position={{ lat: spot.lat, lng: spot.lng }}
          onClick={() => onSpotClick(spot)}
          title={spot.name}
        >
          <CoffeePin vibe={spot.vibe} selected={selectedSpot?.id === spot.id} />
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

export default function CoffeeMap(props: CoffeeMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

  return (
    <APIProvider apiKey={apiKey}>
      <MapInner {...props} />
    </APIProvider>
  );
}
