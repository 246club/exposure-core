"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-lg font-bold text-black mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-black/40 mb-4">{error.message}</p>
        <button
          onClick={reset}
          className="rounded-lg px-4 py-2 text-xs font-semibold transition-colors hover:bg-black/[0.06] cursor-pointer"
          style={{
            border: "1px solid rgba(0,0,0,0.08)",
            color: "rgba(0,0,0,0.40)",
          }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
