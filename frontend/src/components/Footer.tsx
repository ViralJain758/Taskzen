import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="surface-card border-t border-slate-200/80 bg-white/80 px-4 py-4 md:px-8">
      <div className="flex w-full flex-col gap-3 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
        <p className="text-sm font-semibold tracking-[0.06em] text-slate-700">
          Built by Viral Jain
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href="https://github.com/ViralJain758"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-slate-700 transition hover:text-sky-700"
          >
            GitHub
          </a>
          <a
            href="https://www.linkedin.com/in/viraljain758/"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-slate-700 transition hover:text-sky-700"
          >
            LinkedIn
          </a>
          <Link
            to="/privacy"
            className="font-semibold text-slate-700 transition hover:text-sky-700"
          >
            Privacy
          </Link>
          <Link
            to="/terms"
            className="font-semibold text-slate-700 transition hover:text-sky-700"
          >
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
