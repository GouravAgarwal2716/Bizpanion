const { User } = require('../models');

/**
 * Role-based authorization middleware.
 * Usage: router.get('/admin/route', auth, requireRoles('admin'), handler)
 * Allowed roles: 'entrepreneur' | 'consultant' | 'vendor' | 'admin'
 */
function requireRoles(...allowed) {
  const normalized = (allowed || []).map((r) => String(r).toLowerCase());

  return async function (req, res, next) {
    try {
      // auth middleware should set req.user = { id, role, ... }
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      let role = req.user.role;
      // Fallback: fetch from DB if role missing from token
      if (!role) {
        const user = await User.findByPk(req.user.id, { attributes: ['id', 'role'] });
        role = user?.role;
      }

      if (!role) {
        return res.status(403).json({ error: 'Forbidden: role not found' });
      }

      const hasAccess =
        normalized.length === 0 || normalized.includes(String(role).toLowerCase());

      if (!hasAccess) {
        return res.status(403).json({ error: 'Forbidden: insufficient role' });
      }

      next();
    } catch (err) {
      console.error('Role check failed:', err);
      res.status(500).json({ error: 'Role verification failed' });
    }
  };
}

module.exports = { requireRoles };
