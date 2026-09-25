"use client";

import { useState } from "react";
import { HexColorPicker } from "react-colorful";
import { Label } from "@/components/ui/label";
import { hexToRgb, parseHexInput, rgbToHex } from "./palette";

const CHANNELS = ["R", "G", "B"] as const;

const boxClass =
  "border-input focus-visible:border-ring w-full min-w-0 rounded-md border bg-transparent px-2 py-1 font-mono text-sm outline-none";

/**
 * DrawPin's own colour picker, opened from the colour wheel: a colour square
 * and a hue slider, then the colour as red, green and blue, with its hex code
 * underneath.
 *
 * It replaces the phone's built-in picker, which looks different on every
 * device and, on Android, has no way to type a hex code at all.
 *
 * `onChange` fires continuously while the square is dragged. Deciding when a
 * colour is settled enough to keep in Recent is left to the caller.
 */
export function ColorPanel({
  color,
  onChange,
}: {
  color: string;
  onChange: (color: string) => void;
}) {
  // What's in the hex box while someone is typing; `null` shows the colour.
  const [hexDraft, setHexDraft] = useState<string | null>(null);
  const rgb = hexToRgb(color);

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <HexColorPicker
        color={color}
        onChange={onChange}
        style={{ width: "100%", height: 180 }}
      />

      <div className="flex gap-2">
        {CHANNELS.map((channel, index) => (
          <div key={channel} className="flex flex-1 items-center gap-1">
            <Label
              htmlFor={`color-${channel}`}
              className="text-muted-foreground text-xs"
            >
              {channel}
            </Label>
            <input
              id={`color-${channel}`}
              type="number"
              inputMode="numeric"
              min={0}
              max={255}
              value={rgb[index]}
              onChange={(event) => {
                const next: [number, number, number] = [...rgb];
                next[index] = Number(event.target.value);
                onChange(rgbToHex(next));
              }}
              className={boxClass}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <Label htmlFor="color-hex" className="text-muted-foreground text-xs">
          Hex
        </Label>
        <span className="text-muted-foreground font-mono text-sm" aria-hidden>
          #
        </span>
        <input
          id="color-hex"
          type="text"
          autoComplete="off"
          spellCheck={false}
          // Seven, so a pasted "#RRGGBB" fits before the # is dropped.
          maxLength={7}
          value={hexDraft ?? color.replace("#", "")}
          onChange={(event) => {
            const typed = parseHexInput(event.target.value);
            setHexDraft(typed.draft);
            if (typed.color) onChange(typed.color);
          }}
          // Leaving the box shows the colour actually in use, so a half-typed
          // value doesn't linger looking like it applied.
          onBlur={() => setHexDraft(null)}
          className={`${boxClass} uppercase`}
        />
      </div>
    </div>
  );
}
