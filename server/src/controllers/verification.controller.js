import VerificationSession from '../models/VerificationSession.js';
import { normalizeEmail, hmacHash, generateOtp, generateSessionToken } from '../middleware/crypto.utils.js';
import { isValidEmail, isValidOtp } from '../validators/input.validator.js';
import { sendOtpEmail } from '../services/mailer.service.js';

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds
const MAX_ATTEMPTS = 5;
const MAX_RESENDS = 3;

async function deliverOtp(normalizedEmail, otp, sessionId) {
  try {
    await sendOtpEmail(normalizedEmail, otp);
  } catch (err) {
    // Keep generic caller responses on delivery errors to avoid email enumeration.
    console.error(`[MAILER] OTP delivery failed for verification ${sessionId}: ${err.message}`);
  }

  if (process.env.DEV_LOG_OTP === 'true') {
    console.log(`[DEV OTP] Verification ${sessionId} code: ${otp}`);
  }
}

export async function startVerification(req, res) {
  const { email } = req.body;
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'INVALID_EMAIL', message: 'Please enter a valid email address.' });
  }

  const normalized = normalizeEmail(email);
  const emailHash = hmacHash(normalized, process.env.EMAIL_HMAC_SECRET);
  const otp = generateOtp();
  const otpHmac = hmacHash(otp, process.env.OTP_HMAC_SECRET);

  const session = await VerificationSession.create({
    emailHash,
    otpHmac,
    expiresAt: new Date(Date.now() + OTP_TTL_MS)
  });

  await deliverOtp(normalized, otp, session._id);

  return res.status(201).json({
    verificationId: session._id,
    expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
    resendCooldownSeconds: Math.floor(RESEND_COOLDOWN_MS / 1000),
    message: 'If this email can receive messages, a verification code has been sent.'
  });
}

export async function confirmVerification(req, res) {
  const { id } = req.params;
  const { otp, email } = req.body;

  if (!isValidOtp(otp) || !isValidEmail(email)) {
    return res.status(400).json({ error: 'INVALID_INPUT', message: 'Enter the 6-digit code and email.' });
  }

  const session = await VerificationSession.findById(id);
  if (!session || session.expiresAt < new Date()) {
    return res.status(410).json({ error: 'OTP_EXPIRED', message: 'Verification code has expired. Request a new one.' });
  }

  if (session.verified) {
    return res.status(409).json({ error: 'ALREADY_USED', message: 'This code has already been used.' });
  }

  if (session.attempts >= MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'MAX_ATTEMPTS', message: 'Too many incorrect attempts. Start again.' });
  }

  const expectedEmailHash = hmacHash(normalizeEmail(email), process.env.EMAIL_HMAC_SECRET);
  const submittedOtpHmac = hmacHash(otp.trim(), process.env.OTP_HMAC_SECRET);

  if (session.emailHash !== expectedEmailHash || session.otpHmac !== submittedOtpHmac) {
    session.attempts += 1;
    await session.save();
    return res.status(400).json({
      error: 'INVALID_OTP',
      attemptsRemaining: Math.max(0, MAX_ATTEMPTS - session.attempts),
      message: 'Incorrect verification code.'
    });
  }

  const rawSessionToken = generateSessionToken();
  session.verified = true;
  session.sessionTokenHash = hmacHash(rawSessionToken, process.env.OTP_HMAC_SECRET);
  // Extend short-lived session window to 15 minutes for scan execution
  session.expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await session.save();

  return res.status(200).json({
    verificationId: session._id,
    sessionToken: rawSessionToken,
    verified: true
  });
}

export async function resendVerification(req, res) {
  const { id } = req.params;
  const session = await VerificationSession.findById(id);

  if (!session || session.expiresAt < new Date()) {
    return res.status(410).json({ error: 'SESSION_EXPIRED', message: 'Session expired. Please start over.' });
  }

  const elapsed = Date.now() - session.lastSentAt.getTime();
  if (elapsed < RESEND_COOLDOWN_MS) {
    return res.status(429).json({
      error: 'COOLDOWN_ACTIVE',
      retryAfterSeconds: Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000),
      message: 'Please wait before requesting another code.'
    });
  }

  if (session.resendCount >= MAX_RESENDS) {
    return res.status(429).json({ error: 'MAX_RESENDS', message: 'Maximum resend limit reached.' });
  }

  const { email } = req.body || {};
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'INVALID_EMAIL', message: 'Please enter a valid email address.' });
  }

  const normalized = normalizeEmail(email);
  if (hmacHash(normalized, process.env.EMAIL_HMAC_SECRET) !== session.emailHash) {
    return res.status(403).json({ error: 'SESSION_MISMATCH', message: 'Session does not match email.' });
  }

  const newOtp = generateOtp();
  session.otpHmac = hmacHash(newOtp, process.env.OTP_HMAC_SECRET);
  session.resendCount += 1;
  session.attempts = 0;
  session.lastSentAt = new Date();
  await session.save();

  await deliverOtp(normalized, newOtp, session._id);

  return res.status(200).json({
    verificationId: session._id,
    resendCooldownSeconds: Math.floor(RESEND_COOLDOWN_MS / 1000),
    message: 'If this email can receive messages, a new verification code has been sent.'
  });
}