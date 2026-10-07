"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { type BlockState, unblockAccountAction } from "./actions";
import type { BlockedAccount } from "./venue";

const initialState: BlockState = { status: "idle" };

function BlockedRow({ account }: { account: BlockedAccount }) {
  const [state, formAction, pending] = useActionState(
    unblockAccountAction,
    initialState,
  );

  return (
    <li className="flex flex-col gap-1">
      <form
        action={formAction}
        className="flex items-center justify-between gap-2"
      >
        <input type="hidden" name="userId" value={account.userId} />
        <span className="min-w-0 truncate text-sm">{account.name}</span>
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending ? "Unblocking…" : "Unblock"}
        </Button>
      </form>
      {state.status === "error" && (
        <p role="alert" className="text-destructive text-xs">
          {state.message}
        </p>
      )}
    </li>
  );
}

/** The accounts blocked from the board, each with a way back (ADR-008). */
export function BlockedAccounts({ accounts }: { accounts: BlockedAccount[] }) {
  if (accounts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-sm">
        These accounts can&apos;t post, vote or report on your board. Unblocking
        lets them back in; drawings that were removed stay removed.
      </p>
      <ul className="flex flex-col gap-2">
        {accounts.map((account) => (
          <BlockedRow key={account.userId} account={account} />
        ))}
      </ul>
    </div>
  );
}
