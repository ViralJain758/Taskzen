import { statusLabels } from "../types";
import type { Task } from "../types";

type DragGhostCardProps = {
  task: Task;
};

export const DragGhostCard = ({ task }: DragGhostCardProps) => {
  return (
    <div className="kanban-ghost surface-card w-[300px] rounded-xl border border-sky-300 bg-white/95 p-3">
      <p className="text-sm font-semibold text-slate-900">{task.title}</p>
      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs text-slate-600">
          {task.description}
        </p>
      )}
      <div className="mt-2 inline-flex rounded-full bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700">
        {statusLabels[task.status]}
      </div>
    </div>
  );
};
