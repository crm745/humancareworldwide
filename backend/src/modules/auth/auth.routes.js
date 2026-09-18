const { Router } = require('express');
const { registerPatient, loginPatient, vendorLogin } = require('./auth.controller');

const authRouter = Router();

authRouter.post('/register', registerPatient);
authRouter.post('/login', loginPatient);
authRouter.post('/vendor/login', vendorLogin);

module.exports = { authRouter };
