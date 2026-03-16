import Workspace from "../models/Workspace.js";
import Membership from "../models/Membership.js";

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
