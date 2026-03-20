import { useState } from "react";
import { defaultAnimateLayoutChanges, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type {
  ProjectAssignee,
  TaskComment,
} from "../../../services/taskService";
import {
  columns,
  priorityBadgeStyles,
  priorityLabels,
  statusLabels,
} from "../types";
import type { Task, TaskPriority, TaskStatus } from "../types";

type SortableTaskCardProps = {
  task: Task;
  onAssigneeChange: (
    taskId: string,
    assigneeId: string | null,
  ) => Promise<void>;
  onDelete: (taskId: string) => void;
  assignees: ProjectAssignee[];
  isUpdating: boolean;
  comments: TaskComment[];
  commentsExpanded: boolean;
  commentsLoading: boolean;
  addingComment: boolean;
  deletingCommentId: string | null;
  currentUserId: string | null;
  canModerateComments: boolean;
  onToggleComments: (taskId: string) => void;
  onAddComment: (taskId: string, content: string) => Promise<void>;
  onDeleteComment: (taskId: string, commentId: string) => Promise<void>;
  statusMenuTaskId: string | null;
  onStatusMenuOpen: (taskId: string | null) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => Promise<void>;
  onPriorityChange: (taskId: string, priority: TaskPriority) => Promise<void>;
  pendingOfflineCommentIds: string[];
};

export const SortableTaskCard = ({
  task,
  onAssigneeChange,
  onDelete,
  assignees,
  isUpdating,
  comments,
  commentsExpanded,
  commentsLoading,
  addingComment,
  deletingCommentId,
  currentUserId,
  canModerateComments,
  onToggleComments,
  onAddComment,
  onDeleteComment,
  statusMenuTaskId,
  onStatusMenuOpen,
  onStatusChange,
  onPriorityChange,
  pendingOfflineCommentIds,
}: SortableTaskCardProps) => {
  const [newComment, setNewComment] = useState("");

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task._id,
    data: { status: task.status },
    animateLayoutChanges: (args) =>
      defaultAnimateLayoutChanges({ ...args, wasDragging: true }),
    transition: {
      duration: 220,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      {...attributes}
      {...listeners}
      className={`surface-card mb-3 cursor-grab rounded-xl p-3 transition active:cursor-grabbing ${
        isDragging
          ? "opacity-40 ring-2 ring-sky-300"
          : "hover:-translate-y-0.5 hover:border-sky-200 hover:shadow"
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">{task.title}</p>
        <button
          type="button"
          onClick={() => {
            void onDelete(task._id);
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
          disabled={isUpdating}
        >
          Delete
        </button>
      </div>

      <div className="mb-2 block md:hidden">
        <button
          type="button"
          onClick={() =>
            onStatusMenuOpen(statusMenuTaskId === task._id ? null : task._id)
          }
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          className="w-full rounded-md border border-sky-300 bg-sky-50 px-2 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
          disabled={isUpdating}
        >
          {statusLabels[task.status]}
        </button>
        {statusMenuTaskId === task._id && (
          <div className="mt-1 space-y-1">
            {columns
              .filter((status) => status !== task.status)
              .map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    void onStatusChange(task._id, status);
                    onStatusMenuOpen(null);
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                  }}
                  className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Move to {statusLabels[status]}
                </button>
              ))}
          </div>
        )}
      </div>

      {task.description && (
        <p className="mb-2 text-xs text-slate-600">{task.description}</p>
      )}

      <div
        className={`mb-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${priorityBadgeStyles[task.priority]}`}
      >
        {priorityLabels[task.priority]} priority
      </div>

      {task.createdBy && (
        <p className="mb-2 text-xs text-slate-500">
          Created by: {task.createdBy.name}
        </p>
      )}

      {task.assignee && (
        <p className="mb-2 text-xs text-slate-500">
          Assigned to: {task.assignee.name}
        </p>
      )}

      <select
        value={task.assignee?._id || ""}
        onChange={(e) =>
          void onAssigneeChange(task._id, e.target.value || null)
        }
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        disabled={isUpdating}
        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
      >
        <option value="">Unassigned</option>
        {assignees.map((assignee) => (
          <option key={assignee._id} value={assignee._id}>
            {assignee.name}
          </option>
        ))}
      </select>

      <select
        value={task.priority}
        onChange={(e) =>
          void onPriorityChange(task._id, e.target.value as TaskPriority)
        }
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        disabled={isUpdating}
        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
      >
        <option value="low">Low priority</option>
        <option value="medium">Medium priority</option>
        <option value="high">High priority</option>
      </select>

      <button
        type="button"
        onClick={() => onToggleComments(task._id)}
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
      >
        {commentsExpanded
          ? "Hide comments"
          : `Show comments (${comments.length})`}
      </button>

      {commentsExpanded && (
        <div
          className="mt-2 rounded-lg border border-slate-200 bg-white p-2"
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
        >
          <div className="mb-2 flex gap-2">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment"
              className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
            />
            <button
              type="button"
              disabled={!newComment.trim() || addingComment}
              onClick={() => {
                void onAddComment(task._id, newComment.trim()).then(() => {
                  setNewComment("");
                });
              }}
              className="rounded-md bg-sky-600 px-2 py-1 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {addingComment ? "..." : "Add"}
            </button>
          </div>

          {commentsLoading ? (
            <p className="text-xs text-slate-500">Loading comments...</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-slate-500">No comments yet.</p>
          ) : (
            <div className="max-h-32 space-y-2 overflow-auto">
              {comments.map((comment) => {
                const canDeleteComment =
                  canModerateComments || comment.author._id === currentUserId;
                const isPendingOffline = pendingOfflineCommentIds.includes(
                  comment._id,
                );

                return (
                  <div
                    key={comment._id}
                    className="rounded-md border border-slate-200 bg-slate-50 p-2"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[11px] font-semibold text-slate-700">
                          {comment.author.name}
                        </p>
                        {isPendingOffline && (
                          <span className="rounded-full border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                            Pending sync
                          </span>
                        )}
                      </div>
                      {canDeleteComment && (
                        <button
                          type="button"
                          disabled={deletingCommentId === comment._id}
                          onClick={() => {
                            void onDeleteComment(task._id, comment._id);
                          }}
                          className="text-[11px] font-semibold text-rose-700 transition hover:text-rose-800 disabled:opacity-60"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-700">{comment.content}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
