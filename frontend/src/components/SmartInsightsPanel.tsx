import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getProjectInsights,
  type ProjectInsight,
} from "../services/taskService";
import { getApiErrorMessage } from "../utils";

interface SmartInsightsPanelProps {
  projectId: string | undefined;
  refreshSignal?: string;
}

const getSeverityStyles = (severity: string): string => {
  switch (severity) {
    case "high":
      return "border-rose-200 bg-rose-50";
    case "medium":
      return "border-amber-200 bg-amber-50";
    case "low":
      return "border-blue-200 bg-blue-50";
    case "good":
      return "border-emerald-200 bg-emerald-50";
    default:
      return "border-slate-200 bg-slate-50";
  }
};

const getTextStylesForSeverity = (severity: string): string => {
  switch (severity) {
    case "high":
      return "text-rose-800";
    case "medium":
      return "text-amber-800";
    case "low":
      return "text-blue-800";
    case "good":
      return "text-emerald-800";
    default:
      return "text-slate-800";
  }
};

export const SmartInsightsPanel = ({
  projectId,
  refreshSignal,
}: SmartInsightsPanelProps) => {
  const {
    data: insights = [],
    isLoading,
    error,
    refetch,
  } = useQuery<ProjectInsight[], unknown>({
    queryKey: ["project-insights", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      return getProjectInsights(projectId);
    },
    enabled: Boolean(projectId),
    staleTime: 20 * 1000,
    refetchOnWindowFocus: true,
  });

  const errorMessage = error
    ? getApiErrorMessage(error, "Unable to load insights right now.")
    : null;

  useEffect(() => {
    if (!projectId || !refreshSignal) return;
    void refetch();
  }, [projectId, refreshSignal, refetch]);

  // Separate insights by type (health goes to the right, critical ones on top)
  const criticalInsights = insights.filter(
    (i) => i.type !== "health" && i.severity !== "info",
  );
  const infoInsights = insights.filter(
    (i) => i.severity === "info" && i.type !== "health",
  );
  const healthInsight = insights.find((i) => i.type === "health");

  return (
    <div className="surface-card rounded-2xl border border-slate-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
          Smart Insights
        </h3>
        <button
          onClick={() => {
            void refetch();
          }}
          className="text-xs text-sky-600 transition hover:text-sky-700 underline"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-2">
        {isLoading && (
          <div className="space-y-2">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="rounded-lg border border-slate-200 bg-slate-50 p-2.5"
              >
                <div
                  className="shimmer-skeleton h-2.5 rounded"
                  style={{ width: item === 1 ? "72%" : "86%" }}
                />
                <div
                  className="shimmer-skeleton mt-2 h-2.5 rounded"
                  style={{ width: item === 2 ? "54%" : "64%" }}
                />
              </div>
            ))}
          </div>
        )}

        {errorMessage && !isLoading && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5">
            <p className="text-xs font-medium text-rose-800">{errorMessage}</p>
          </div>
        )}

        {!isLoading && !errorMessage && insights.length === 0 && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5">
            <p className="text-xs font-medium text-emerald-800">
              No risks detected. Project looks stable.
            </p>
          </div>
        )}

        {/* Critical insights first */}
        {criticalInsights.length > 0 && (
          <div className="space-y-2">
            {criticalInsights.map((insight, idx) => (
              <div
                key={idx}
                className={`rounded-lg border p-2.5 ${getSeverityStyles(
                  insight.severity,
                )}`}
              >
                <div className="flex items-start">
                  <p
                    className={`text-xs font-medium leading-snug ${getTextStylesForSeverity(
                      insight.severity,
                    )}`}
                  >
                    {insight.message || "Insight available"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info insights */}
        {infoInsights.length > 0 && (
          <div className="space-y-2">
            {infoInsights.map((insight, idx) => (
              <div
                key={idx}
                className={`rounded-lg border p-2.5 ${getSeverityStyles(
                  insight.severity,
                )}`}
              >
                <div className="flex items-start">
                  <p
                    className={`text-xs font-medium leading-snug ${getTextStylesForSeverity(
                      insight.severity,
                    )}`}
                  >
                    {insight.message || "Insight available"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Health insight with progress bar */}
        {healthInsight && (
          <div
            className={`rounded-lg border p-2.5 ${getSeverityStyles(
              healthInsight.severity,
            )}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start">
                <div>
                  <p
                    className={`text-xs font-medium ${getTextStylesForSeverity(
                      healthInsight.severity,
                    )}`}
                  >
                    {healthInsight.message || "Project status available"}
                  </p>
                  {healthInsight.meta && (
                    <p className="mt-1 text-[11px] text-slate-600">
                      {healthInsight.meta.completed} of{" "}
                      {healthInsight.meta.total} completed
                    </p>
                  )}
                </div>
              </div>
              {healthInsight.meta && (
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs font-bold text-slate-700">
                    {healthInsight.meta.completion}%
                  </span>
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full ${
                        healthInsight.meta.completion >= 75
                          ? "bg-emerald-500"
                          : healthInsight.meta.completion >= 50
                            ? "bg-amber-500"
                            : "bg-sky-500"
                      }`}
                      style={{
                        width: `${healthInsight.meta.completion}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartInsightsPanel;
