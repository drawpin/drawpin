"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Shows a full-size sheet scaled down to fit the screen. Printing ignores the
 * scale: the print stylesheet lays the sheet out at its real size.
 */
export function Preview({ children }: { children: ReactNode }) {
  const frame = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number>();

  useEffect(() => {
    const outer = frame.current;
    const inner = sheet.current;
    if (!outer || !inner) return;

    const fit = () => {
      const next = Math.min(1, outer.clientWidth / inner.offsetWidth);
      setScale(next);
      setHeight(inner.offsetHeight * next);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(outer);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={frame} className="print-frame w-full" style={{ height }}>
      <div
        ref={sheet}
        className="print-scale w-fit origin-top-left rounded-sm shadow-[0_2px_12px_rgb(15_27_45/0.18)]"
        style={{ transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}

/** Opens the browser's print dialog, which also saves as PDF. */
export function PrintButton() {
  return (
    <Button
      type="button"
      size="lg"
      className="w-full"
      onClick={() => window.print()}
    >
      Print or save as PDF
    </Button>
  );
}
