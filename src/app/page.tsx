'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { APIProvider } from '@vis.gl/react-google-maps';
import { useSpots } from '@/hooks/useSpots';
import { useMapState } from '@/hooks/useMapState';
import { useIsMobile } from '@/hooks/useIsMobile';
import SpotList from '@/components/Sidebar/SpotList';
import SpotDetail from '@/components/Sidebar/SpotDetail';
import SpotForm from '@/components/Sidebar/SpotForm';
import ImportModal from '@/components/UI/ImportModal';
import EspressoLoader from '@/components/UI/EspressoLoader';
import BottomTabBar from '@/components/UI/BottomTabBar';
import type { Tab } from '@/components/UI/BottomTabBar';
import type { CoffeeSpot, CoffeeSpotInput, ListType } from '@/types';
import { LIST_TYPE_LABELS, LIST_TYPE_PINS } from '@/types';

// Lazy-load the map so it only runs client-side
const CoffeeMap = dynamic(() => import('@/components/Map/CoffeeMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center" style={{ background: '#1C0A00' }} suppressHydrationWarning>
      <EspressoLoader label="Loading map…" />
    </div>
  ),
});

/** Visit log — spots with a visited_at date, newest first */
function LogView({ spots, onSelect }: { spots: CoffeeSpot[]; onSelect: (spot: CoffeeSpot) => void }) {
  const safeSpots = Array.isArray(spots) ? spots : [];
  const visited = safeSpots
    .filter((s) => s.visited_at)
    .sort((a, b) => new Date(b.visited_at!).getTime() - new Date(a.visited_at!).getTime());

  return (
    <div className="h-full flex flex-col" style={{ background: '#3D1A00' }} suppressHydrationWarning>
      <div className="p-4 border-b border-caramel/20">
        <h2 className="font-playfair text-cream text-xl">Visit Log</h2>
        <p className="text-cream/40 text-xs mt-1">{visited.length} visits recorded</p>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {visited.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-cream/40">
            <span className="text-4xl mb-2">📓</span>
            <p className="font-lora italic text-sm">No visits logged yet</p>
          </div>
        ) : (
          visited.map((spot) => (
            <button
              key={spot.id}
              onClick={() => onSelect(spot)}
              className="w-full text-left px-4 py-3 border-b border-caramel/10 hover:bg-caramel/10 transition"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={LIST_TYPE_PINS[spot.list_type ?? 'favourite']}
                    alt={spot.list_type ?? 'favourite'}
                    width={12}
                    height={16}
                    className="flex-shrink-0"
                  />
                  <p className="font-playfair text-cream font-medium truncate">{spot.name}</p>
                </div>
                <span className="text-cream/40 text-xs flex-shrink-0">
                  {new Date(spot.visited_at!).toLocaleDateString()}
                </span>
              </div>
              {spot.address && (
                <p className="text-cream/50 text-xs mt-0.5 truncate pl-5">{spot.address}</p>
              )}
              {spot.notes && (
                <p className="text-cream/40 text-xs mt-1 pl-5 font-lora italic line-clamp-1">
                  {spot.notes.slice(0, 80)}
                </p>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/** Me — stats overview */
function MeView({ spots }: { spots: CoffeeSpot[] }) {
  const safeSpots = Array.isArray(spots) ? spots : [];
  const visited = safeSpots.filter((s) => s.visited_at).length;
  const listCounts = (['favourite', 'friend', 'wantto'] as ListType[]).map((lt) => ({
    lt,
    count: safeSpots.filter((s) => (s.list_type ?? 'favourite') === lt).length,
  }));

  return (
    <div className="h-full flex flex-col items-center p-6 overflow-y-auto" style={{ background: '#1C0A00' }} suppressHydrationWarning>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/logo-primary-dark.svg" alt="PhiloCoffeeMap" width={96} height={96} className="rounded-xl mb-4 mt-4" />
      <h2 className="font-playfair text-cream text-2xl mb-1">PhiloCoffeeMap</h2>
      <p className="font-lora text-cream/40 text-sm italic mb-8">Your philosophical coffee journey</p>

      <div className="w-full max-w-sm space-y-3">
        <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: '#3D1A00' }} suppressHydrationWarning>
          <span className="text-cream/70 text-sm">Total spots</span>
          <span className="text-caramel font-bold text-lg">{safeSpots.length}</span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: '#3D1A00' }} suppressHydrationWarning>
          <span className="text-cream/70 text-sm">Places visited</span>
          <span className="text-caramel font-bold text-lg">{visited}</span>
        </div>
        {listCounts.map(({ lt, count }) => (
          <div key={lt} className="flex items-center justify-between p-3 rounded-lg" style={{ background: '#3D1A00' }} suppressHydrationWarning>
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LIST_TYPE_PINS[lt]} alt={lt} width={16} height={21} />
              <span className="text-cream/70 text-sm">{LIST_TYPE_LABELS[lt]}</span>
            </div>
            <span className="text-caramel font-bold text-lg">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const { spots, isLoading, addSpot, updateSpot, deleteSpot, mutate } = useSpots();
  const {
    selectedSpot,
    pendingMarker,
    isAddMode,
    sidebarView,
    openSpot,
    startAddMode,
    movePendingMarker,
    closePanel,
    startEdit,
  } = useMapState();

  const isMobile = useIsMobile();
  const [showImport, setShowImport] = useState(false);
  // Mobile: start closed so map is visible first; desktop: start open
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [activeTab, setActiveTab] = useState<Tab>('map');

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

  function handleSelectSpot(spot: CoffeeSpot) {
    openSpot(spot);
    setActiveTab('map');
    setSidebarOpen(true);
  }

  // On mobile: auto-open sidebar when a spot is tapped or a pin is placed
  function handleSpotClick(spot: CoffeeSpot) {
    if (sidebarView === 'form') {
      setSidebarOpen(true);
      return;
    }
    openSpot(spot);
    setSidebarOpen(true);
  }

  function handleMapClick(lat: number, lng: number) {
    if (sidebarView === 'form') {
      if (isAddMode) {
        movePendingMarker(lat, lng);
      }
      setSidebarOpen(true);
      return;
    }
    startAddMode(lat, lng);
    setSidebarOpen(true);
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

  /** Sidebar content — shared between desktop and mobile layouts */
  const sidebarContent = isLoading ? (
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
  );

  return (
    <APIProvider apiKey={apiKey}>
      <div className="flex flex-col h-screen w-screen overflow-hidden" style={{ background: '#1C0A00' }} suppressHydrationWarning>

        {/* Main content area */}
        <div className="flex-1 overflow-hidden relative">

          {/* ── MAP TAB ── */}
          {activeTab === 'map' && (
            <div className="relative h-full">

              {/* Map — always full screen */}
              <main className="absolute inset-0">
                {isAddMode && (
                  <div
                    className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-full text-sm font-lora italic animate-fade-in"
                    style={{ background: 'rgba(61,26,0,0.9)', color: '#E8D5B7', border: '1px solid #C4783A' }}
                    suppressHydrationWarning
                  >
                    Pin placed — fill in details in the sidebar ☕
                  </div>
                )}
                <CoffeeMap
                  spots={spots}
                  selectedSpot={selectedSpot}
                  pendingLat={pendingMarker?.lat}
                  pendingLng={pendingMarker?.lng}
                  onSpotClick={handleSpotClick}
                  onMapClick={handleMapClick}
                />
              </main>

              {isMobile ? (
                <>
                  {/* ── MOBILE: bottom sheet ── */}
                  <aside
                    className={`
                      absolute bottom-0 left-0 right-0 z-20
                      flex flex-col overflow-hidden
                      rounded-t-2xl border-t border-caramel/30
                      transition-transform duration-300 ease-in-out
                      ${sidebarOpen ? 'translate-y-0' : 'translate-y-full'}
                    `}
                    style={{ background: '#3D1A00', height: '66.666%' }}
                    suppressHydrationWarning
                  >
                    {/* Handle bar — tap to close */}
                    <button
                      onClick={() => setSidebarOpen(false)}
                      className="flex-shrink-0 flex flex-col items-center gap-1 pt-3 pb-2 w-full"
                      aria-label="Close panel"
                    >
                      <div className="w-10 h-1 rounded-full bg-caramel/40" />
                      <svg width="16" height="10" viewBox="0 0 16 10" fill="none" className="text-caramel/50">
                        <path d="M1 1.5L8 8.5L15 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>

                    <div className="flex-1 overflow-hidden">
                      {sidebarContent}
                    </div>
                  </aside>

                  {/* Floating open button — visible when sheet is closed */}
                  {!sidebarOpen && (
                    <button
                      onClick={() => setSidebarOpen(true)}
                      className="absolute bottom-5 right-5 z-30 w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                      style={{ background: '#C4783A' }}
                      aria-label="Open panel"
                      suppressHydrationWarning
                    >
                      <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
                        <path d="M1 11L9 3L17 11" stroke="#1C0A00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  )}
                </>
              ) : (
                <>
                  {/* ── DESKTOP: left sidebar ── */}
                  <aside
                    className={`
                      absolute left-0 top-0 z-20
                      w-80 h-full flex flex-col
                      border-r border-caramel/20 overflow-hidden
                      transition-transform duration-300
                      ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                    `}
                    style={{ background: '#3D1A00' }}
                    suppressHydrationWarning
                  >
                    {sidebarContent}
                  </aside>

                  {/* Desktop toggle tab */}
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="absolute top-1/2 -translate-y-1/2 z-30 w-6 h-12 flex items-center justify-center rounded-r-lg transition-all duration-300"
                    style={{ background: '#C4783A', left: sidebarOpen ? '320px' : '0px' }}
                    title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
                    suppressHydrationWarning
                  >
                    <span className="text-espresso font-bold text-sm">{sidebarOpen ? '‹' : '›'}</span>
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── DISCOVER TAB ── */}
          {activeTab === 'discover' && (
            <div className="h-full overflow-hidden" style={{ background: '#3D1A00' }} suppressHydrationWarning>
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <EspressoLoader />
                </div>
              ) : (
                <SpotList
                  spots={spots}
                  selectedId={selectedSpot?.id}
                  onSelect={handleSelectSpot}
                  onImport={() => setShowImport(true)}
                />
              )}
            </div>
          )}

          {/* ── LOG TAB ── */}
          {activeTab === 'log' && (
            <LogView spots={spots} onSelect={handleSelectSpot} />
          )}

          {/* ── ME TAB ── */}
          {activeTab === 'me' && (
            <MeView spots={spots} />
          )}
        </div>

        {/* Bottom tab bar */}
        <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} />

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
