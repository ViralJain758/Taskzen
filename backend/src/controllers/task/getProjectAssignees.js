import Project from "../../models/Project.js";
import Membership from "../../models/Membership.js";
import { INTERNAL_SERVER_ERROR } from "./constants.js";

export const getProjectAssignees = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const userMembership = await Membership.findOne({
      user: req.user._id,
      workspace: project.workspace,
    });

    if (!userMembership) {
      return res.status(403).json({
        message: "You are not a member of this workspace",
      });
    }

    const memberships = await Membership.find({
      workspace: project.workspace,
    }).populate("user", "name email");

    const assignees = memberships
      .filter((membership) => membership.user)
      .map((membership) => ({
        _id: membership.user._id,
        name: membership.user.name,
        email: membership.user.email,
        role: membership.role,
      }));

    res.json(assignees);
  } catch (error) {
    res.status(500).json({
      message: INTERNAL_SERVER_ERROR,
    });
  }
};
