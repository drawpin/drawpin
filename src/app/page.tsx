import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">DrawPin</h1>
      <p className="text-muted-foreground max-w-sm">
        Scan a QR code, draw a tile, and vote on the weekly top 7 at your local
        spot.
      </p>
      <Button>Get started</Button>
    </main>
  );
}
