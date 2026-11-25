// RBAC Role Hierarchy & Capability Matrix
export const ROLE_PERMISSIONS = {
  Owner: [
    'WORKSPACE_MANAGE',
    'WORKSPACE_DELETE',
    'BILLING_MANAGE',
    'USER_MANAGE_ROLES',
    'USER_INVITE',
    'CHANNEL_CREATE',
    'CHANNEL_DELETE',
    'CHANNEL_VIEW',
    'TASK_CREATE',
    'TASK_UPDATE',
    'TASK_DELETE',
    'TASK_VIEW',
    'COMMENT_POST',
    'CALL_HOST',
    'CALL_JOIN',
  ],
  Admin: [
    'USER_INVITE',
    'CHANNEL_CREATE',
    'CHANNEL_DELETE',
    'CHANNEL_VIEW',
    'TASK_CREATE',
    'TASK_UPDATE',
    'TASK_DELETE',
    'TASK_VIEW',
    'TASK_ASSIGN',
    'COMMENT_POST',
    'CALL_HOST',
    'CALL_JOIN',
  ],
  Editor: [
    'USER_INVITE',
    'CHANNEL_CREATE',
    'CHANNEL_VIEW',
    'TASK_CREATE',
    'TASK_UPDATE',
    'TASK_DELETE',
    'TASK_VIEW',
    'COMMENT_POST',
    'CALL_HOST',
    'CALL_JOIN',
  ],
  Viewer: [
    'CHANNEL_CREATE',
    'CHANNEL_VIEW',
    'TASK_VIEW',
    'COMMENT_POST',
    'CALL_HOST',
    'CALL_JOIN',
  ],
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before checking roles',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Action requires one of [${roles.join(', ')}] roles. Your current role is "${req.user.role}".`,
        requiredRoles: roles,
        currentRole: req.user.role,
      });
    }

    next();
  };
};

export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before checking permissions',
      });
    }

    const userPermissions = ROLE_PERMISSIONS[req.user.role] || [];
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Your role (${req.user.role}) lacks the required "${permission}" permission.`,
        requiredPermission: permission,
        role: req.user.role,
      });
    }

    next();
  };
};
