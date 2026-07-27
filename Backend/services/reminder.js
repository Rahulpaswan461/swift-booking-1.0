import supabase from "../config/supabase.js";
import { sendReminderEmail } from "./emailService.js";
import { sendReminderSms } from "./smsService.js";
import createLogger from "../utils/logger.js";

const log = createLogger("reminder");

// "Tomorrow" as YYYY-MM-DD in the clinics' timezone, independent of the
// server's own timezone (production servers usually run in UTC). Defaults to
// India — the product's market. Appointment dates are clinic-local dates, so
// this must be computed in the clinic timezone or reminders land on the wrong
// day near midnight.
function tomorrowInTimezone(tz) {
  const t = new Date(Date.now() + 24 * 60 * 60 * 1000);
  // en-CA formats as YYYY-MM-DD, which matches how dates are stored.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(t);
}

/**
 * Send daily appointment reminders for tomorrow's appointments.
 * Designed to be called by a cron job (e.g., via GitHub Actions, Supabase Edge Function,
 * or an external scheduler like Cron-job.org).
 *
 * Previously used node-cron and MongoDB — now uses Supabase (PostgreSQL).
 */
export const sendDailyReminders = async () => {
  const tz = process.env.REMINDER_TZ || "Asia/Kolkata";
  const tomorrowStr = tomorrowInTimezone(tz);
  log.info("Daily reminder job started", { tz, targetDate: tomorrowStr });

  try {
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
      log.warn("reminder_sent column missing — run migration 009 (no dedupe until then)");
      ({ data: appointments, error } = await supabase
        .from("appointments")
        .select(REMINDER_SELECT)
        .eq("appointment_date", tomorrowStr)
        .eq("status", "confirmed"));
    }

    if (error) {
      log.error("Error fetching appointments", { error: error.message });
      return { success: false, error: error.message };
    }

    if (!appointments || appointments.length === 0) {
      log.info("No appointments to remind for tomorrow", { targetDate: tomorrowStr });
      return { success: true, count: 0 };
    }

    log.info(`Found ${appointments.length} appointment(s) for tomorrow`, { targetDate: tomorrowStr });

    let sent = 0;
    let failed = 0;

    for (const appt of appointments) {
      const patient = appt.patients;
      const doctor = appt.doctors;

      // Reach the patient on whatever channel(s) they gave — a phone-only
      // patient (no email) must still be reminded via SMS.
      if (!patient?.email && !patient?.phone) {
        log.warn("Reminder skipped — patient has no email or phone", { appointmentId: appt.id });
        continue;
      }

      const appointment = {
        id: appt.id,
        appointment_date: appt.appointment_date,
        appointment_time: appt.appointment_time,
        cancel_token: appt.cancel_token,
        patient_phone: patient.phone,
      };

      let delivered = false;

      if (patient.email) {
        try {
          await sendReminderEmail({ patient, doctor, appointment, clinic: appt.clinics });
          delivered = true;
        } catch (err) {
          log.error("Reminder email failed", { appointmentId: appt.id, error: err.message });
        }
      }

      if (patient.phone) {
        try {
          const r = await sendReminderSms({ appointment, doctor, clinic: appt.clinics });
          if (r?.delivered) delivered = true;
        } catch (err) {
          log.error("Reminder SMS failed", { appointmentId: appt.id, error: err.message });
        }
      }

      if (delivered) {
        sent++;
        // Mark as reminded so a re-run won't double-send (no-op if migration 009 not applied)
        await supabase
          .from("appointments")
          .update({ reminder_sent: true })
          .eq("id", appt.id)
          .then((r) => r, () => {});
      } else {
        failed++;
      }
    }

    log.info("Daily reminder job complete", { sent, failed, total: appointments.length });

    return { success: true, count: appointments.length, sent, failed };
  } catch (err) {
    log.error("Reminder job failed", { error: err.message });
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
    log.info("In-process scheduler disabled (ENABLE_REMINDERS=false)");
    return;
  }

  const hour = Number(process.env.REMINDER_HOUR || 8);

  const scheduleNext = () => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(hour, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    const delay = next - now;
    log.info("Next reminder run scheduled", { at: next.toLocaleString(), hour });
    setTimeout(async () => {
      await sendDailyReminders().catch((e) => log.error("Scheduled run failed", { error: e.message }));
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
