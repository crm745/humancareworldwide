const jwt = require('jsonwebtoken');

function requireAuth(allowedRoles) {
  return function (req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    const token = header.slice('Bearer '.length);
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

    req.user = { id: payload.sub, role: payload.role, vendorId: payload.vendorId ?? null };
    next();
  };
}

module.exports = { requireAuth };
