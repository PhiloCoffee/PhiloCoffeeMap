'use client';
import { useState, useCallback } from 'react';
import type { CoffeeSpot } from '@/types';

export interface PendingMarker {
  lat: number;
  lng: number;
}

export function useMapState() {
  const [selectedSpot, setSelectedSpot] = useState<CoffeeSpot | null>(null);
  const [pendingMarker, setPendingMarker] = useState<PendingMarker | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const [sidebarView, setSidebarView] = useState<'list' | 'detail' | 'form'>('list');

  const openSpot = useCallback((spot: CoffeeSpot) => {
    setSelectedSpot(spot);
    setPendingMarker(null);
    setIsAddMode(false);
    setSidebarView('detail');
  }, []);

  const startAddMode = useCallback((lat: number, lng: number) => {
    setSelectedSpot(null);
    setPendingMarker({ lat, lng });
    setIsAddMode(true);
    setSidebarView('form');
  }, []);

  const closePanel = useCallback(() => {
    setSelectedSpot(null);
    setPendingMarker(null);
    setIsAddMode(false);
    setSidebarView('list');
  }, []);

  const startEdit = useCallback((spot: CoffeeSpot) => {
    setSelectedSpot(spot);
    setIsAddMode(false);
    setSidebarView('form');
  }, []);

  return {
    selectedSpot,
    pendingMarker,
    isAddMode,
    sidebarView,
    openSpot,
    startAddMode,
    closePanel,
    startEdit,
    setSelectedSpot,
  };
}
