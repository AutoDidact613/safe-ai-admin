import { useEffect, useRef, useState } from "react";

interface CountUpStatProps {
  label: string;
  value: number | null;
  loading: boolean;
  failed: boolean;
  durationMs?: number;
}

// Ease-out so the count starts fast and settles gently on the final number.
function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export default function CountUpStat({
  label,
  value,
  loading,
  failed,
  durationMs = 1400,
}: CountUpStatProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [settled, setSettled] = useState(false);
  const frameRef = useRef<number | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  // Only start counting once the banner has actually scrolled into view,
  // not the moment the page loads.
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (value === null || !isVisible) return;

    const startTime = performance.now();

    const step = (now: number) => {
      const progress = Math.min((now - startTime) / durationMs, 1);
      setDisplayValue(Math.round(easeOutQuad(progress) * value));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        setSettled(true);
      }
    };

    frameRef.current = requestAnimationFrame(step);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [value, isVisible, durationMs]);

  return (
    <div className="lv2-stat-item" ref={elementRef}>
      {/* Visual counter: purely decorative for assistive tech — it changes
          many times a second while animating, which would otherwise get
          read aloud frame by frame. */}
      <div className="lv2-stat-value" aria-hidden="true">
        {loading ? "…" : failed ? "—" : displayValue.toLocaleString("he-IL")}
      </div>
      <div className="lv2-stat-label">{label}</div>
      {/* Announced once, only after the count-up finishes. */}
      <span className="lv2-sr-only" aria-live="polite">
        {settled && !failed ? `${value?.toLocaleString("he-IL")} ${label}` : ""}
      </span>
    </div>
  );
}
