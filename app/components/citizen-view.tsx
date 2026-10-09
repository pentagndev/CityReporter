"use client";

import { useState } from "react";
import {
  CATEGORIES,
  type Issue,
  formatCoords,
  formatWhen,
  mapsUrl,
  splitDescription,
} from "@/lib/issues";
import {
  IssuePhoto,
  Notice,
  SiteHeader,
  StatusPill,
  cardClass,
  dangerButtonClass,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "./ui";

export function CitizenView({
  email,
  preview,
  category,
  description,
  location,
  imageName,
  imagePreview,
  photoInputKey,
  issues,
  loading,
  submitting,
  message,
  messageTone,
  onCategory,
  onDescription,
  onCapture,
  onClearPhoto,
  onLocate,
  onManualLocation,
  onSubmit,
  onLogout,
  onHome,
}: {
  email: string;
  preview: boolean;
  category: string;
  description: string;
  location: { lat: number; lng: number } | null;
  imageName: string;
  imagePreview: string | null;
  photoInputKey: number;
  issues: Issue[];
  loading: boolean;
  submitting: boolean;
  message: string;
  messageTone: "error" | "ok" | "info";
  onCategory: (value: string) => void;
  onDescription: (value: string) => void;
  onCapture: (file: File) => void;
  onClearPhoto: () => void;
  onLocate: () => void;
  onManualLocation: (lat: number, lng: number) => void;
  onSubmit: () => void;
  onLogout: () => void;
  onHome: () => void;
}) {
  const [manualOpen, setManualOpen] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [manualError, setManualError] = useState("");

  const checks = [
    { label: "Photo added", done: Boolean(imagePreview) },
    { label: "Location locked", done: Boolean(location) },
    { label: "Category chosen", done: Boolean(category) },
    { label: "Description written", done: description.trim().length >= 8 },
  ];
  const ready = checks.every((check) => check.done);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6">
      <SiteHeader
        action={
          <div className="flex items-center gap-2">
            <button type="button" onClick={onHome} className="text-sm font-semibold text-muted hover:text-ink">
              Home
            </button>
            <button type="button" onClick={onLogout} className={dangerButtonClass}>
              {preview ? "Exit preview" : "Sign out"}
            </button>
          </div>
        }
      />

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <main className={`${cardClass} p-5 sm:p-7`}>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">New report</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Tell the city what’s wrong.</h1>
          <p className="mt-2 text-sm text-muted">
            {email ? `Signed in as ${email}.` : "Previewing the form on this device."}
          </p>

          <form
            className="mt-6 space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
          >
            <fieldset>
              <legend className="text-sm font-semibold">What kind of problem is it?</legend>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {CATEGORIES.map((item) => {
                  const selected = category === item.label;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onCategory(item.label)}
                      className={`rounded-2xl border px-3 py-3 text-left transition ${
                        selected ? "border-teal bg-tide" : "border-line bg-white hover:border-teal"
                      }`}
                    >
                      <span className="block text-sm font-semibold">{item.label}</span>
                      <span className="mt-1 block text-xs leading-snug text-muted">{item.hint}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <p className="text-sm font-semibold">Photo</p>
              {imagePreview ? (
                <div className="mt-3">
                  {/* Blob previews are local files, so the optimizer has nothing to fetch. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Selected report preview" className="max-h-64 w-full rounded-2xl object-cover" />
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="truncate text-sm text-muted">{imageName}</p>
                    <button type="button" onClick={onClearPhoto} className="text-sm font-semibold text-danger">
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="mt-3 flex cursor-pointer flex-col items-start gap-1 rounded-2xl border border-dashed border-line bg-white px-4 py-5 hover:border-teal">
                  <span className="text-sm font-semibold">Add a photo</span>
                  <span className="text-xs text-muted">JPG, PNG, or HEIC up to 8 MB. On a phone, this opens the camera.</span>
                  <input
                    key={photoInputKey}
                    className="sr-only"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) onCapture(file);
                    }}
                  />
                </label>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold">Location</p>
                <button type="button" onClick={onLocate} className={secondaryButtonClass}>
                  Use my location
                </button>
              </div>
              {location ? (
                <p className="mt-3 text-sm text-moss">Locked at {formatCoords(location.lat, location.lng)}</p>
              ) : (
                <p className="mt-3 text-sm text-muted">Allow location, or type the coordinates if the browser blocks it.</p>
              )}
              <button
                type="button"
                className="mt-2 text-sm font-semibold text-teal"
                onClick={() => setManualOpen((open) => !open)}
              >
                {manualOpen ? "Hide coordinate fields" : "Type coordinates instead"}
              </button>
              {manualOpen ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <label className="text-xs font-semibold text-muted" htmlFor="lat">
                    Latitude
                    <input
                      id="lat"
                      inputMode="decimal"
                      value={manualLat}
                      onChange={(event) => setManualLat(event.target.value)}
                      className={`${inputClass} mt-1`}
                      placeholder="37.7749"
                    />
                  </label>
                  <label className="text-xs font-semibold text-muted" htmlFor="lng">
                    Longitude
                    <input
                      id="lng"
                      inputMode="decimal"
                      value={manualLng}
                      onChange={(event) => setManualLng(event.target.value)}
                      className={`${inputClass} mt-1`}
                      placeholder="-122.4194"
                    />
                  </label>
                  <button
                    type="button"
                    className={`${secondaryButtonClass} self-end`}
                    onClick={() => {
                      const lat = Number(manualLat);
                      const lng = Number(manualLng);
                      if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
                        setManualError("Latitude must be between -90 and 90, and longitude between -180 and 180.");
                        return;
                      }
                      setManualError("");
                      onManualLocation(lat, lng);
                    }}
                  >
                    Set pin
                  </button>
                  {manualError ? <p className="text-sm text-danger sm:col-span-3">{manualError}</p> : null}
                </div>
              ) : null}
            </div>

            <label className="block text-sm font-semibold" htmlFor="description">
              What should the crew know?
              <textarea
                id="description"
                value={description}
                onChange={(event) => onDescription(event.target.value)}
                maxLength={500}
                rows={4}
                className={`${inputClass} mt-2 resize-y`}
                placeholder="Broken streetlight on 4th Ave, dark since Tuesday."
              />
              <span className="mt-2 block text-xs font-medium text-muted">{description.trim().length}/500</span>
            </label>

            <ul className="grid gap-2 sm:grid-cols-2">
              {checks.map((check) => (
                <li key={check.label} className={`rounded-full px-3 py-2 text-sm ${check.done ? "bg-moss-soft text-moss" : "bg-[#f4f7f8] text-muted"}`}>
                  {check.done ? "Ready" : "Needed"} · {check.label}
                </li>
              ))}
            </ul>

            {message ? <Notice tone={messageTone}>{message}</Notice> : null}

            <button type="submit" className={`${primaryButtonClass} w-full`} disabled={!ready || submitting}>
              {submitting ? "Sending..." : "Submit to the city"}
            </button>
          </form>
        </main>

        <aside className={`${cardClass} p-5 lg:sticky lg:top-6`}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xl font-semibold tracking-tight">Your reports</h2>
            <p className="text-sm text-muted">{loading ? "Loading" : issues.length}</p>
          </div>
          {loading ? <p className="mt-4 text-sm text-muted">Checking your reports...</p> : null}
          {!loading && issues.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Nothing filed yet. The first report will show up here.</p>
          ) : null}
          <div className="mt-4 space-y-3">
            {issues.map((issue) => {
              const copy = splitDescription(issue.description);
              return (
                <article key={issue.id} className="grid grid-cols-[5.25rem_minmax(0,1fr)] gap-3 rounded-2xl border border-line p-3">
                  <IssuePhoto src={issue.image_url} label={copy.category} />
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{copy.category}</p>
                      <StatusPill status={issue.status} />
                    </div>
                    <p className="mt-1 text-sm font-medium leading-snug">{copy.text}</p>
                    <p className="mt-2 text-xs text-muted">{formatWhen(issue.created_at)}</p>
                    <a className="mt-1 inline-block text-xs font-semibold text-teal" href={mapsUrl(issue.lat, issue.lng)} target="_blank" rel="noreferrer">
                      {formatCoords(issue.lat, issue.lng)}
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
