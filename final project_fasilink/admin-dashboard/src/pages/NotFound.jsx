import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center px-4 text-center text-slate-100">
      <div className="max-w-lg rounded-[32px] border border-slate-800/90 bg-slate-900/90 p-10 shadow-glow">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Page not found</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-tight text-white">404</h1>
        <p className="mt-3 text-sm text-slate-400">The admin route you are looking for does not exist or has been moved.</p>
        <Link
          to="/dashboard"
          className="mt-8 inline-flex rounded-3xl bg-slate-800 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Go back to dashboard
        </Link>
      </div>
    </div>
  );
}
