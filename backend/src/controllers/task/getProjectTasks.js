import Task from "../../models/Task.js";
import Project from "../../models/Project.js";
import Membership from "../../models/Membership.js";
import { INTERNAL_SERVER_ERROR } from "./constants.js";

export const getProjectTasks = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const membership = await Membership.findOne({
      user: req.user._id,
      workspace: project.workspace,
    });

    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this workspace",
      });
    }

    const tasks = await Task.find({
      project: projectId,
    })
      .populate("assignee", "name email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({
      message: INTERNAL_SERVER_ERROR,
    });
  }
};
