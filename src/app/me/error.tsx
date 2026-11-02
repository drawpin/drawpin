"use client";

import { useEffect } from "react";
import { CardPage } from "../b/[slug]/board-look";
import { Button } from "@/components/ui/button";

/** What shows if the profile can't be loaded, with a way to try again. */
export default function MeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("The profile failed to load", error);
  }, [error]);

  return (
    <CardPage
      note="Hmm"
      title="Couldn't load your profile"
      intro={<p>Something went wrong on our side. Your drawings are safe.</p>}
    >
      <Button size="lg" onClick={reset}>
        Try again
      </Button>
    </CardPage>
  );
}
