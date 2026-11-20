const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email) {
  return typeof email === "string" && email.length <= 254 && EMAIL_REGEX.test(email.trim())
}

export function isValidOtp(otp) {
  return typeof otp === "string" && /^\d{6}$/.test(otp.trim())
}
