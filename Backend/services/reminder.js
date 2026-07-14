import supabase from "../config/supabase.js";
import { sendReminderEmail } from "./emailService.js";

/**
 * Send daily appointment reminders for tomorrow's appointments.
 * Designed to be called by a cron job (e.g., via GitHub Actions, Supabase Edge Function,
 * or an external scheduler like Cron-job.org).
 *
 * Previously used node-cron and MongoDB — now uses Supabase (PostgreSQL).
 */
export const sendDailyReminders = async () => {
  console.log("[Reminder] Starting daily reminder job...");

  try {
    // Get tomorrow's date (local time — not UTC)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

    const REMINDER_SELECT = `
        id,
        patient_id,
        doctor_id,
        clinic_id,
        appointment_date,
        appointment_time,
        status,
        cancel_token,
        patients!inner(id, name, email, phone),
        doctors!inner(id, full_name, specialization),
        clinics!inner(id, name, slug, branding)`;

    // Confirmed appointments for tomorrow that haven't been reminded yet.
    // reminder_sent needs migration 009 — fall back to no dedupe filter
    // if the column doesn't exist.
    let { data: appointments, error } = await supabase
      .from("appointments")
      .select(REMINDER_SELECT)
      .eq("appointment_date", tomorrowStr)
      .eq("status", "confirmed")
      .or("reminder_sent.is.null,reminder_sent.eq.false");

    if (error && /reminder_sent/i.test(error.message || "")) {
      console.warn("[Reminder] reminder_sent column missing — run migration 009 (no dedupe until then)");
      ({ data: appointments, error } = await supabase
        .from("appointments")
        .select(REMINDER_SELECT)
        .eq("appointment_date", tomorrowStr)
        .eq("status", "confirmed"));
    }

    if (error) {
      console.error("[Reminder] Error fetching appointments:", error.message);
      return { success: false, error: error.message };
    }

    if (!appointments || appointments.length === 0) {
      console.log("[Reminder] No appointments found for tomorrow");
      return { success: true, count: 0 };
    }

    console.log(`[Reminder] Found ${appointments.length} appointments for tomorrow`);

    let sent = 0;
    let failed = 0;

    // Send reminder to each patient
    for (const appt of appointments) {
      try {
        const patient = appt.patients;
        const doctor = appt.doctors;

        if (!patient?.email) {
          console.log(`[Reminder] Skipping appointment ${appt.id}: no patient email`);
          continue;
        }

        await sendReminderEmail({
          patient,
          doctor,
          appointment: {
            id: appt.id,
            appointment_date: appt.appointment_date,
            appointment_time: appt.appointment_time,
            cancel_token: appt.cancel_token,
          },
          clinic: appt.clinics,
        });

        sent++;
        console.log(`[Reminder] Sent reminder to ${patient.email}`);

        // Mark as reminded (no-op if migration 009 not applied)
        await supabase
          .from("appointments")
          .update({ reminder_sent: true })
          .eq("id", appt.id)
          .then((r) => r, () => {});
      } catch (err) {
        failed++;
        console.error(
          `[Reminder] Failed to send reminder for appointment ${appt.id}:`,
          err.message
        );
      }
    }

    console.log(
      `[Reminder] Job complete — sent: ${sent}, failed: ${failed}, total: ${appointments.length}`
    );

    return {
      success: true,
      count: appointments.length,
      sent,
      failed,
    };
  } catch (err) {
    console.error("[Reminder] Job failed:", err.message);
    return { success: false, error: err.message };
  }
};

/**
 * In-process daily scheduler — runs sendDailyReminders every day at
 * REMINDER_HOUR (server local time, default 08:00). No dependency needed.
 * Disable with ENABLE_REMINDERS=false (e.g. when an external scheduler
 * calls POST /api/admin/reminders/run instead).
 */
export const startReminderJob = () => {
  if (process.env.ENABLE_REMINDERS === "false") {
    console.log("[Reminder] In-process scheduler disabled (ENABLE_REMINDERS=false)");
    return;
  }

  const hour = Number(process.env.REMINDER_HOUR || 8);

  const scheduleNext = () => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(hour, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    const delay = next - now;
    console.log(`[Reminder] Next run scheduled for ${next.toLocaleString()}`);
    setTimeout(async () => {
      await sendDailyReminders().catch((e) => console.error("[Reminder] run failed:", e.message));
      scheduleNext();
    }, delay);
  };

  scheduleNext();
};

/**
 * Express handler for manual reminder trigger.
 * Useful for testing or for an external scheduler to call.
 */
export const reminderHandler = async (req, res) => {
  // Only allow super admins or authenticated admin requests
  if (!req.admin || !req.admin.is_super_admin) {
    // For now, allow any admin to trigger (can be locked down later)
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }
  }

  const result = await sendDailyReminders();

  if (!result.success) {
    return res.status(500).json(result);
  }

  return res.json({
    success: true,
    message: `Reminders sent for tomorrow's appointments`,
    ...result,
  });
};
