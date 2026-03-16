'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { APIProvider } from '@vis.gl/react-google-maps';
import { useSpots } from '@/hooks/useSpots';
import { useMapState } from '@/hooks/useMapState';
import SpotList from '@/components/Sidebar/SpotList';
import SpotDetail from '@/components/Sidebar/SpotDetail';
import SpotForm from '@/components/Sidebar/SpotForm';
import ImportModal from '@/components/UI/ImportModal';
import EspressoLoader from '@/components/UI/EspressoLoader';
import type { CoffeeSpotInput } from '@/types';

// Lazy-load the map so it only runs client-side
const CoffeeMap = dynamic(() => import('@/components/Map/CoffeeMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center" style={{ background: '#1C0A00' }}>
      <EspressoLoader label="Loading map…" />
    </div>
  ),
});

export default function Home() {
  const { spots, isLoading, addSpot, updateSpot, deleteSpot, mutate } = useSpots();
  const {
    selectedSpot,
    pendingMarker,
    isAddMode,
    sidebarView,
    openSpot,
    startAddMode,
    closePanel,
    startEdit,
  } = useMapState();

  const [showImport, setShowImport] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  async function handleSave(data: CoffeeSpotInput) {
    if (selectedSpot && !isAddMode) {
      await updateSpot(selectedSpot.id, data);
    } else {
      await addSpot(data);
    }
    closePanel();
  }

  async function handleDelete() {
    if (!selectedSpot) return;
    await deleteSpot(selectedSpot.id);
    closePanel();
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

  return (
    <APIProvider apiKey={apiKey}>
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: '#1C0A00' }}>
      {/* Sidebar */}
      <aside
        className={`
          flex-shrink-0 w-80 h-full flex flex-col
          border-r border-caramel/20 overflow-hidden
          transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          relative z-10
        `}
        style={{ background: '#3D1A00' }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <EspressoLoader />
          </div>
        ) : (
          <>
            {sidebarView === 'list' && (
              <SpotList
                spots={spots}
                selectedId={selectedSpot?.id}
                onSelect={openSpot}
                onImport={() => setShowImport(true)}
              />
            )}
            {sidebarView === 'detail' && selectedSpot && (
              <SpotDetail
                spot={selectedSpot}
                onClose={closePanel}
                onEdit={() => startEdit(selectedSpot)}
                onDelete={handleDelete}
              />
            )}
            {sidebarView === 'form' && (
              <SpotForm
                initialLat={pendingMarker?.lat}
                initialLng={pendingMarker?.lng}
                existingSpot={isAddMode ? null : selectedSpot}
                onSave={handleSave}
                onCancel={closePanel}
              />
            )}
          </>
        )}
      </aside>

      {/* Toggle sidebar button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-6 h-12 flex items-center justify-center rounded-r-lg transition-all duration-300"
        style={{
          background: '#C4783A',
          left: sidebarOpen ? '320px' : '0px',
        }}
        title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
      >
        <span className="text-espresso font-bold text-sm">{sidebarOpen ? '‹' : '›'}</span>
      </button>

      {/* Map */}
      <main className="flex-1 h-full relative">
        {/* Add mode hint */}
        {isAddMode && (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-full text-sm font-lora italic animate-fade-in"
            style={{ background: 'rgba(61,26,0,0.9)', color: '#E8D5B7', border: '1px solid #C4783A' }}
          >
            Pin placed — fill in details in the sidebar ☕
          </div>
        )}

        <CoffeeMap
          spots={spots}
          selectedSpot={selectedSpot}
          pendingLat={pendingMarker?.lat}
          pendingLng={pendingMarker?.lng}
          onSpotClick={openSpot}
          onMapClick={startAddMode}
        />
      </main>

      {/* Import modal */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={() => { mutate(); setShowImport(false); }}
        />
      )}
    </div>
    </APIProvider>
  );
}
