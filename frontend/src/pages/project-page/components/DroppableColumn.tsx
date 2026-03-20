import { useDroppable } from "@dnd-kit/core";
import type { ReactNode } from "react";
import { statusStyles } from "../types";
import type { TaskStatus } from "../types";

type DroppableColumnProps = {
  status: TaskStatus;
  children: ReactNode;
  isBoardDragging: boolean;
};

export const DroppableColumn = ({
  status,
  children,
  isBoardDragging,
}: DroppableColumnProps) => {
  const { isOver, setNodeRef } = useDroppable({
    id: status,
    data: { status },
  });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border p-4 transition ${statusStyles[status]} ${
        isBoardDragging
          ? "border-sky-200/90 bg-gradient-to-b from-white/90 to-sky-50/55"
          : ""
      } ${
        isOver
          ? "kanban-drop-active ring-2 ring-sky-400 shadow-xl shadow-sky-200/70 scale-[1.015]"
          : ""
      }`}
    >
      {children}
    </div>
  );
};
