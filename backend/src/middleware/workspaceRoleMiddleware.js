import Membership from "../models/Membership.js";

export const authorizeWorkspaceRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const { workspaceId } = req.params;

      const membership = await Membership.findOne({
        user: req.user._id,
        workspace: workspaceId,
      });

      if (!membership) {
        return res.status(403).json({
          message: "You are not a member of this workspace",
        });
      }

      if (!allowedRoles.includes(membership.role)) {
        return res.status(403).json({
          message: "You do not have permission for this action",
        });
      }

      req.membership = membership;

      next();
    } catch (error) {
      res.status(500).json({
        message: "Internal server error",
      });
    }
  };
};
