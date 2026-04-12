import crypto from "crypto"

// Generates a secure 6-digit OTP
export const generateOtp = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// 10 minutes from now
export const getOtpExpiry = () => {
  return new Date(Date.now() + 10 * 60 * 1000);
};


// Generates a readable temp password e.g. "Clinic@4823"
export const generateTempPassword = () => {
  const random = Math.floor(1000 + Math.random() * 9000)
  return `Clinic@${random}`
}