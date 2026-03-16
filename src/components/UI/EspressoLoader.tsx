'use client';

export default function EspressoLoader({ label = 'Pulling espresso…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-12 h-16">
        {/* Portafilter */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-8 bg-espresso border-2 border-caramel rounded-b-full" />
        {/* Cup */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-6 bg-roasted border border-caramel rounded-sm overflow-hidden">
          {/* Espresso fill animation */}
          <div className="absolute bottom-0 left-0 right-0 bg-caramel animate-espresso-fill" />
        </div>
        {/* Steam */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-0.5 rounded-full bg-foam animate-steam-rise opacity-0"
              style={{ animationDelay: `${i * 0.3}s`, height: '12px' }}
            />
          ))}
        </div>
      </div>
      <p className="text-cream font-lora text-sm italic">{label}</p>
    </div>
  );
}
