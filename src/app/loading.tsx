/**
 * Globaler Loading-State während des Server-Renderings.
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto flex min-h-[40vh] max-w-7xl items-center justify-center px-4 py-12"
    >
      <div className="flex items-center gap-3 text-mu">
        <span
          aria-hidden="true"
          className="h-3 w-3 animate-pulse rounded-full bg-oak"
        />
        <span className="text-sm">Lädt …</span>
      </div>
    </div>
  );
}
