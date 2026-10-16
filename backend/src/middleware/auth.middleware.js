const jwt = require('jsonwebtoken');

// No cookie-parser dependency for the sake of one cookie — this reads it straight
// off the raw Cookie header. Only the admin portal sets this cookie (see
// admin.controller.js#login); every other client still authenticates via the
// Authorization header, which is checked first and wins if both are present.
function getCookieToken(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  const match = header.split(';').map((p) => p.trim()).find((p) => p.startsWith(name + '='));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function requireAuth(allowedRoles) {
  return function (req, res, next) {
    const header = req.headers.authorization;
    const token = header && header.startsWith('Bearer ') ? header.slice('Bearer '.length) : getCookieToken(req, 'hc_admin_token');
    if (!token) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new Error('JWT_ACCESS_SECRET is not set');

    let payload;
    try {
      payload = jwt.verify(token, secret);
    } catch (err) {
      const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
      return res.status(401).json({ error: message });
    }

    if (allowedRoles && !allowedRoles.includes(payload.role)) {
      return res.status(403).json({ error: 'Not authorized for this action' });
    }

    req.user = { id: payload.sub, role: payload.role, corporateId: payload.corporateId ?? null };
    next();
  };
}

module.exports = { requireAuth };
