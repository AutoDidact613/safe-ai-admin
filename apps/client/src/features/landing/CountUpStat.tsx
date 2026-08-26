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
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === null) return;

    const startTime = performance.now();

    const step = (now: number) => {
      const progress = Math.min((now - startTime) / durationMs, 1);
      setDisplayValue(Math.round(easeOutQuad(progress) * value));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      }
    };

    frameRef.current = requestAnimationFrame(step);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [value, durationMs]);

  return (
    <div className="lv2-stat-item">
      <div className="lv2-stat-value">
        {loading ? "…" : failed ? "—" : displayValue.toLocaleString("he-IL")}
      </div>
      <div className="lv2-stat-label">{label}</div>
    </div>
  );
}
