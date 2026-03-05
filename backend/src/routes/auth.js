const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../utils/prisma');
const { logger } = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');
const {
  verifyPan,
  sendMobileOtp, verifyMobileOtp,
  maskAadhaar, validateAadhaar, validatePan
} = require('../services/idfyService');
const aadhaarKyc = require('../services/sandboxKycService');

/**
 * TOKEN UTILS
 */
const generateTokens = (userId) => ({
  accessToken: jwt.sign(
    { userId, type: 'CITIZEN' },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  ),
  refreshToken: jwt.sign(
    { userId, type: 'CITIZEN' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  ),
});

const setAuthCookies = (res, accessToken, refreshToken) => {
  const prod = process.env.NODE_ENV === 'production';
  res.cookie('accessToken', accessToken, {
    httpOnly: true, secure: prod, sameSite: prod ? 'strict' : 'lax',
    maxAge: 15 * 60 * 1000,
  });
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true, secure: prod, sameSite: prod ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth/refresh',
  });
};

// In-memory pending tasks
const pendingAadhaarTasks = new Map();

// In-memory temp sessions for the phone-registration step
// Key: tempToken (uuid), Value: { userId, expiresAt }
const pendingPhoneRegistrations = new Map();

// ─────────────────────────────────────────────────────────────────────────────
// AADHAAR ROUTES
// ─────────────────────────────────────────────────────────────────────────────

router.post('/send-otp', async (req, res, next) => {
  try {
    const { aadhaar, language = 'en' } = req.body;
    if (!aadhaar) throw new AppError('Aadhaar is required', 400);

    const cleaned = aadhaar.replace(/\s|-/g, '');
    if (!validateAadhaar(cleaned)) throw new AppError('Invalid Aadhaar format', 400);

    const result = await aadhaarKyc.sendAadhaarOtp(cleaned);

    pendingAadhaarTasks.set(cleaned, {
      taskId: result.taskId,
      provider: result.provider,
      language,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    res.json({
      message: result.message,
      aadhaarMasked: maskAadhaar(cleaned),
      provider: result.provider,
      devMode: result.provider === 'dev',
      ...(result.devOtp ? { devOtp: result.devOtp } : {}),
    });
  } catch (error) { next(error); }
});

router.post('/verify-otp', async (req, res, next) => {
  try {
    const { aadhaar, otp, language = 'en' } = req.body;
    if (!aadhaar || !otp) throw new AppError('Aadhaar and OTP required', 400);

    const cleaned = aadhaar.replace(/\s|-/g, '');
    const pending = pendingAadhaarTasks.get(cleaned);

    if (!pending || pending.expiresAt < Date.now()) {
      throw new AppError('OTP expired or not requested', 400);
    }

    const result = await aadhaarKyc.verifyAadhaarOtp(cleaned, otp, pending.taskId);
    if (!result.verified) throw new AppError('Invalid OTP', 400);

    pendingAadhaarTasks.delete(cleaned);

    // Log full KYC response for audit trail
    logger.info('Aadhaar KYC Verified', {
      aadhaarMasked: maskAadhaar(cleaned),
      name: result.name,
      dateOfBirth: result.dob,
      careOf: result.rawData?.care_of,
      gender: result.rawData?.gender,
      address: result.rawData?.full_address,
    });

    // Extract KYC fields
    const kycName    = result.name || null;
    const kycDob     = result.dob || result.rawData?.date_of_birth || null;
    const kycCareOf  = result.rawData?.care_of || null;
    const kycAddress = result.rawData?.full_address || result.address || null;
    const kycGender  = result.rawData?.gender || result.gender || null;

    // Find or create user, save all KYC fields
    const user = await upsertCitizenUserWithKyc(
      maskAadhaar(cleaned),
      { name: kycName, dateOfBirth: kycDob, careOf: kycCareOf, residentialAddress: kycAddress, gender: kycGender },
      pending.language || language
    );

    // If account registration is already complete (phone linked previously), log in directly
    if (user.registrationComplete && user.mobileNumber) {
      const { accessToken, refreshToken } = generateTokens(user.id);
      await updateRefreshToken(user.id, refreshToken);
      setAuthCookies(res, accessToken, refreshToken);
      return res.json({ user, accessToken, needsPhone: false });
    }

    // New/incomplete account → need phone registration step
    const tempToken = uuidv4();
    pendingPhoneRegistrations.set(tempToken, {
      userId: user.id,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
    });

    return res.json({
      needsPhone: true,
      tempToken,
      user: { name: user.name, gender: user.gender },
    });
  } catch (error) { next(error); }
});

// ─────────────────────────────────────────────────────────────────────────────
// PHONE REGISTRATION ROUTES (second step of new account creation)
// ─────────────────────────────────────────────────────────────────────────────

// Step 1: send Twilio OTP to the phone number
router.post('/register/send-phone-otp', async (req, res, next) => {
  try {
    const { tempToken, mobile } = req.body;
    if (!tempToken || !mobile) throw new AppError('tempToken and mobile are required', 400);
    if (!/^\d{10}$/.test(mobile)) throw new AppError('Enter a valid 10-digit mobile number', 400);

    const session = pendingPhoneRegistrations.get(tempToken);
    if (!session || session.expiresAt < Date.now()) {
      throw new AppError('Session expired. Please restart Aadhaar verification.', 400);
    }

    // Check if mobile is already taken by another account
    const existing = await prisma.user.findFirst({ where: { mobileNumber: mobile } });
    if (existing && existing.id !== session.userId) {
      throw new AppError('This mobile number is already linked to another account', 409);
    }

    const result = await sendMobileOtp(mobile);
    res.json({ message: result.message, ...(result.devOtp ? { devOtp: result.devOtp } : {}) });
  } catch (error) { next(error); }
});

// Step 2: verify phone OTP + save phone + location → complete registration
router.post('/register/complete', async (req, res, next) => {
  try {
    const { tempToken, mobile, otp, latitude, longitude } = req.body;
    if (!tempToken || !mobile || !otp) throw new AppError('tempToken, mobile, and otp are required', 400);

    const session = pendingPhoneRegistrations.get(tempToken);
    if (!session || session.expiresAt < Date.now()) {
      throw new AppError('Session expired. Please restart Aadhaar verification.', 400);
    }

    const isOtpValid = await verifyMobileOtp(mobile, otp);
    if (!isOtpValid) throw new AppError('Invalid or expired OTP', 400);

    pendingPhoneRegistrations.delete(tempToken);

    const updateData = {
      mobileNumber: mobile,
      registrationComplete: true,
    };

    if (latitude && longitude) {
      updateData.latitude  = parseFloat(latitude);
      updateData.longitude = parseFloat(longitude);
      // Assign geofence
      const stations = await prisma.policeStation.findMany({ where: { status: true } });
      let matchedStationId = null, minDistance = Infinity;
      for (const st of stations) {
        const dist = haversineDistance(parseFloat(latitude), parseFloat(longitude), st.latitude, st.longitude);
        if (dist <= st.radiusKm && dist < minDistance) { minDistance = dist; matchedStationId = st.id; }
      }
      updateData.geofenceId = matchedStationId;
    }

    const user = await prisma.user.update({ where: { id: session.userId }, data: updateData });

    const { accessToken, refreshToken } = generateTokens(user.id);
    await updateRefreshToken(user.id, refreshToken);
    setAuthCookies(res, accessToken, refreshToken);

    res.json({ user, accessToken });
  } catch (error) {
    if (error.code === 'P2002') return next(new AppError('Mobile number already in use', 409));
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PHONE LOGIN ROUTES (returning users — phone-only quick login)
// ─────────────────────────────────────────────────────────────────────────────

router.post('/phone/send-otp', async (req, res, next) => {
  try {
    const { mobile } = req.body;
    if (!mobile || !/^\d{10}$/.test(mobile)) throw new AppError('Valid 10-digit mobile number required', 400);

    const user = await prisma.user.findFirst({ where: { mobileNumber: mobile } });
    if (!user) throw new AppError('No account found for this number. Please register with Aadhaar first.', 404);
    if (!user.registrationComplete) throw new AppError('Account registration is incomplete. Please complete Aadhaar onboarding.', 400);

    const result = await sendMobileOtp(mobile);
    res.json({ message: result.message, ...(result.devOtp ? { devOtp: result.devOtp } : {}) });
  } catch (error) { next(error); }
});

router.post('/phone/login', async (req, res, next) => {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) throw new AppError('Mobile and OTP required', 400);

    const isOtpValid = await verifyMobileOtp(mobile, otp);
    if (!isOtpValid) throw new AppError('Invalid or expired OTP', 400);

    const user = await prisma.user.findFirst({ where: { mobileNumber: mobile } });
    if (!user) throw new AppError('Account not found', 404);

    const { accessToken, refreshToken } = generateTokens(user.id);
    await updateRefreshToken(user.id, refreshToken);
    setAuthCookies(res, accessToken, refreshToken);

    res.json({ user, accessToken });
  } catch (error) { next(error); }
});

// ─────────────────────────────────────────────────────────────────────────────
// PAN ROUTES
// ─────────────────────────────────────────────────────────────────────────────

router.post('/pan/details', async (req, res, next) => {
  try {
    const { pan } = req.body;
    if (!pan) throw new AppError('PAN is required', 400);

    const cleaned = pan.toUpperCase().trim();
    if (!validatePan(cleaned)) throw new AppError('Invalid PAN format', 400);

    const details = await verifyPan(cleaned);
    res.json(details);
  } catch (error) { next(error); }
});

router.post('/send-mobile-otp', async (req, res, next) => {
  try {
    const { mobile } = req.body;
    if (!mobile) throw new AppError('Mobile number required', 400);

    const result = await sendMobileOtp(mobile);
    res.json(result);
  } catch (error) { next(error); }
});

router.post('/pan/login', async (req, res, next) => {
  try {
    const { pan, mobile, otp, name, language = 'en' } = req.body;
    if (!pan || !mobile || !otp) throw new AppError('PAN, Mobile and OTP required', 400);

    const isOtpValid = await verifyMobileOtp(mobile, otp);
    if (!isOtpValid) throw new AppError('Invalid OTP', 400);

    // Treat mobile number as the link for PAN users if PAN field doesn't exist in DB
    // We use the provided name from PAN verification
    let user = await prisma.user.findFirst({ where: { mobileNumber: mobile } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: uuidv4(),
          internalRef: `pan_${pan}_${Date.now().toString().slice(-4)}`,
          mobileNumber: mobile,
          name: name || null,
          isVerified: true,
          language
        }
      });
    } else {
      // Update name if provided from PAN details
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name: name || user.name, language }
      });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);
    await updateRefreshToken(user.id, refreshToken);
    setAuthCookies(res, accessToken, refreshToken);

    res.json({ user, accessToken });
  } catch (error) { next(error); }
});

router.post('/mobile/login', async (req, res, next) => {
  try {
    const { mobile, otp, name, language = 'en' } = req.body;
    if (!mobile || !otp) throw new AppError('Mobile and OTP required', 400);

    const isOtpValid = await verifyMobileOtp(mobile, otp);
    if (!isOtpValid) throw new AppError('Invalid OTP', 400);

    let user = await prisma.user.findFirst({ where: { mobileNumber: mobile } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: uuidv4(),
          internalRef: `mob_${mobile}_${Date.now().toString().slice(-4)}`,
          mobileNumber: mobile,
          name: name || null,
          isVerified: true,
          language
        }
      });
    } else if (name) {
      // Update name if it's provided and user exists
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name, language }
      });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);
    await updateRefreshToken(user.id, refreshToken);
    setAuthCookies(res, accessToken, refreshToken);

    res.json({ user, accessToken });
  } catch (error) { next(error); }
});

// ─────────────────────────────────────────────────────────────────────────────
// BASE AUTH
// ─────────────────────────────────────────────────────────────────────────────

async function upsertCitizenUserWithKyc(idMasked, kyc, language) {
  let user = await prisma.user.findFirst({ where: { aadhaarMasked: idMasked } });

  const kycData = {
    name:                kyc.name || undefined,
    dateOfBirth:         kyc.dateOfBirth || undefined,
    careOf:              kyc.careOf || undefined,
    residentialAddress:  kyc.residentialAddress || undefined,
    gender:              kyc.gender || undefined,
  };
  // Remove undefined keys so we don't null out existing values
  Object.keys(kycData).forEach((k) => kycData[k] === undefined && delete kycData[k]);

  if (!user) {
    user = await prisma.user.create({
      data: {
        id: uuidv4(),
        internalRef: `reg_${idMasked.replace(/X|-/g, '')}_${Date.now().toString().slice(-4)}`,
        aadhaarMasked: idMasked,
        isVerified: true,
        language,
        ...kycData,
      }
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { language, ...kycData },
    });
  }
  return user;
}

// Keep original for PAN / mobile routes that still use it
async function upsertCitizenUser(idMasked, name, language) {
  return upsertCitizenUserWithKyc(idMasked, { name }, language);
}

async function updateRefreshToken(userId, token) {
  const hash = await bcrypt.hash(token, 8);
  await prisma.user.update({ where: { id: userId }, data: { refreshToken: hash } });
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) throw new AppError('Refresh token required', 401);

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

    if (!user || !user.refreshToken) throw new AppError('Invalid session', 401);

    const isValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isValid) throw new AppError('Session compromised', 401);

    const { accessToken: newAccess, refreshToken: newRefresh } = generateTokens(user.id);
    await updateRefreshToken(user.id, newRefresh);
    setAuthCookies(res, newAccess, newRefresh);

    res.json({ accessToken: newAccess });
  } catch (error) { next(error); }
});

router.post('/logout', async (req, res, next) => {
  const refreshToken = req.cookies.refreshToken;
  if (refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      await prisma.user.update({ where: { id: decoded.userId }, data: { refreshToken: null } });
    } catch (_) { }
  }
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
});

router.post('/anonymous', async (req, res, next) => {
  try {
    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        internalRef: `anon_${uuidv4().slice(0, 8)}`,
        isAnonymous: true,
        isVerified: true
      }
    });
    const { accessToken, refreshToken } = generateTokens(user.id);
    setAuthCookies(res, accessToken, refreshToken);
    res.json({ user, accessToken });
  } catch (error) { next(error); }
});

module.exports = router;
