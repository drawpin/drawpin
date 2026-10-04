"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { deleteAccountAction, type DeleteAccountState } from "./actions";

const initialState: DeleteAccountState = { status: "idle" };

/** The one button that deletes the account, and the way back. */
export function DeleteAccountForm({ back }: { back: string }) {
  const [state, formAction, pending] = useActionState(
    deleteAccountAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {state.status === "error" && (
        <p role="alert" className="text-destructive text-sm">
          {state.message}
        </p>
      )}
      <Button type="submit" variant="destructive" disabled={pending}>
        {pending ? "Deleting…" : "Delete my account"}
      </Button>
      <Link href={back} className={buttonVariants({ variant: "ghost" })}>
        Keep my account
      </Link>
    </form>
  );
}
