const {
  createRequest,
  listRequestsForUser,
  getRequestForUser,
  getRequestByReferenceForGuest,
} = require('./requests.service');

const REQUIRED_FIELDS = ['serviceType', 'patientName', 'origin', 'destination'];

async function submitRequest(req, res, next) {
  try {
    const missing = REQUIRED_FIELDS.filter((field) => !req.body[field]);
    if (missing.length) {
      return res.status(400).json({ error: `Missing required field(s): ${missing.join(', ')}` });
    }
    const request = await createRequest(req.user.id, req.body);
    res.status(201).json({ request });
  } catch (err) {
    next(err);
  }
}

async function listMyRequests(req, res, next) {
  try {
    const requests = await listRequestsForUser(req.user.id, { status: req.query.status });
    res.json({ requests });
  } catch (err) {
    next(err);
  }
}

async function getMyRequestById(req, res, next) {
  try {
    const request = await getRequestForUser(req.user.id, req.params.id);
    res.json({ request });
  } catch (err) {
    next(err);
  }
}

async function trackByReference(req, res, next) {
  try {
    const { mobile } = req.query;
    if (!mobile) return res.status(400).json({ error: 'mobile query parameter is required' });
    const request = await getRequestByReferenceForGuest(req.params.ref, mobile);
    res.json({ request });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  submitRequest,
  listMyRequests,
  getMyRequestById,
  trackByReference,
};
