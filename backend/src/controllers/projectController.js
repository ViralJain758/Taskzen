import Project from "../models/Project.js";
import Task from "../models/Task.js";
import Membership from "../models/Membership.js";
import Activity from "../models/Activity.js";

export const createProject = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Project name is required",
      });
    }

    const project = await Project.create({
      name,
      description,
      workspace: workspaceId,
      createdBy: req.user._id,
    });

    const actorName = req.user?.name || "Someone";
    const activity = await Activity.create({
      workspace: workspaceId,
      project: project._id,
      projectName: project.name,
      actor: req.user._id,
      actorName,
      message: `${actorName} created project "${project.name}"`,
      type: "project_created",
    });

    req.io.to(`workspace:${workspaceId}`).emit("workspace:activity_created", {
      workspaceId,
      activity,
    });

    res.status(201).json({
      message: "Project created successfully",
      project,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getWorkspaceProjects = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const projects = await Project.find({
      workspace: workspaceId,
    }).populate("createdBy", "name email");

    res.json(projects);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getProjectById = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId)
      .populate("workspace", "name")
      .populate("createdBy", "name email");

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const membership = await Membership.findOne({
      user: req.user._id,
      workspace: project.workspace._id,
    });

    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this workspace",
      });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const { workspaceId, projectId } = req.params;

    const project = await Project.findOne({
      _id: projectId,
      workspace: workspaceId,
    });

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    await Task.deleteMany({ project: projectId });

    const actorName = req.user?.name || "Someone";
    const activity = await Activity.create({
      workspace: workspaceId,
      project: project._id,
      projectName: project.name,
      actor: req.user._id,
      actorName,
      message: `${actorName} deleted project "${project.name}"`,
      type: "project_deleted",
    });

    req.io.to(`workspace:${workspaceId}`).emit("workspace:activity_created", {
      workspaceId,
      activity,
    });

    await project.deleteOne();

    res.json({
      message: "Project deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
