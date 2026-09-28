// @vitest-environment node
/**
 * The moderation test set: every drawing in the private `moderation-eval/`
 * folder, run through the real pipeline — the same image processing a post
 * gets, then the blocklist, OpenAI's moderation, the nudity check and the
 * vision check — and compared with how it should be handled.
 *
 * Run with `npm run moderation:eval`. It isn't part of the normal suite or
 * CI: it calls OpenAI (about a cent a run) and needs drawings with slurs and
 * hate symbols in them, which live in a git-ignored folder, never in this
 * public repository. With no folder it skips.
 *
 * `moderation-eval/cases.json` lists each drawing:
 * `{ file, displayName, caption, expect: "block" | "allow", category, note }`.
 * The vision check doesn't ship unless every case comes out as expected
 * (ADR-006).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { processTileImage } from "@/lib/tile-image";
import { moderateTile } from "./moderate-tile";

const DIR = path.resolve("moderation-eval");

type Case = {
  file: string;
  displayName: string | null;
  caption: string | null;
  expect: "block" | "allow";
  category: string | null;
  note: string;
};

/** The two keys this needs from `.env.local`, without loading the whole app's env. */
function localKeys(): { apiKey: string; blocklist: string | undefined } {
  const text = readFileSync(".env.local", "utf8");
  const read = (name: string) =>
    text.match(new RegExp(`^${name}=(.*)$`, "m"))?.[1]?.trim() || undefined;
  const apiKey = read("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY isn't set in .env.local");
  return { apiKey, blocklist: read("MODERATION_BLOCKLIST") };
}

describe.skipIf(!existsSync(path.join(DIR, "cases.json")))(
  "moderation test set",
  () => {
    it("handles every drawing as expected", async () => {
      const cases: Case[] = JSON.parse(
        readFileSync(path.join(DIR, "cases.json"), "utf8"),
      );
      const { apiKey, blocklist } = localKeys();
      const blockedTerms = blocklist
        ? blocklist.split(",").map((term) => term.trim())
        : [];

      const rows = [];
      for (const testCase of cases) {
        const image = await processTileImage(
          readFileSync(path.join(DIR, "images", testCase.file)),
        );
        const decision = await moderateTile(
          {
            displayName: testCase.displayName,
            caption: testCase.caption,
            image,
          },
          { apiKey, blockedTerms },
        );
        const got = decision.allowed ? "allow" : "block";
        rows.push({
          file: testCase.file,
          expected: testCase.expect,
          got,
          category: decision.allowed ? "" : decision.category,
          reason: decision.allowed ? "" : decision.reason,
          ok: got === testCase.expect ? "✓" : "✗",
          note: testCase.note,
        });
      }

      const missed = rows.filter((row) => row.ok === "✗");
      const summary =
        `${rows.length - missed.length}/${rows.length} as expected — ` +
        `${rows.filter((r) => r.expected === "block" && r.got === "block").length}/` +
        `${rows.filter((r) => r.expected === "block").length} harmful caught, ` +
        `${rows.filter((r) => r.expected === "allow" && r.got === "block").length} harmless wrongly blocked`;

      // Kept next to the drawings, so each run can be compared with the last.
      writeFileSync(
        path.join(DIR, "last-run.json"),
        JSON.stringify(
          { at: new Date().toISOString(), summary, rows },
          null,
          2,
        ),
      );
      console.table(rows);
      console.log(summary);
      expect(missed).toEqual([]);
    }, 300_000);
  },
);
