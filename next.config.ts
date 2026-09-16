import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `next dev`/`build`/`typegen` otherwise auto-inject a managed block into
  // CLAUDE.md pointing agents at the bundled docs — CLAUDE.md is already our
  // agent-instructions file with its own structure, so keep it hands-off.
  agentRules: false,
};

export default nextConfig;
