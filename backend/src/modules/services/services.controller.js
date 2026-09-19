const SERVICES = require('./services.data');

function listServices(req, res) {
  res.json({ services: SERVICES });
}

function getService(req, res) {
  const service = SERVICES.find((s) => s.slug === req.params.slug);
  if (!service) return res.status(404).json({ error: 'Service not found' });
  res.json({ service });
}

module.exports = { listServices, getService };
