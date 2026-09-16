import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `next dev`/`build`/`typegen` otherwise auto-inject a managed block into
  // CLAUDE.md pointing agents at the bundled docs — CLAUDE.md is already our
  // agent-instructions file with its own structure, so keep it hands-off.
  agentRules: false,
  experimental: {
    serverActions: {
      // Tile drawings are posted to a Server Action as PNGs up to 1.5 MB
      // (MAX_UPLOAD_BYTES in src/lib/tile-image.ts), plus form overhead.
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
