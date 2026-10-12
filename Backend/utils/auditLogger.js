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
      details: details || null,
      ip_address: req?.ip || null,
      user_agent: req?.headers?.["user-agent"]?.slice(0, 512) || null,
    };

    const { error } = await supabase.from("audit_logs").insert(record);
    if (error) {
      const missingTable = ["PGRST205", "42P01"].includes(error.code);
      console.error(
        missingTable
          ? "Audit log was NOT saved: public.audit_logs is unavailable. Apply Backend/migrations/017_repair_audit_and_auth_cleanup.sql to the Supabase project configured by SUPABASE_URL."
          : "Audit log write failed:",
        { code: error.code, message: error.message }
      );
    }
  } catch (err) {
    // Don't let logging failures break the app
    console.error("Audit log write failed:", err.message);
  }
};

/** Log completed, successful mutations; OTP requests are ephemeral activity. */
export const auditMiddleware = (config = {}) => {
  const {
    skipPaths = ["/health", "/api/clinic/info", "/api/auth/request", "/api/auth/verify", "/api/auth/send-otp", "/api/auth/verify-otp"],
    logMethods = ["POST", "PUT", "PATCH", "DELETE"],
  } = config;

  return (req, res, next) => {
    // Capture before Express enters a mounted router and changes req.path.
    const path = (req.originalUrl || req.path).split("?")[0];
    if (!logMethods.includes(req.method) || skipPaths.includes(path)) return next();

    let entityId = null;
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      entityId = body?.data?.id || null;
      return originalJson(body);
    };
    res.once("finish", () => {
      if (res.statusCode < 200 || res.statusCode >= 300) return;
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
      const mapping = actionMap[path] || {
        action: `${req.method.toLowerCase()}_${path.replace(/\//g, "_").substring(1)}`.slice(0, 100),
        entityType: "unknown",
      };
      void logAudit({
        ...mapping,
        entityId,
        clinicId: req.tenant?.id || req.admin?.clinic_id || req.doctor?.clinic_id || null,
        userId: req.patient?.id || req.admin?.id || req.doctor?.id || null,
        userRole: req.patient ? "patient" : req.admin?.is_super_admin ? "super_admin" : req.admin ? "admin" : req.doctor ? "doctor" : null,
        details: { method: req.method, path, statusCode: res.statusCode },
        req,
      });
    });
    next();
  };
};
