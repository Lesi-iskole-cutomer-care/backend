// api/middleware/auth.js
import User from '../../infastructure/schemas/User.js';

// ✅ Simple "isAuthenticated" without JWT
// Frontend must send:  x-user-id: <MongoDB user._id>
export const isAuthenticated = async (req, res, next) => {
  try {
    const userId = req.header('x-user-id');

    if (!userId) {
      return res.status(401).json({ message: 'No user id provided in x-user-id header' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user; // attach user to request
    next();
  } catch (err) {
    console.error('isAuthenticated error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ✅ Role-based authorization (optional)
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Forbidden: insufficient rights' });
      }

      next();
    } catch (err) {
      console.error('authorizeRoles error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  };
};
