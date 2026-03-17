import Workspace from "../models/Workspace.js";
import Membership from "../models/Membership.js";
import User from "../models/User.js";
import Project from "../models/Project.js";
import Task from "../models/Task.js";

export const createWorkspace = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Workspace name is required",
      });
    }

    const workspace = await Workspace.create({
      name,
      owner: req.user._id,
    });

    await Membership.create({
      user: req.user._id,
      workspace: workspace._id,
      role: "owner",
    });

    res.status(201).json({
      message: "Workspace created successfully",
      workspace,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getUserWorkspaces = async (req, res) => {
  try {
    const memberships = await Membership.find({
      user: req.user._id,
    }).populate("workspace");

    const workspaces = memberships.map((m) => ({
      role: m.role,
      workspace: m.workspace,
    }));

    res.json(workspaces);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const inviteMember = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { email, role } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const existingMembership = await Membership.findOne({
      user: user._id,
      workspace: workspaceId,
    });

    if (existingMembership) {
      return res.status(400).json({
        message: "User already in workspace",
      });
    }

    const membership = await Membership.create({
      user: user._id,
      workspace: workspaceId,
      role: role || "member",
    });

    res.status(201).json({
      message: "User added to workspace",
      membership,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const deleteWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({
        message: "Workspace not found",
      });
    }

    const projects = await Project.find({ workspace: workspaceId }).select(
      "_id",
    );
    const projectIds = projects.map((project) => project._id);

    if (projectIds.length > 0) {
      await Task.deleteMany({ project: { $in: projectIds } });
      await Project.deleteMany({ _id: { $in: projectIds } });
    }

    await Membership.deleteMany({ workspace: workspaceId });
    await workspace.deleteOne();

    res.json({
      message: "Workspace deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
