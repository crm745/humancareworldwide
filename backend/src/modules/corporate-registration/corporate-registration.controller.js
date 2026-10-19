const {
  createRegistration,
  getPublicRegistration,
  resendVerificationEmail,
  changeRegistrationEmail,
  verifyEmailToken,
  createCredentials,
} = require('./corporate-registration.service');

// Keys the corporate-portal's DocumentsStep uploads under — see
// corporate-portal/src/data/constants.js#REGISTRATION_DOCUMENTS.
const DOCUMENT_KEYS = ['registration', 'tax', 'bankProof', 'pan', 'msme', 'other'];
const DOCUMENT_LABELS = {
  registration: 'Company Registration Certificate',
  tax: 'Tax / GST Certificate',
  bankProof: 'Bank Proof',
  pan: 'Company PAN',
  msme: 'MSME / Udyam Registration Certificate',
  other: 'Other Supporting Document',
};

// company/bank arrive as JSON-stringified form fields (multipart can't nest JSON
// directly); documents arrive as real files, one field per document key.
function postRegister(req, res, next) {
  (async () => {
    let company, bank;
    try {
      company = JSON.parse(req.body.company);
      bank = JSON.parse(req.body.bank);
    } catch {
      return res.status(400).json({ error: 'company and bank must be valid JSON.' });
    }
    if (!company?.companyName || !company?.officialEmail) {
      return res.status(400).json({ error: 'company is missing required fields.' });
    }

    const documents = DOCUMENT_KEYS.flatMap((key) => {
      const file = req.files?.[key]?.[0];
      if (!file) return [];
      return [{ key, label: DOCUMENT_LABELS[key], fileName: file.originalname, fileUrl: `/uploads/${file.filename}`, size: file.size, status: 'Uploaded' }];
    });

    const registration = await createRegistration({ company, bank, documents, email: company.officialEmail });
    res.status(201).json(registration);
  })().catch(next);
}

async function getRegistration(req, res, next) {
  try {
    res.json(await getPublicRegistration(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function postResendVerification(req, res, next) {
  try {
    res.json(await resendVerificationEmail(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function patchEmail(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required.' });
    res.json(await changeRegistrationEmail(req.params.id, email));
  } catch (err) {
    next(err);
  }
}

async function getVerifyEmail(req, res, next) {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'token is required.' });
    res.json(await verifyEmailToken(token));
  } catch (err) {
    next(err);
  }
}

async function postCredentials(req, res, next) {
  try {
    const { password } = req.body;
    if (!password || password.length < 8) return res.status(400).json({ error: 'password must be at least 8 characters.' });
    res.json(await createCredentials(req.params.id, password));
  } catch (err) {
    next(err);
  }
}

module.exports = { postRegister, getRegistration, postResendVerification, patchEmail, getVerifyEmail, postCredentials, DOCUMENT_KEYS };
