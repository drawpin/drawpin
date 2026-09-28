import { defineConfig, mergeConfig } from "vitest/config";
import base from "./vitest.config.mjs";

// The moderation test set only (src/lib/moderation/moderation.eval.ts): it
// calls OpenAI and reads a private, git-ignored folder, so it never runs with
// the normal suite or in CI. `npm run moderation:eval`.
export default mergeConfig(
  base,
  defineConfig({
    test: { include: ["src/**/*.eval.ts"], environment: "node" },
  }),
);
