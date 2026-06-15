"use client";

interface Props {
  open: boolean;
  onAccept: () => void;
}

/**
 * One-time acceptable-use gate shown before the first search. The user must
 * acknowledge the permitted-use terms before the tool can be used.
 */
export default function AcceptableUseGate({ open, onAccept }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#101018] p-6 shadow-2xl">
        <h2 className="mb-3 text-xl font-semibold">Before you search</h2>
        <p className="mb-3 text-sm text-white/70">
          Sherlock helps you find visually similar faces in public web sources
          using a third-party Face Search API. By continuing you agree to use it
          responsibly and lawfully.
        </p>
        <ul className="mb-4 space-y-2 text-sm text-white/70">
          <li className="flex gap-2">
            <span className="text-emerald-400">✓</span>
            Only search faces you are <strong>authorized</strong> to search
            (e.g. your own, or with consent).
          </li>
          <li className="flex gap-2">
            <span className="text-rose-400">✕</span>
            No stalking, harassment, surveillance, or unmasking of anonymous
            people.
          </li>
          <li className="flex gap-2">
            <span className="text-rose-400">✕</span>
            No use that violates privacy laws (e.g. GDPR/BIPA) or platform
            terms.
          </li>
          <li className="flex gap-2">
            <span className="text-white/50">ℹ</span>
            Results come from a third-party API. We do not scrape platforms and
            do not store your uploaded photos.
          </li>
        </ul>
        <button
          onClick={onAccept}
          className="w-full rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400"
        >
          I understand and agree
        </button>
      </div>
    </div>
  );
}
