interface SparklineProps {
  values: number[];
}

function buildPoints(values: number[]): string {
  const width = 100;
  const height = 28;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min;
  const step = values.length > 1 ? width / (values.length - 1) : 0;

  return values
    .map((value, index) => {
      const x = index * step;
      const y = range === 0 ? height / 2 : height - ((value - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

// Needs at least two points to draw a meaningful trend line.
export default function Sparkline({ values }: SparklineProps) {
  if (values.length < 2) return null;

  return (
    <svg className="dash-sparkline" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">
      <polyline
        points={buildPoints(values)}
        fill="none"
        stroke="var(--lv2-accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
