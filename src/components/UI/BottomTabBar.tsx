'use client';

export type Tab = 'map' | 'discover' | 'log' | 'me';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'map',      label: 'Map',      icon: '/icons/tab-map.svg' },
  { id: 'discover', label: 'Discover', icon: '/icons/tab-discover.svg' },
  { id: 'log',      label: 'Log',      icon: '/icons/tab-log.svg' },
  { id: 'me',       label: 'Me',       icon: '/icons/tab-me.svg' },
];

interface BottomTabBarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export default function BottomTabBar({ activeTab, onTabChange }: BottomTabBarProps) {
  return (
    <nav
      className="flex items-center justify-around border-t border-caramel/20 flex-shrink-0"
      style={{ background: '#1C0A00', height: 56 }}
      suppressHydrationWarning
    >
      {TABS.map(({ id, label, icon }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className="flex flex-col items-center gap-0.5 py-2 px-4 transition-opacity"
            style={{ opacity: active ? 1 : 0.45, minWidth: 60 }}
            suppressHydrationWarning
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={icon}
              alt={label}
              width={24}
              height={24}
              style={{ filter: active ? 'brightness(1.4) sepia(0.4) saturate(3) hue-rotate(-10deg)' : undefined }}
              suppressHydrationWarning
            />
            <span
              className="text-xs font-lora"
              style={{ color: active ? '#C4783A' : '#E8D5B7' }}
              suppressHydrationWarning
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
