import { useEffect, useRef } from "react";

interface StatCounterProps {
  value: number;
  suffix?: string;
  label: string;
}

export function StatCounter({ value, suffix = "", label }: StatCounterProps) {
  const counterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const counter = counterRef.current;
    if (!counter) return;

    let current = 0;
    const target = value;
    const increment = target / 50;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        counter.textContent = target.toLocaleString() + suffix;
        clearInterval(timer);
      } else {
        counter.textContent = Math.ceil(current).toLocaleString() + (value > 100 ? "+" : "%");
      }
    }, 40);
  }, []);

  return (
    <div className="text-center">
      <div ref={counterRef} className="text-4xl md:text-5xl font-mono font-bold text-white mb-2">0</div>
      <div className="text-sm text-cyan-400 uppercase tracking-widest">{label}</div>
    </div>
  );
}
