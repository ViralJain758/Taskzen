import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

type HighlightKey = "plan" | "collab" | "ship";

const highlights: Record<
  HighlightKey,
  { title: string; description: string; badge: string }
> = {
  plan: {
    title: "Plan in one place",
    description:
      "Structure workspaces, projects, and tasks in minutes with a clean hierarchy.",
    badge: "Planning",
  },
  collab: {
    title: "Collaborate with context",
    description:
      "Comments, assignees, and role-based permissions keep everyone aligned without extra chats.",
    badge: "Collaboration",
  },
  ship: {
    title: "Ship with momentum",
    description:
      "Drag tasks through stages, track progress live, and reduce handoff delays across your team.",
    badge: "Delivery",
  },
};

function Landing() {
  const hasToken = Boolean(localStorage.getItem("token"));
  const [activeHighlight, setActiveHighlight] = useState<HighlightKey>("plan");

  const activeCard = useMemo(
    () => highlights[activeHighlight],
    [activeHighlight],
  );

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-8 md:px-10 md:py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-10 h-64 w-64 rounded-full bg-orange-300/40 blur-3xl" />
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-sky-300/45 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-emerald-300/35 blur-3xl" />
        <div className="absolute -bottom-16 right-1/4 h-56 w-56 rounded-full bg-fuchsia-200/25 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="surface-card flex items-center justify-between rounded-2xl px-4 py-3 md:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
              Taskzen
            </p>
            <h1 className="text-xl font-black tracking-tight text-slate-900 md:text-2xl">
              Team execution, reimagined
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {hasToken ? (
              <Link
                to="/dashboard"
                className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                Open dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-sky-700"
                >
                  Create account
                </Link>
                <Link
                  to="/login"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                >
                  I already have an account
                </Link>
              </>
            )}
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.18fr_1fr]">
          <div className="surface-card relative overflow-hidden rounded-3xl p-6 md:p-8">
            <div className="pointer-events-none absolute right-0 top-0 h-36 w-36 rounded-full bg-sky-200/50 blur-2xl" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-28 w-28 rounded-full bg-orange-200/50 blur-2xl" />

            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-700">
              Project control room
            </p>
            <h2 className="mt-3 text-4xl font-black leading-tight tracking-tight text-slate-900 md:text-6xl">
              Focus your team.
              <br />
              Ship without chaos.
            </h2>
            <p className="mt-4 max-w-2xl text-sm text-slate-600 md:text-base">
              Move faster with a workspace built for ownership, visibility, and
              realtime delivery.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={hasToken ? "/dashboard" : "/register"}
                className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                {hasToken ? "Go to dashboard" : "Create account"}
              </Link>
              <Link
                to="/login"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
              >
                I already have access
              </Link>
            </div>

            <div className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white/70 p-3 md:grid-cols-3">
              {(Object.keys(highlights) as HighlightKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveHighlight(key)}
                  className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                    activeHighlight === key
                      ? "border-sky-300 bg-sky-50 text-sky-900"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800"
                  }`}
                >
                  {highlights[key].badge}
                </button>
              ))}
            </div>

            <div className="mt-3 rounded-2xl border border-slate-700 bg-slate-900 p-4 text-white">
              <p className="text-xs uppercase tracking-[0.18em] text-sky-200">
                {activeCard.badge}
              </p>
              <h3 className="mt-2 text-lg font-bold text-white">
                {activeCard.title}
              </h3>
              <p className="mt-1 text-sm text-slate-100">
                {activeCard.description}
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="surface-card rounded-2xl p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                  Live Board Preview
                </p>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Live
                </span>
              </div>

              <div className="space-y-2">
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-xs text-orange-900">
                  To Do: API planning + onboarding flow
                </div>
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
                  In Progress: Member roles + comments sync
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                  Done: Dashboard split + landing experience
                </div>
              </div>
            </div>

            <div className="surface-card rounded-2xl p-4">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                Why teams switch
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                <li>Less status-chasing, more execution clarity.</li>
                <li>Built-in permissions for secure collaboration.</li>
                <li>Realtime updates that keep everyone aligned.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Landing;
