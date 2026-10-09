"use client";

import { useMemo, useState } from "react";
import {
  STATUSES,
  type DeskFilter,
  type Issue,
  formatCoords,
  formatWhen,
  issueMatches,
  mapsUrl,
  splitDescription,
  summarize,
} from "@/lib/issues";
import {
  IssuePhoto,
  Notice,
  SiteHeader,
  StatusPill,
  cardClass,
  inputClass,
  quietButtonClass,
  secondaryButtonClass,
} from "./ui";

const filters: DeskFilter[] = ["All", ...STATUSES, "Other"];

export function AdminView({
  issues,
  loading,
  preview,
  message,
  savingId,
  onHome,
  onRefresh,
  onStatus,
}: {
  issues: Issue[];
  loading: boolean;
  preview: boolean;
  message: string;
  savingId: string | null;
  onHome: () => void;
  onRefresh: () => void;
  onStatus: (id: string, status: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<DeskFilter>("All");
  const [customMode, setCustomMode] = useState<Record<string, boolean>>({});
  const [customInput, setCustomInput] = useState<Record<string, string>>({});
  const summary = useMemo(() => summarize(issues), [issues]);
  const visible = useMemo(
    () => issues.filter((issue) => issueMatches(issue, query, filter)),
    [issues, query, filter],
  );

  const stats = [
    { label: "Open desk", value: summary.total },
    { label: "Pending", value: summary.pending },
    { label: "In progress", value: summary.progress },
    { label: "Resolved", value: summary.resolved },
  ];

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6">
      <SiteHeader
        action={
          <button type="button" onClick={onHome} className={quietButtonClass}>
            Home
          </button>
        }
      />

      <main className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">City desk</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Every report, in one queue.</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
              {preview
                ? "These are sample reports. Status changes stay in this browser until Supabase is connected."
                : "Review the photo, open the map pin, and move the status as the crew picks up the work."}
            </p>
          </div>
          {preview ? null : (
            <button type="button" onClick={onRefresh} className={secondaryButtonClass}>
              Refresh
            </button>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className={`${cardClass} px-4 py-4`}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{stat.label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className={`${cardClass} mt-4 p-4 sm:p-5`}>
          <label className="block text-sm font-semibold" htmlFor="desk-search">
            Search reports
            <input
              id="desk-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={`${inputClass} mt-2`}
              placeholder="Search by street, category, or status"
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-2" role="toolbar" aria-label="Filter by status">
            {filters.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={filter === item}
                onClick={() => setFilter(item)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                  filter === item ? "bg-ink text-white" : "bg-[#f4f7f8] text-muted"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {message ? (
          <div className="mt-4">
            <Notice tone="error">{message}</Notice>
          </div>
        ) : null}

        <div className="mt-4 space-y-4">
          {loading ? <p className="text-sm text-muted">Loading the desk...</p> : null}
          {!loading && visible.length === 0 ? (
            <p className="text-sm text-muted">No reports match that search.</p>
          ) : null}
          {visible.map((issue) => {
            const copy = splitDescription(issue.description);
            const known = STATUSES.includes(issue.status as (typeof STATUSES)[number]);
            const writing = customMode[issue.id] === true;
            return (
              <article key={issue.id} className={`${cardClass} grid gap-4 p-4 sm:grid-cols-[9.5rem_1fr] sm:p-5`}>
                <IssuePhoto src={issue.image_url} label={copy.category} />
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{copy.category}</p>
                      <h2 className="mt-1 text-lg font-semibold leading-snug">{copy.text}</h2>
                    </div>
                    <StatusPill status={issue.status} />
                  </div>
                  <p className="mt-3 text-sm text-muted">
                    Filed {formatWhen(issue.created_at)} ·{" "}
                    <a className="font-semibold text-teal" href={mapsUrl(issue.lat, issue.lng)} target="_blank" rel="noreferrer">
                      {formatCoords(issue.lat, issue.lng)}
                    </a>
                  </p>

                  <div className="mt-4">
                    <label className="text-sm font-semibold" htmlFor={`status-${issue.id}`}>
                      Status
                    </label>
                    {writing ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <input
                          id={`status-${issue.id}`}
                          value={customInput[issue.id] ?? ""}
                          onChange={(event) =>
                            setCustomInput((current) => ({ ...current, [issue.id]: event.target.value }))
                          }
                          className={`${inputClass} max-w-xs`}
                          placeholder="Crew scheduled"
                          maxLength={40}
                        />
                        <button
                          type="button"
                          className={secondaryButtonClass}
                          disabled={savingId === issue.id}
                          onClick={() => {
                            const next = (customInput[issue.id] ?? "").trim().slice(0, 40);
                            if (!next) return;
                            onStatus(issue.id, next);
                            setCustomMode((current) => ({ ...current, [issue.id]: false }));
                          }}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className={quietButtonClass}
                          onClick={() => setCustomMode((current) => ({ ...current, [issue.id]: false }))}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <select
                        id={`status-${issue.id}`}
                        className="mt-2 rounded-full border border-line bg-white px-3 py-2 text-sm font-semibold"
                        value={issue.status}
                        disabled={savingId === issue.id}
                        onChange={(event) => {
                          if (event.target.value === "CUSTOM_OPTION") {
                            setCustomMode((current) => ({ ...current, [issue.id]: true }));
                            setCustomInput((current) => ({ ...current, [issue.id]: known ? "" : issue.status }));
                            return;
                          }
                          onStatus(issue.id, event.target.value);
                        }}
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                        {known ? null : <option value={issue.status}>{issue.status}</option>}
                        <option value="CUSTOM_OPTION">Write a custom status...</option>
                      </select>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
