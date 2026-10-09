"use client";

import { Notice, SiteHeader, cardClass, inputClass, primaryButtonClass, quietButtonClass } from "./ui";

export function AuthView({
  configured,
  isRegistering,
  email,
  password,
  error,
  notice,
  busy,
  onEmail,
  onPassword,
  onSubmit,
  onToggle,
  onHome,
  onPreview,
}: {
  configured: boolean;
  isRegistering: boolean;
  email: string;
  password: string;
  error: string;
  notice: string;
  busy: boolean;
  onEmail: (value: string) => void;
  onPassword: (value: string) => void;
  onSubmit: () => void;
  onToggle: () => void;
  onHome: () => void;
  onPreview: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-4 py-6">
      <SiteHeader
        action={
          <button type="button" onClick={onHome} className={quietButtonClass}>
            Home
          </button>
        }
      />

      <main className={`${cardClass} mt-10 p-6 sm:p-8`}>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">Citizen account</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          {isRegistering ? "Create your account" : "Sign in to file a report"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Reports stay tied to your account so you can check whether the city has picked them up.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <label className="block text-sm font-semibold" htmlFor="email">
            Email
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => onEmail(event.target.value)}
              className={`${inputClass} mt-2`}
              placeholder="you@neighborhood.org"
              required
            />
          </label>
          <label className="block text-sm font-semibold" htmlFor="password">
            Password
            <input
              id="password"
              type="password"
              autoComplete={isRegistering ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => onPassword(event.target.value)}
              className={`${inputClass} mt-2`}
              placeholder={isRegistering ? "At least 6 characters" : "Your password"}
              minLength={6}
              required
            />
          </label>

          {error ? <Notice tone="error">{error}</Notice> : null}
          {notice ? <Notice tone="ok">{notice}</Notice> : null}
          {configured ? null : (
            <Notice tone="info">
              Supabase is not connected, so this form cannot create a real account yet.
            </Notice>
          )}

          <button type="submit" className={`${primaryButtonClass} w-full`} disabled={busy || !configured}>
            {busy ? "Working..." : isRegistering ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          {isRegistering ? "Already have an account?" : "Need an account?"}{" "}
          <button type="button" onClick={onToggle} className="font-semibold text-teal">
            {isRegistering ? "Sign in" : "Register"}
          </button>
        </p>
        {configured ? null : (
          <button type="button" onClick={onPreview} className={`${quietButtonClass} mt-2 w-full`}>
            Try the report form anyway
          </button>
        )}
      </main>
    </div>
  );
}
