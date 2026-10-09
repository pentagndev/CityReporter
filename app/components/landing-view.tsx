"use client";

import { SAMPLE_ISSUES, formatCoords, splitDescription } from "@/lib/issues";
import { SiteHeader, StatusPill, cardClass, primaryButtonClass, secondaryButtonClass } from "./ui";

const steps = [
  { number: "01", title: "Photograph it", copy: "One picture of the pothole, dark lamp, or dumped mattress." },
  { number: "02", title: "Pin the spot", copy: "The browser locks the coordinates so a crew can find it." },
  { number: "03", title: "Follow the desk", copy: "Pending, in progress, then resolved — you can see the change." },
];

export function LandingView({
  configured,
  onReport,
  onDesk,
}: {
  configured: boolean;
  onReport: () => void;
  onDesk: () => void;
}) {
  const sample = SAMPLE_ISSUES[0];
  const sampleCopy = splitDescription(sample.description);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:py-8">
      <SiteHeader
        action={
          <button type="button" onClick={onDesk} className="text-sm font-semibold text-muted hover:text-ink">
            City desk
          </button>
        }
      />

      <main className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:py-16">
        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">For neighbors and city desks</p>
          <h1 className="mt-4 max-w-xl text-[2.7rem] font-semibold leading-[0.95] tracking-tight sm:text-6xl">
            Report what’s broken. Watch it get fixed.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted">
            Snap the problem and send the photo with a precise location. The city desk updates the status, and you can see when the work is done.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" onClick={onReport} className={primaryButtonClass}>
              File a report
            </button>
            <button type="button" onClick={onDesk} className={secondaryButtonClass}>
              Open the city desk
            </button>
          </div>
          {configured ? null : (
            <p className="mt-4 max-w-lg text-sm text-muted">
              Preview mode is on. Add Supabase keys when you want reports saved to the city database.
            </p>
          )}
        </section>

        <aside className={`${cardClass} overflow-hidden p-5 sm:p-6`}>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">A report looks like this</p>
          <div className="mt-4 rounded-[1.25rem] bg-ink p-5 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sun">{sampleCopy.category}</p>
                <p className="mt-2 text-lg font-semibold leading-snug">{sampleCopy.text}</p>
              </div>
              <StatusPill status={sample.status} />
            </div>
            <p className="mt-6 font-mono text-xs text-white/70">{formatCoords(sample.lat, sample.lng)}</p>
          </div>
          <ol className="mt-5 space-y-4">
            {steps.map((step) => (
              <li key={step.number} className="grid grid-cols-[2.5rem_1fr] gap-3">
                <span className="font-mono text-sm text-teal">{step.number}</span>
                <span>
                  <span className="block text-sm font-semibold">{step.title}</span>
                  <span className="mt-1 block text-sm text-muted">{step.copy}</span>
                </span>
              </li>
            ))}
          </ol>
        </aside>
      </main>

      <footer className="flex flex-col gap-2 border-t border-line py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>City teams can wire this desk into an existing municipal workflow.</p>
        <a className="font-semibold text-teal hover:text-teal-dark" href="mailto:example@testemail.com">
          example@testemail.com
        </a>
      </footer>
    </div>
  );
}
