const disposableDomains = require("disposable-email-domains");
const { prisma } = require("../../db/prisma");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashPassword,
  comparePassword,
  issueOtp,
  verifyOtp,
  verifyGoogleIdToken,
  verifyAppleIdToken,
  findOrCreateSocialUser,
} = require("./auth.service");

const disposableDomainSet = new Set(disposableDomains);
function isDisposableEmail(email) {
  const domain = email.split("@")[1]?.toLowerCase();
  return !!domain && disposableDomainSet.has(domain);
}

//the
async function registerRequestOtp(req, res) {
  const { name, email, mobile, countryCode } = req.body;
  if (!name || !email || !mobile) {
    return res
      .status(400)
      .json({ error: "name, email and mobile are required" });
  }
  if (isDisposableEmail(email)) {
    return res
      .status(400)
      .json({ error: "Please use a permanent email address, not a temporary/disposable one." });
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { mobile }] },
  });
  if (existing) {
    return res
      .status(409)
      .json({
        error: "An account with that email or mobile number already exists.",
      });
  }

  const result = await issueOtp(mobile, "patient_register", countryCode);
  if (result.throttled) {
    return res
      .status(429)
      .json({
        error: `Please wait ${result.secondsLeft}s before requesting another code.`,
        secondsLeft: result.secondsLeft,
      });
  }
  res.json({ message: "OTP sent." });
}
//
async function registerVerifyOtp(req, res) {
  const { name, email, mobile, countryCode, code } = req.body;
  if (!name || !email || !mobile || !code) {
    return res
      .status(400)
      .json({ error: "name, email, mobile and code are required" });
  }
  if (isDisposableEmail(email)) {
    return res
      .status(400)
      .json({ error: "Please use a permanent email address, not a temporary/disposable one." });
  }

  const result = await verifyOtp(mobile, "patient_register", code);
  if (!result.ok) return res.status(401).json({ error: result.reason });

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { mobile }] },
  });
  if (existing) {
    return res
      .status(409)
      .json({
        error: "An account with that email or mobile number already exists.",
      });
  }

  const user = await prisma.user.create({
    data: { name, email, mobile, countryCode: countryCode || "+91" },
  });

  const token = signAccessToken({ sub: user.id, role: "patient" });
  const refreshToken = signRefreshToken({ sub: user.id, role: "patient" });
  const { passwordHash: _omit, ...safeUser } = user;
  res.status(201).json({ token, refreshToken, user: safeUser });
}

// Mobile numbers are stored without a country code (e.g. "8691930716"), but someone
// logging in might type "+918691930716" — matching on the exact string would miss
// their own account. A fixed "last 10 digits" match only works for the countries whose
// national numbers happen to be 10 digits long (India/UK/US are, but e.g. the UAE's are
// 9) — so instead we try the typed digits with 0 to 4 leading characters stripped (the
// range of real-world calling-code lengths) and match whichever one is a stored number.
// That works for any country without needing a hardcoded table of code lengths.
async function findUserByIdentifier(identifier) {
  if (identifier.includes("@")) {
    return prisma.user.findFirst({ where: { email: identifier } });
  }
  const digits = identifier.replace(/\D/g, "");
  const candidates = [0, 1, 2, 3, 4].map((n) => digits.slice(n)).filter(Boolean);
  return prisma.user.findFirst({ where: { mobile: { in: candidates } } });
}
//
async function loginRequestOtp(req, res) {
  const { identifier } = req.body;
  if (!identifier)
    return res
      .status(400)
      .json({ error: "identifier (email or mobile) is required" });

  const user = await findUserByIdentifier(identifier);
  if (user) {
    const result = await issueOtp(identifier, "patient_login", user.countryCode);
    if (result.throttled) {
      return res
        .status(429)
        .json({
          error: `Please wait ${result.secondsLeft}s before requesting another code.`,
          secondsLeft: result.secondsLeft,
        });
    }
  }
  // Same response whether or not the account exists, so we don't reveal which emails/mobiles are registered.
  res.json({
    message:
      "If an account exists for that email or mobile number, an OTP has been sent.",
  });
}
//
async function loginVerifyOtp(req, res) {
  const { identifier, code } = req.body;
  if (!identifier || !code)
    return res.status(400).json({ error: "identifier and code are required" });

  const result = await verifyOtp(identifier, "patient_login", code);
  if (!result.ok) return res.status(401).json({ error: result.reason });

  const user = await findUserByIdentifier(identifier);
  if (!user) return res.status(404).json({ error: "Account not found" });

  const token = signAccessToken({ sub: user.id, role: "patient" });
  const refreshToken = signRefreshToken({ sub: user.id, role: "patient" });
  const { passwordHash: _omit, ...safeUser } = user;
  res.json({ token, refreshToken, user: safeUser });
}
// the function for continue with google 
async function googleLogin(req, res) {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: "idToken is required" });

  let payload;
  try {
    payload = await verifyGoogleIdToken(idToken);
  } catch (err) {
    return res.status(401).json({ error: "Invalid Google token" });
  }

  const user = await findOrCreateSocialUser({ provider: "google", ...payload });
  const token = signAccessToken({ sub: user.id, role: "patient" });
  const refreshToken = signRefreshToken({ sub: user.id, role: "patient" });
  const { passwordHash: _omit, ...safeUser } = user;
  res.json({ token, refreshToken, user: safeUser });
}
//the function for apple login with the help of name and password
async function appleLogin(req, res) {
  const { idToken, name } = req.body;
  if (!idToken) return res.status(400).json({ error: "idToken is required" });

  let payload;
  try {
    payload = await verifyAppleIdToken(idToken);
  } catch (err) {
    return res.status(401).json({ error: "Invalid Apple token" });
  }

  const user = await findOrCreateSocialUser({ provider: "apple", ...payload, name });
  const token = signAccessToken({ sub: user.id, role: "patient" });
  const refreshToken = signRefreshToken({ sub: user.id, role: "patient" });
  const { passwordHash: _omit, ...safeUser } = user;
  res.json({ token, refreshToken, user: safeUser });
}

// Step 1 of vendor login: password gets you an OTP, not a token — the actual
// token only comes from vendorVerifyOtp below. Same "don't reveal which accounts
// exist" shape as the patient OTP flow isn't needed here since a wrong password
// already tells you the account exists, so we just say "Invalid credentials" plainly.
async function vendorLogin(req, res) {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "email and password are required" });

  const vendorUser = await prisma.vendorUser.findUnique({ where: { email } });
  if (!vendorUser)
    return res.status(401).json({ error: "Invalid credentials" });

  const matches = await comparePassword(password, vendorUser.passwordHash);
  if (!matches) return res.status(401).json({ error: "Invalid credentials" });

  const result = await issueOtp(email, "vendor_login");
  if (result.throttled) {
    return res
      .status(429)
      .json({
        error: `Please wait ${result.secondsLeft}s before requesting another code.`,
        secondsLeft: result.secondsLeft,
      });
  }
  res.json({ message: "OTP sent." });
}
// Step 2: the actual token issuance, once the OTP sent above checks out.
async function vendorVerifyOtp(req, res) {
  const { email, code } = req.body;
  if (!email || !code)
    return res.status(400).json({ error: "email and code are required" });

  const result = await verifyOtp(email, "vendor_login", code);
  if (!result.ok) return res.status(401).json({ error: result.reason });

  const vendorUser = await prisma.vendorUser.findUnique({
    where: { email },
    include: { vendor: true },
  });
  if (!vendorUser) return res.status(404).json({ error: "Account not found" });

  const token = signAccessToken({
    sub: vendorUser.id,
    role: "vendor",
    vendorId: vendorUser.vendorId,
  });
  const refreshToken = signRefreshToken({
    sub: vendorUser.id,
    role: "vendor",
    vendorId: vendorUser.vendorId,
  });
  const { passwordHash: _omit, ...safeVendorUser } = vendorUser;
  res.json({ token, refreshToken, vendorUser: safeVendorUser });
}
//
async function refreshAccessToken(req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(400).json({ error: "refreshToken is required" });

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }

  const claims = {
    sub: payload.sub,
    role: payload.role,
    ...(payload.vendorId != null && { vendorId: payload.vendorId }),
  };
  const token = signAccessToken(claims);
  const newRefreshToken = signRefreshToken(claims);
  res.json({ token, refreshToken: newRefreshToken });
}
//the function for getting  the profile page
async function getMe(req, res) {
  if (req.user.role === "vendor") {
    const vendorUser = await prisma.vendorUser.findUnique({
      where: { id: req.user.id },
      include: { vendor: true },
    });
    if (!vendorUser)
      return res.status(404).json({ error: "Account not found" });
    const { passwordHash: _omit, ...safeVendorUser } = vendorUser;
    return res.json({ vendorUser: safeVendorUser });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: "Account not found" });
  const { passwordHash: _omit, ...safeUser } = user;
  res.json({ user: safeUser });
}
// the function for updating the profile using email
async function updateMe(req, res) {
  const { name, mobile, email, countryCode } = req.body;

  if (mobile) {
    const existing = await prisma.user.findFirst({
      where: { mobile, NOT: { id: req.user.id } },
    });
    if (existing)
      return res
        .status(409)
        .json({
          error: "That mobile number is already in use by another account.",
        });
  }
  if (email) {
    const existing = await prisma.user.findFirst({
      where: { email, NOT: { id: req.user.id } },
    });
    if (existing)
      return res
        .status(409)
        .json({ error: "That email is already in use by another account." });
  }

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      ...(name && { name }),
      ...(mobile && { mobile }),
      ...(email && { email }),
      ...(countryCode && { countryCode }),
    },
  });
  const { passwordHash: _omit, ...safeUser } = user;
  res.json({ user: safeUser });
}
// the function for saving the push token in the db for popup notification and we need ios account for it while doing the login task with it we'll do the notification task as well
async function savePushToken(req, res) {
  const { pushToken } = req.body;
  if (!pushToken) return res.status(400).json({ error: "pushToken is required" });

  await prisma.user.update({ where: { id: req.user.id }, data: { pushToken } });
  res.json({ message: "Push token saved." });
}

// Vendor accounts still use a password, so "forgot password" only applies to them —
// patients authenticate via OTP and have nothing to reset.
async function requestPasswordReset(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "email is required" });

  const vendorUser = await prisma.vendorUser.findUnique({ where: { email } });
  if (vendorUser) {
    const result = await issueOtp(email, "vendor_password_reset");
    if (result.throttled) {
      return res
        .status(429)
        .json({
          error: `Please wait ${result.secondsLeft}s before requesting another code.`,
          secondsLeft: result.secondsLeft,
        });
    }
  }
  // Same response whether or not the account exists, so we don't reveal which emails are registered.
  res.json({
    message:
      "If a vendor account exists for that email, a reset code has been sent.",
  });
}

async function resetPassword(req, res) {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res
      .status(400)
      .json({ error: "email, code and newPassword are required" });
  }
  if (newPassword.length < 8) {
    return res
      .status(400)
      .json({ error: "Password must be at least 8 characters" });
  }

  const result = await verifyOtp(email, "vendor_password_reset", code);
  if (!result.ok) return res.status(401).json({ error: result.reason });

  const vendorUser = await prisma.vendorUser.findUnique({ where: { email } });
  if (!vendorUser) return res.status(404).json({ error: "Account not found" });

  const passwordHash = await hashPassword(newPassword);
  await prisma.vendorUser.update({
    where: { id: vendorUser.id },
    data: { passwordHash },
  });
  res.json({
    message: "Password updated. Please log in with your new password.",
  });
}

// For a vendor who's already logged in and knows their current password — different
// from resetPassword above, which is for someone locked out who verifies via OTP instead.
async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ error: "currentPassword and newPassword are required" });
  }
  if (newPassword.length < 8) {
    return res
      .status(400)
      .json({ error: "Password must be at least 8 characters" });
  }

  const vendorUser = await prisma.vendorUser.findUnique({ where: { id: req.user.id } });
  if (!vendorUser) return res.status(404).json({ error: "Account not found" });

  const matches = await comparePassword(currentPassword, vendorUser.passwordHash);
  if (!matches) return res.status(400).json({ error: "Current password is incorrect." });

  const passwordHash = await hashPassword(newPassword);
  await prisma.vendorUser.update({ where: { id: vendorUser.id }, data: { passwordHash } });
  res.json({ message: "Password updated." });
}

// JWTs are stateless — there's no server-side session to end, so this is just a
// well-known endpoint for the frontend to call that always succeeds.
async function vendorLogout(req, res) {
  res.json({ message: "Logged out." });
}

module.exports = {
  registerRequestOtp,
  registerVerifyOtp,
  loginRequestOtp,
  loginVerifyOtp,
  googleLogin,
  appleLogin,
  vendorLogin,
  vendorVerifyOtp,
  refreshAccessToken,
  getMe,
  updateMe,
  savePushToken,
  requestPasswordReset,
  resetPassword,
  changePassword,
  vendorLogout,
};
