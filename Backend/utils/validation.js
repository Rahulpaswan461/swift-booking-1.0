/**
 * Validation utilities for request body and parameters.
 * Lightweight validation without external dependencies.
 */

/**
 * Validates an email address format
 */
export const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * Validates a phone number (Indian format for now, extendable)
 */
export const isValidPhone = (phone) => {
  const regex = /^[+]?[6-9][0-9]{9}$/;
  return regex.test(phone.replace(/[\s-]/g, ""));
};

/**
 * Validates a slug: lowercase, alphanumeric, hyphens only
 */
export const isValidSlug = (slug) => {
  const regex = /^[a-z0-9][a-z0-9-]{2,49}$/;
  return regex.test(slug);
};

/**
 * Validates a date string (YYYY-MM-DD format)
 */
export const isValidDate = (dateStr) => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
};

/**
 * Validates a time string (HH:MM format)
 */
export const isValidTime = (timeStr) => {
  const regex = /^([01]\d|2[0-3]):[0-5]\d$/;
  return regex.test(timeStr);
};

/**
 * Validates a password: at least 8 characters, one uppercase, one lowercase, one number
 */
export const isValidPassword = (password) => {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
};

/**
 * Sanitizes a string to prevent XSS
 */
export const sanitizeString = (str) => {
  if (typeof str !== "string") return str;
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
};

/**
 * Validates required fields in a request body
 * Returns an array of missing field names, or empty if all present
 */
export const validateRequiredFields = (body, fields) => {
  const missing = fields.filter((field) => {
    const value = body[field];
    return value === undefined || value === null || value === "";
  });
  return missing;
};

/**
 * Validates that a value is a valid UUID format
 */
export const isValidUUID = (uuid) => {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
};

/**
 * Validates a URL
 */
export const isValidURL = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Clinic registration validation
 */
export const validateClinicRegistration = (body) => {
  const errors = [];

  if (!body.name || body.name.trim().length < 2) {
    errors.push("Clinic name must be at least 2 characters");
  }

  if (!body.slug || !isValidSlug(body.slug)) {
    errors.push(
      "Slug must be 3-50 characters, lowercase letters, numbers, and hyphens only"
    );
  }

  if (!body.ownerEmail || !isValidEmail(body.ownerEmail)) {
    errors.push("Valid owner email is required");
  }

  if (!body.password || body.password.length < 8) {
    errors.push("Password must be at least 8 characters");
  }

  if (body.address && body.address.length > 500) {
    errors.push("Address must be 500 characters or less");
  }

  return errors;
};

/**
 * Doctor creation validation
 */
export const validateDoctorCreation = (body) => {
  const errors = [];

  if (!body.full_name || body.full_name.trim().length < 2) {
    errors.push("Doctor name must be at least 2 characters");
  }

  if (!body.email || !isValidEmail(body.email)) {
    errors.push("Valid email is required");
  }

  if (!body.specialization || body.specialization.trim().length < 2) {
    errors.push("Specialization is required");
  }

  if (body.consultation_fee && (isNaN(body.consultation_fee) || body.consultation_fee < 0)) {
    errors.push("Consultation fee must be a positive number");
  }

  if (body.experience && (isNaN(body.experience) || body.experience < 0)) {
    errors.push("Experience must be a positive number");
  }

  return errors;
};

/**
 * Appointment booking validation
 */
export const validateAppointmentBooking = (body) => {
  const errors = [];

  if (!body.patient_id || !isValidUUID(body.patient_id)) {
    errors.push("Valid patient ID is required");
  }

  if (!body.doctor_id || !isValidUUID(body.doctor_id)) {
    errors.push("Valid doctor ID is required");
  }

  if (!body.appointment_date || !isValidDate(body.appointment_date)) {
    errors.push("Valid appointment date (YYYY-MM-DD) is required");
  }

  if (!body.appointment_time || !isValidTime(body.appointment_time)) {
    errors.push("Valid appointment time (HH:MM) is required");
  }

  // Check that the appointment date is not in the past
  if (body.appointment_date) {
    const apptDate = new Date(body.appointment_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (apptDate < today) {
      errors.push("Appointment date cannot be in the past");
    }
  }

  return errors;
};

/**
 * OTP request validation
 */
export const validateOtpRequest = (body) => {
  const errors = [];

  if (!body.email && !body.phone) {
    errors.push("Email or phone number is required");
  }

  if (body.email && !isValidEmail(body.email)) {
    errors.push("Invalid email format");
  }

  if (body.phone && !isValidPhone(body.phone)) {
    errors.push("Invalid phone number format");
  }

  return errors;
};
