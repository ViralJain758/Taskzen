import Activity from "../models/Activity.js";
import Project from "../models/Project.js";
import Membership from "../models/Membership.js";

export const getProjectActivities = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId).select("workspace");

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

    const activities = await Activity.find({ project: projectId })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(activities);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getWorkspaceActivities = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const parsedPage = Number.parseInt(String(req.query.page || "1"), 10);
    const parsedLimit = Number.parseInt(String(req.query.limit || "20"), 10);
    const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
    const limit = Number.isNaN(parsedLimit)
      ? 20
      : Math.min(Math.max(parsedLimit, 1), 100);
    const skip = (page - 1) * limit;

    const membership = await Membership.findOne({
      user: req.user._id,
      workspace: workspaceId,
    });

    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this workspace",
      });
    }

    const total = await Activity.countDocuments({ workspace: workspaceId });
    const activities = await Activity.find({ workspace: workspaceId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    res.json({
      activities,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
