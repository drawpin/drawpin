"use client";

import { type ComponentProps, useState } from "react";
import { Input } from "@/components/ui/input";
import { codeDigits, findCode } from "@/lib/sign-in-code";

/**
 * The box a sign-in code from an email is typed or pasted into, for owners
 * and customers alike (ADR-010, issue #172).
 *
 * It keeps only digits, so "1234 5678" or "1234-5678" goes in as the code.
 * Pasting text that holds a code (a line copied from the email) replaces
 * what's there with just the code. `one-time-code` lets iOS and Android
 * offer a code that just arrived by email or text above the keyboard.
 */
export function CodeInput(
  props: Omit<
    ComponentProps<typeof Input>,
    "value" | "defaultValue" | "onChange" | "onPaste" | "type" | "className"
  >,
) {
  const [code, setCode] = useState("");

  return (
    <Input
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]*"
      required
      {...props}
      value={code}
      onChange={(event) => setCode(codeDigits(event.target.value))}
      onPaste={(event) => {
        const found = findCode(event.clipboardData.getData("text"));
        // Anything else (a single digit, say) pastes as usual, through
        // onChange.
        if (found) {
          event.preventDefault();
          setCode(found);
        }
      }}
      className="text-center font-mono text-lg tracking-[0.4em]"
    />
  );
}
