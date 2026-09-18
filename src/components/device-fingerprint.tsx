"use client";

import { useEffect, useState } from "react";
import { FINGERPRINT_FIELD } from "@/lib/device-signals/field";

/**
 * A hidden field carrying a browser fingerprint, which ties a visitor to the
 * device they already had when their cookie is gone (docs/PLAN.md, Device
 * limiting).
 *
 * The value stays empty until the agent answers, and stays empty for good if
 * it's blocked or fails — the server then falls back to the device cookie
 * alone rather than refusing the post.
 */
export function DeviceFingerprintField() {
  const [visitorId, setVisitorId] = useState("");

  useEffect(() => {
    let cancelled = false;

    // Imported on demand: nothing needs the agent until a form is on screen,
    // and it's the largest thing either form would otherwise ship.
    import("@fingerprintjs/fingerprintjs")
      .then((module) => module.default.load())
      .then((agent) => agent.get())
      .then((result) => {
        if (!cancelled) setVisitorId(result.visitorId);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return <input type="hidden" name={FINGERPRINT_FIELD} value={visitorId} />;
}
