const {
  listAllServices,
  getServiceBySlug,
  createServiceRecord,
  updateServiceRecord,
  deleteServiceRecord,
} = require('./services.service');

async function listServices(req, res, next) {
  try {
    const services = await listAllServices();
    res.json({ services });
  } catch (err) {
    next(err);
  }
}

async function getService(req, res, next) {
  try {
    const service = await getServiceBySlug(req.params.slug);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    res.json({ service });
  } catch (err) {
    next(err);
  }
}

async function createService(req, res, next) {
  try {
    const { slug, name, subtitle, description, provides, sortOrder } = req.body;
    if (!slug || !name) return res.status(400).json({ error: 'slug and name are required' });
    const service = await createServiceRecord({ slug, name, subtitle, description, provides, sortOrder });
    res.status(201).json({ service });
  } catch (err) {
    next(err);
  }
}

async function updateService(req, res, next) {
  try {
    const service = await updateServiceRecord(req.params.slug, req.body);
    res.json({ service });
  } catch (err) {
    next(err);
  }
}

async function deleteService(req, res, next) {
  try {
    await deleteServiceRecord(req.params.slug);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { listServices, getService, createService, updateService, deleteService };
