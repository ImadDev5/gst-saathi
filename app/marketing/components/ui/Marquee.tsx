import { useEffect, useRef } from "react";

interface MarqueeProps {
  children: React.ReactNode;
}

export function Marquee({ children }: MarqueeProps) {
  const marqueeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const marquee = marqueeRef.current;
    if (!marquee) return;
    const clone = marquee.children[0].cloneNode(true);
    marquee.appendChild(clone);
  }, []);

  return (
    <div className="marquee-container overflow-hidden whitespace-nowrap">
      <div ref={marqueeRef} className="marquee-content flex gap-16 items-center">
        {children}
      </div>
    </div>
  );
}
