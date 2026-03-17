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

export const getWorkspaceMembers = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const memberships = await Membership.find({
      workspace: workspaceId,
    }).populate("user", "name email");

    const members = memberships
      .filter((membership) => membership.user)
      .map((membership) => ({
        user: {
          _id: membership.user._id,
          name: membership.user.name,
          email: membership.user.email,
        },
        role: membership.role,
      }));

    res.json({
      members,
      requesterRole: req.membership.role,
      canManageMembers: ["owner", "admin"].includes(req.membership.role),
      canManageRoles: req.membership.role === "owner",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const updateWorkspaceMemberRole = async (req, res) => {
  try {
    const { workspaceId, memberId } = req.params;
    const { role } = req.body;

    if (!["admin", "member"].includes(role)) {
      return res.status(400).json({
        message: "Role must be either admin or member",
      });
    }

    if (req.membership.role !== "owner") {
      return res.status(403).json({
        message: "Only owner can update member roles",
      });
    }

    const targetMembership = await Membership.findOne({
      workspace: workspaceId,
      user: memberId,
    }).populate("user", "name email");

    if (!targetMembership) {
      return res.status(404).json({
        message: "Member not found in this workspace",
      });
    }

    if (targetMembership.role === "owner") {
      return res.status(400).json({
        message: "Workspace owner role cannot be changed",
      });
    }

    targetMembership.role = role;
    await targetMembership.save();

    res.json({
      message: "Member role updated successfully",
      member: {
        user: {
          _id: targetMembership.user._id,
          name: targetMembership.user.name,
          email: targetMembership.user.email,
        },
        role: targetMembership.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const removeWorkspaceMember = async (req, res) => {
  try {
    const { workspaceId, memberId } = req.params;

    const targetMembership = await Membership.findOne({
      workspace: workspaceId,
      user: memberId,
    });

    if (!targetMembership) {
      return res.status(404).json({
        message: "Member not found in this workspace",
      });
    }

    if (targetMembership.role === "owner") {
      return res.status(400).json({
        message: "Workspace owner cannot be removed",
      });
    }

    if (req.membership.role === "admin" && targetMembership.role !== "member") {
      return res.status(403).json({
        message: "Admins can only remove members",
      });
    }

    await targetMembership.deleteOne();

    res.json({
      message: "Member removed successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const leaveWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    if (req.membership.role === "owner") {
      return res.status(400).json({
        message: "Workspace owner cannot leave the workspace",
      });
    }

    await Membership.deleteOne({
      workspace: workspaceId,
      user: req.user._id,
    });

    res.json({
      message: "You left the workspace successfully",
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
