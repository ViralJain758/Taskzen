import Project from "../models/Project.js";
import Task from "../models/Task.js";

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
