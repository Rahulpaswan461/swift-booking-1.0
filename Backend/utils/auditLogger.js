import supabase from "../config/supabase.js";

/**
 * Audit Logger — records significant actions in the audit_logs table.
 * Non-blocking: errors in logging don't affect the main flow.
 *
 * @param {Object} options
 * @param {string} options.action - The action performed (e.g., 'clinic_created', 'doctor_added')
 * @param {string} options.entityType - The type of entity affected (e.g., 'clinic', 'doctor', 'appointment')
 * @param {string} [options.entityId] - The ID of the affected entity
 * @param {string} [options.clinicId] - The clinic (tenant) ID
 * @param {string} [options.userId] - The user who performed the action
 * @param {string} [options.userRole] - The role of the user ('super_admin', 'admin', 'doctor', 'patient')
 * @param {Object} [options.details] - Additional details as JSON
 * @param {Object} [options.req] - Express request object (for IP, user-agent)
 */
export const logAudit = async ({
  action,
  entityType,
  entityId,
  clinicId,
  userId,
  userRole,
  details,
  req,
} = {}) => {
  if (!action || !entityType) {
    return; // action and entityType are required
  }

  try {
    const record = {
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      clinic_id: clinicId || null,
      user_id: userId || null,
      user_role: userRole || null,
      details: details ? JSON.stringify(details) : null,
      ip_address: req?.ip || null,
      user_agent: req?.headers["user-agent"] || null,
    };

    await supabase.from("audit_logs").insert(record);
  } catch (err) {
    // Don't let logging failures break the app
    console.error("Audit log write failed:", err.message);
  }
};

/**
 * Express middleware that automatically logs requests to sensitive endpoints.
 * Only logs successful (2xx) and client error (4xx) responses.
 */
export const auditMiddleware = (config = {}) => {
  const {
    skipPaths = ["/health", "/clinic/info"],
    logMethods = ["POST", "PUT", "PATCH", "DELETE"],
  } = config;

  return async (req, res, next) => {
    // Skip GET requests and configured paths
    if (!logMethods.includes(req.method) || skipPaths.includes(req.path)) {
      return next();
    }

    // Capture the original JSON response method
    const originalJson = res.json.bind(res);

    // Override json to intercept the response
    res.json = (body) => {
      const isOk = res.statusCode >= 200 && res.statusCode < 400;

      // Map endpoint to action/entity
      const actionMap = {
        "/api/admin/clinics": { action: "clinic_registered", entityType: "clinic" },
        "/api/admin/doctors": { action: "doctor_created", entityType: "doctor" },
        "/api/admin/doctors/toggle": { action: "doctor_toggled", entityType: "doctor" },
        "/api/appointments/book": { action: "appointment_booked", entityType: "appointment" },
        "/api/appointments/cancel": { action: "appointment_cancelled", entityType: "appointment" },
        "/api/appointments/reschedule": { action: "appointment_rescheduled", entityType: "appointment" },
        "/api/doctor/change-password": { action: "password_changed", entityType: "doctor" },
        "/api/admin/branding": { action: "branding_updated", entityType: "clinic" },
      };

      const mapping = actionMap[req.path] || {
        action: `${req.method.toLowerCase()}_${req.path.replace(/\//g, "_").substring(1)}`,
        entityType: "unknown",
      };

      const clinicId =
        req.tenant?.id ||
        req.admin?.clinic_id ||
        req.doctor?.clinic_id ||
        (body?.data?.clinic_id ? null : null);

      logAudit({
        action: mapping.action,
        entityType: mapping.entityType,
        entityId: body?.data?.id || null,
        clinicId: clinicId,
        userId: req.patient?.id || req.admin?.id || req.doctor?.id || null,
        userRole: req.patient ? "patient" : req.admin?.is_super_admin ? "super_admin" : req.admin ? "admin" : req.doctor ? "doctor" : null,
        details: {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          success: body?.success,
        },
        req,
      });

      return originalJson(body);
    };

    next();
  };
};
