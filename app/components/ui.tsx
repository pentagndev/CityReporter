"use client";

import { useState, type ReactNode } from "react";
import { statusTone } from "@/lib/issues";

export const primaryButtonClass =
  "inline-flex items-center justify-center rounded-full bg-teal px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-dark disabled:cursor-not-allowed disabled:opacity-50";

export const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink transition hover:border-teal disabled:cursor-not-allowed disabled:opacity-50";

export const quietButtonClass =
  "inline-flex items-center justify-center rounded-full px-3 py-2 text-sm font-semibold text-muted transition hover:bg-paper hover:text-ink";

export const dangerButtonClass =
  "inline-flex items-center justify-center rounded-full bg-danger-soft px-4 py-2 text-sm font-semibold text-danger transition hover:bg-[#f8d4d0]";

export const inputClass =
  "w-full rounded-2xl border border-line bg-white px-4 py-3 text-base text-ink outline-none transition placeholder:text-[#8aa0ab] focus:border-teal";

export const cardClass =
  "rounded-[1.75rem] border border-line bg-paper shadow-[0_24px_60px_-36px_rgba(23,48,66,0.55)]";

const pillClass = {
  pending: "bg-sun-soft text-[#8a5a00]",
  progress: "bg-tide text-teal-dark",
  resolved: "bg-moss-soft text-moss",
  custom: "bg-[#eef2f4] text-ink",
};

export function SiteMark() {
  return (
    <span className="grid size-10 place-items-center rounded-2xl bg-teal shadow-[0_8px_20px_-12px_rgba(4,94,89,0.9)]">
      <span className="size-3.5 rounded-full bg-sun" />
    </span>
  );
}

export function SiteHeader({ action }: { action?: ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <SiteMark />
        <div>
          <p className="text-base font-semibold leading-none tracking-tight">CivicIssue</p>
          <p className="mt-1 text-xs text-muted">Neighborhood reporting</p>
        </div>
      </div>
      {action}
    </header>
  );
}

export function Notice({
  tone,
  children,
}: {
  tone: "error" | "ok" | "info";
  children: ReactNode;
}) {
  const tones = {
    error: "border-[#f0c7c3] bg-danger-soft text-danger",
    ok: "border-[#b7e4c9] bg-moss-soft text-moss",
    info: "border-line bg-tide text-teal-dark",
  };

  return (
    <p role="status" className={`rounded-2xl border px-4 py-3 text-sm ${tones[tone]}`}>
      {children}
    </p>
  );
}

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${pillClass[statusTone(status)]}`}>
      {status}
    </span>
  );
}

export function IssuePhoto({ src, label }: { src: string; label: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="grid h-full min-h-28 place-items-center rounded-2xl bg-ink px-1.5 text-center text-sun">
        <span className="text-[0.68rem] font-semibold uppercase leading-tight tracking-wide">{label}</span>
      </div>
    );
  }

  return (
    // Report photos are user uploads and data URLs, which next/image cannot optimize here.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`${label} report`}
      className="h-full min-h-32 w-full rounded-2xl object-cover"
      onError={() => setFailed(true)}
    />
  );
}
