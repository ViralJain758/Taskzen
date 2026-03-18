export const generateInsights = (tasks, assignees = []) => {
  const insights = [];
  const now = new Date();

  // 1. Overdue tasks
  const overdue = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "completed",
  );

  if (overdue.length > 0) {
    insights.push({
      type: "overdue",
      icon: "",
      message: `${overdue.length} task${overdue.length === 1 ? "" : "s"} overdue`,
      severity: "high",
      count: overdue.length,
    });
  }

  // 2. Stuck tasks (in_progress for > 3 days)
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
  const stuck = tasks.filter((t) => {
    if (t.status !== "in_progress") return false;
    const updatedAt = new Date(t.updatedAt);
    return now - updatedAt > threeDaysMs;
  });

  if (stuck.length > 0) {
    insights.push({
      type: "stuck",
      icon: "",
      message: `${stuck.length} task${stuck.length === 1 ? "" : "s"} stuck in progress`,
      severity: "medium",
      count: stuck.length,
    });
  }

  // 3. Overloaded assignees (> 4 active tasks)
  const assigneeTaskCount = {};
  tasks
    .filter((t) => t.status !== "completed" && t.assignee)
    .forEach((t) => {
      const assigneeId = t.assignee._id || t.assignee;
      assigneeTaskCount[assigneeId] = (assigneeTaskCount[assigneeId] || 0) + 1;
    });

  const assigneeLoadEntries = Object.entries(assigneeTaskCount).map(
    ([assigneeId, count]) => {
      const assignee = assignees.find((a) => a._id.toString() === assigneeId);
      return {
        id: assigneeId,
        name: assignee?.name || "Unknown",
        count,
      };
    },
  );

  const overloadedAssignees = assigneeLoadEntries
    .filter((entry) => entry.count > 4)
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      count: entry.count,
    }));

  if (overloadedAssignees.length > 0) {
    overloadedAssignees.forEach((assignee) => {
      insights.push({
        type: "overloaded",
        icon: "",
        message: `${assignee.name} is overloaded (${assignee.count} active tasks)`,
        severity: "medium",
        count: assignee.count,
      });
    });
  }

  // 3b. Always show current workload snapshot so user load is visible.
  if (assigneeLoadEntries.length > 0) {
    const topLoads = assigneeLoadEntries
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((entry) => `${entry.name}: ${entry.count}`)
      .join(", ");

    insights.push({
      type: "workload",
      icon: "",
      message: `Current load (active tasks): ${topLoads}`,
      severity: "info",
      count: assigneeLoadEntries.length,
    });
  }

  // 4. Project health (simple estimation)
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const completionPercentage =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  let healthMessage = "";
  let healthIcon = "";
  let healthSeverity = "info";

  if (totalTasks === 0) {
    healthMessage = "No tasks yet - add tasks to get smarter insights";
    healthIcon = "";
    healthSeverity = "info";
  } else if (completionPercentage >= 75) {
    healthMessage = "On track - great progress!";
    healthIcon = "";
    healthSeverity = "good";
  } else if (completionPercentage >= 50) {
    healthMessage = "Steady progress";
    healthIcon = "";
    healthSeverity = "info";
  } else if (completionPercentage >= 25) {
    healthMessage = "Getting started";
    healthIcon = "";
    healthSeverity = "info";
  } else if (totalTasks > 0) {
    healthMessage = "Project just started";
    healthIcon = "";
    healthSeverity = "info";
  }

  insights.push({
    type: "health",
    icon: healthIcon,
    message: healthMessage,
    severity: healthSeverity,
    meta: {
      completion: completionPercentage,
      total: totalTasks,
      completed: completedTasks,
    },
  });

  return insights;
};
