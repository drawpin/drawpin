import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `next dev`/`build`/`typegen` otherwise auto-inject a managed block into
  // CLAUDE.md pointing agents at the bundled docs — CLAUDE.md is already our
  // agent-instructions file with its own structure, so keep it hands-off.
  agentRules: false,
  // @tensorflow/tfjs-backend-wasm loads its .wasm binary via a runtime
  // `__dirname` + filename path that Turbopack's output-file tracing
  // doesn't follow, silently leaving it out of the deployed function.
  // Marking it (and nsfwjs, whose model files have the same problem)
  // external keeps them unbundled, so their whole package directories —
  // including the .wasm file — ship as plain node_modules.
  serverExternalPackages: ["@tensorflow/tfjs-backend-wasm", "nsfwjs"],
  experimental: {
    serverActions: {
      // Tile drawings are posted to a Server Action as PNGs up to 1.5 MB
      // (MAX_UPLOAD_BYTES in src/lib/tile-image.ts), plus form overhead.
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
