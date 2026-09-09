/**
 * client/src/features/agents/AgentIcon.tsx
 *
 * Renders an agent's AI-generated SVG icon as an <img> data URI rather than
 * via dangerouslySetInnerHTML — an SVG rendered as an image is treated as
 * static image data by the browser (embedded <script>/event-handler
 * attributes do not execute), which keeps a maliciously crafted icon from
 * running script in every visitor's session.
 */

import { useMemo } from "react";

export default function AgentIcon({
  svg,
  fallback = "🤖",
}: {
  svg?: string;
  fallback?: string;
}) {
  const dataUri = useMemo(() => {
    if (!svg) return null;
    try {
      return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
    } catch {
      return null;
    }
  }, [svg]);

  if (!dataUri) return <span className="agent-icon-placeholder">{fallback}</span>;

  return <img src={dataUri} alt="" />;
}
