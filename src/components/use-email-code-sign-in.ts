"use client";

import { useActionState, useEffect, useState } from "react";
import {
  type EmailSignInState,
  sendEmailCode,
  verifyEmailCode,
} from "@/app/auth/email-sign-in";
import {
  clearPendingEmail,
  readPendingEmail,
  savePendingEmail,
} from "@/lib/pending-email-code";

const idle: EmailSignInState = { status: "idle" };

/**
 * The state behind signing in with an emailed code (ADR-010), for the
 * sign-in sheet and page (`SignInPanel`).
 *
 * The code step reopens by itself for a while after a code is sent, since a
 * phone often reloads the page while its person reads their email, and a
 * person can also jump to it with an address they already hold a code for.
 */
export function useEmailCodeSignIn() {
  const [token, setToken] = useState<string | null>(null);
  const [sent, send, sending] = useActionState(sendEmailCode, idle);
  const [checked, check, checking] = useActionState(verifyEmailCode, idle);
  // Lets "use a different email" go back a step without a server round trip.
  const [restart, setRestart] = useState(0);
  // An address whose code arrived before this page loaded, or one typed in
  // for "Already have a code?".
  const [earlier, setEarlier] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    const pending = readPendingEmail("customer");
    if (pending) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- storage is only readable after hydration
      setEarlier(pending);
      setRestored(true);
    }
  }, []);

  useEffect(() => {
    if (sent.status === "sent") savePendingEmail(sent.email, "customer");
  }, [sent]);

  useEffect(() => {
    if (checked.status === "error" && checked.email) {
      savePendingEmail(checked.email, "customer");
    }
  }, [checked]);

  const email = earlier ?? (sent.status === "sent" ? sent.email : null);
  const codeEmail = email && restart === 0 ? email : null;

  return {
    /** Cloudflare's token for the email step; null until it has checked. */
    token,
    setToken,
    /** The address the code step is for, or null while on the email step. */
    codeEmail,
    /** True when the code step came back from an earlier visit. */
    restored,
    sending,
    checking,
    /** An error from asking for a code. */
    sendError: sent.status === "error" ? sent.message : null,
    /** An error from checking the code. */
    checkError: checked.status === "error" ? checked.message : null,
    /** Asks for a code to be emailed (form action). */
    submitEmail(formData: FormData) {
      setEarlier(null);
      setRestart(0);
      send(formData);
    },
    /** Checks the typed code (form action). Signing in leaves the page. */
    submitCode(formData: FormData) {
      // A wrong code puts the address back through the effect above.
      clearPendingEmail("customer");
      check(formData);
    },
    /** Goes back to the email step to use another address. */
    useDifferentEmail() {
      clearPendingEmail("customer");
      setEarlier(null);
      setRestart((count) => count + 1);
    },
    /** Jumps to the code step for an address that already has a code. */
    haveCodeFor(address: string) {
      setEarlier(address);
      setRestart(0);
    },
  };
}
