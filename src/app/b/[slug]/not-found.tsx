export default function BoardNotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Board not found</h1>
      <p className="text-muted-foreground max-w-sm">
        Check the link, or scan the QR code at the venue again.
      </p>
    </main>
  );
}
