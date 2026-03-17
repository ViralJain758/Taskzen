import { Link } from "react-router-dom";

function Terms() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-8 md:py-10">
      <article className="surface-card rounded-3xl p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-700">
          Legal
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
          Terms of Use
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Last updated: March 18, 2026
        </p>

        <div className="mt-6 space-y-4 text-sm leading-7 text-slate-700">
          <p>
            By using Taskzen, you agree to use the platform responsibly and only
            for lawful collaboration, planning, and project management purposes.
          </p>
          <p>
            Workspace owners and admins are responsible for permission
            management, membership actions, and content governance within their
            workspaces.
          </p>
          <p>
            Users must not misuse access controls, attempt unauthorized actions,
            or upload harmful content. Abuse may result in access removal.
          </p>
          <p>
            Features, design, and behavior may evolve over time to improve
            product reliability and usability.
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

export default Terms;
