'use client';

interface PhilosophyQuoteProps {
  quote: string;
  className?: string;
}

export default function PhilosophyQuote({ quote, className = '' }: PhilosophyQuoteProps) {
  return (
    <blockquote
      className={`border-l-2 border-symbol-gold pl-3 py-1 text-foam font-lora italic text-sm leading-relaxed ${className}`}
    >
      <span className="text-symbol-gold mr-1">&quot;</span>
      {quote}
      <span className="text-symbol-gold ml-1">&quot;</span>
    </blockquote>
  );
}
