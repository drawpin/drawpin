"use client";

import { PrinterIcon } from "@phosphor-icons/react";

/**
 * Prints the board's QR card on its own: everything else on the page is
 * hidden for print (`print-card`, globals.css).
 */
export function PrintCardButton({ className }: { className: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={className}>
      <PrinterIcon weight="bold" className="size-5" />
      Print card
    </button>
  );
}
