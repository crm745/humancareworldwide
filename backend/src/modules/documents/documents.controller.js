const path = require('path');
const { getDocumentForUser } = require('./documents.service');
const { UPLOAD_DIR } = require('../../middleware/upload.middleware');

async function downloadDocument(req, res, next) {
  try {
    const document = await getDocumentForUser(req.params.id, req.user);
    const filename = path.basename(document.fileUrl); // fileUrl is "/uploads/<filename>"
    res.download(path.join(UPLOAD_DIR, filename), document.name);
  } catch (err) {
    next(err);
  }
}

module.exports = { downloadDocument };
