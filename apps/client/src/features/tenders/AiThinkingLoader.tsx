// src/components/AiThinkingLoader.tsx

interface AiThinkingLoaderProps {
    color?: string
}

export default function AiThinkingLoader({ color }: AiThinkingLoaderProps) {
  return (
    <span className="ai-thinking-dots">
      <span style={{ background: color || 'var(--text-secondary)' }} />
      <span style={{ background: color || 'var(--text-secondary)' }} />
      <span style={{ background: color || 'var(--text-secondary)' }} />
    </span>
  )
}
