import { Link } from "react-router-dom";

function Privacy() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-8 md:py-10">
      <article className="surface-card rounded-3xl p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
          Legal
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Last updated: March 18, 2026
        </p>

        <div className="mt-6 space-y-4 text-sm leading-7 text-slate-700">
          <p>
            Taskzen stores account information, workspace data, project details,
            tasks, and comments so your team can collaborate effectively.
          </p>
          <p>
            We only collect information required to provide core functionality,
            including authentication, authorization, realtime updates, and
            collaboration history.
          </p>
          <p>
            Access to workspace content is role-based. Owners and admins control
            member permissions. Users are responsible for maintaining account
            security and protecting access credentials.
          </p>
          <p>
            If you have questions about your data usage, contact the project
            owner through the linked profiles in the footer.
          </p>
        </div>

        <div className="mt-6">
          <Link
            to="/"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
          >
            Back to home
          </Link>
        </div>
      </article>
    </div>
  );
}

export default Privacy;
