interface LoadErrorCardProps {
  title?: string;
  message: string;
  onRetry: () => void;
  retryLabel?: string;
  className?: string;
}

function LoadErrorCard({
  title = "Failed to load data",
  message,
  onRetry,
  retryLabel = "Retry",
  className = "",
}: LoadErrorCardProps) {
  return (
    <div
      className={`surface-card rounded-2xl border border-rose-300 bg-rose-50 p-4 ${className}`.trim()}
    >
      <h3 className="text-sm font-semibold text-rose-900">{title}</h3>
      <p className="mt-1 text-sm text-rose-800">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-800"
      >
        {retryLabel}
      </button>
    </div>
  );
}

export default LoadErrorCard;
