'use client';
import useSWR from 'swr';
import type { CoffeeSpot, CoffeeSpotInput } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useSpots() {
  const { data, error, isLoading, mutate } = useSWR<CoffeeSpot[]>('/api/spots', fetcher);

  async function addSpot(input: CoffeeSpotInput): Promise<CoffeeSpot> {
    const res = await fetch('/api/spots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const spot = await res.json();
    mutate();
    return spot;
  }

  async function updateSpot(id: number, input: Partial<CoffeeSpotInput>): Promise<CoffeeSpot> {
    const res = await fetch(`/api/spots/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const spot = await res.json();
    mutate();
    return spot;
  }

  async function deleteSpot(id: number): Promise<void> {
    await fetch(`/api/spots/${id}`, { method: 'DELETE' });
    mutate();
  }

  return {
    spots: data ?? [],
    isLoading,
    error,
    addSpot,
    updateSpot,
    deleteSpot,
    mutate,
  };
}
