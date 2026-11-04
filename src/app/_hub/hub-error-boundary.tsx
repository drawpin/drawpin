"use client";

import { Component, type ReactNode, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CardPage } from "../b/[slug]/board-look";

/** What shows when the hub can't load, with a way to try again. */
function HubFailed({ onRetry }: { onRetry: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <CardPage
      note="Hmm"
      title="Couldn't load your boards."
      intro={<p>Something went wrong on our side. Your drawings are safe.</p>}
    >
      <Button
        size="lg"
        disabled={pending}
        onClick={() =>
          startTransition(() => {
            // Fetch the page again from the server, then show it.
            router.refresh();
            onRetry();
          })
        }
      >
        Try again
      </Button>
    </CardPage>
  );
}

/**
 * The hub's own error boundary. Not an `error.tsx`: `/` is also the
 * marketing home, and a route-level boundary (or `loading.tsx`) there would
 * cover it and every page below it too.
 */
export class HubErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("The home hub failed to load", error);
  }

  render() {
    if (this.state.failed) {
      return <HubFailed onRetry={() => this.setState({ failed: false })} />;
    }
    return this.props.children;
  }
}
