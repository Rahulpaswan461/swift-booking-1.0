import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  }
})

export const sendBookingConfirmationEmail = async ({ appointment, patient, doctor }) => {
  console.log("send booking confirmation email", process.env.FRONTEND_URL)

  const { id, appointment_date, appointment_time } = appointment

  const [h, m] = appointment_time.split(':').map(Number)
  const suffix = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color:#f7f7f7;">
      
      <div style="background-color:#ffffff; max-width:600px; margin:20px auto; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.1); overflow:hidden;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding:40px 30px; text-align:center;">
          <h1 style="margin:0; color:#ffffff; font-size:28px; font-weight:700;">✓ Appointment Confirmed</h1>
          <p style="margin:8px 0 0 0; color:#e8e8f0; font-size:14px;">Your booking is complete</p>
        </div>

        <!-- Content -->
        <div style="padding:40px 30px;">
          
          <!-- Greeting -->
          <p style="margin:0 0 24px 0; color:#333333; font-size:16px; line-height:1.6;">
            Hi <strong>${patient.full_name || patient.fullName}</strong>,
          </p>
          
          <p style="margin:0 0 32px 0; color:#666666; font-size:15px; line-height:1.6;">
            Thank you for booking your appointment with us! Your appointment has been successfully confirmed. Please find all the details below.
          </p>

          <!-- Appointment Details Card -->
          <div style="background-color:#f8f9fa; border-left:4px solid #667eea; padding:24px; border-radius:6px; margin-bottom:32px;">
            
            <h2 style="margin:0 0 20px 0; color:#333333; font-size:16px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">Appointment Details</h2>
            
            <table style="width:100%; border-collapse:collapse;">
              <tr>
                <td style="padding:12px 0; border-bottom:1px solid #e0e0e0;">
                  <span style="color:#666666; font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Doctor</span>
                </td>
                <td style="padding:12px 0; border-bottom:1px solid #e0e0e0; text-align:right;">
                  <span style="color:#333333; font-size:15px; font-weight:600;">Dr. ${doctor.full_name || doctor.fullName}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0; border-bottom:1px solid #e0e0e0;">
                  <span style="color:#666666; font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Specialization</span>
                </td>
                <td style="padding:12px 0; border-bottom:1px solid #e0e0e0; text-align:right;">
                  <span style="color:#333333; font-size:15px;">${doctor.specialization}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0; border-bottom:1px solid #e0e0e0;">
                  <span style="color:#666666; font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">📅 Date</span>
                </td>
                <td style="padding:12px 0; border-bottom:1px solid #e0e0e0; text-align:right;">
                  <span style="color:#667eea; font-size:15px; font-weight:700;">${appointment_date}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0;">
                  <span style="color:#666666; font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">🕐 Time</span>
                </td>
                <td style="padding:12px 0; text-align:right;">
                  <span style="color:#667eea; font-size:15px; font-weight:700;">${suffix}</span>
                </td>
              </tr>
            </table>

          </div>

          <!-- Important Info -->
          <div style="background-color:#fef3e0; border-left:4px solid #ff9800; padding:16px; border-radius:6px; margin-bottom:32px;">
            <p style="margin:0; color:#e65100; font-size:14px; line-height:1.6;">
              <strong>📌 Important:</strong> Please arrive <strong>10 minutes early</strong> to complete check-in. If you have any questions or need to reschedule, use the buttons below.
            </p>
          </div>

          <!-- Action Buttons -->
          <div style="margin-bottom:32px;">
            <table style="width:100%; margin:0; border-collapse:collapse;">
              <tr>
                <td style="width:48%; padding-right:4%; padding-bottom:0;">
                  <a href="${process.env.FRONTEND_URL}/reschedule/${id}/${appointment.cancel_token}" style="display:block; text-align:center; padding:14px 20px; background-color:#667eea; color:white; text-decoration:none; border-radius:6px; font-size:14px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; border:2px solid #667eea; transition:all 0.3s;">
                    🔄 Reschedule
                  </a>
                </td>
                <td style="width:48%; padding-left:4%;">
                  <a href="${process.env.FRONTEND_URL}/cancel/${id}/${appointment.cancel_token}" style="display:block; text-align:center; padding:14px 20px; background-color:#ffffff; color:#dc2626; text-decoration:none; border-radius:6px; font-size:14px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; border:2px solid #dc2626; transition:all 0.3s;">
                    ✕ Cancel
                  </a>
                </td>
              </tr>
            </table>
          </div>

          <!-- Tips Section -->
          <div style="background-color:#e3f2fd; padding:20px; border-radius:6px; margin-bottom:32px;">
            <h3 style="margin:0 0 12px 0; color:#1976d2; font-size:14px; font-weight:700;">💡 Helpful Tips:</h3>
            <ul style="margin:0; padding-left:20px; color:#333333; font-size:13px; line-height:1.8;">
              <li>Bring your insurance card if applicable</li>
              <li>Arrive on time for your appointment</li>
              <li>Prepare a list of current medications</li>
              <li>Bring any recent medical reports</li>
            </ul>
          </div>

        </div>

        <!-- Footer -->
        <div style="background-color:#f8f9fa; padding:30px; text-align:center; border-top:1px solid #e0e0e0;">
          <p style="margin:0 0 12px 0; color:#666666; font-size:13px;">
            Questions or need help?
          </p>
          <p style="margin:0; color:#999999; font-size:12px; line-height:1.6;">
            MediBook Clinic | 📧 support@medibook.com | 📞 1-800-MED-BOOK<br>
            This is an automated message, please do not reply to this email.
          </p>
        </div>

      </div>

    </body>
    </html>
  `;

  try {
    const res = await transporter.sendMail({
      from: `MediBook Clinic <${process.env.EMAIL_USER}>`,
      to: patient.email,
      subject: `✓ Appointment Confirmed with Dr. ${doctor?.full_name || doctor?.fullName}`,
      html,
    });
    if (!res) {
      return false;
    }
    return true;
  } catch (err) {
    // Don't crash the booking if email fails — just log it
    console.error('Email send failed:', err.message);
  }
}

// export const sendSMS = async (fullName, email, age, address, phoneNumber, slot) =>{
//   return true;
// }

//Send OTP to the user via Email

export const sendOtpEmail = async ({ email, otp }) => {
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
      <h2 style="color: #1a73e8;">Your verification code</h2>
      <p>Use the code below to verify your email. It expires in <strong>10 minutes</strong>.</p>
      <div style="
        font-size: 36px;
        font-weight: bold;
        letter-spacing: 8px;
        text-align: center;
        padding: 24px;
        background: #f5f5f5;
        border-radius: 8px;
        margin: 24px 0;
      ">${otp}</div>
      <p style="color: #888; font-size: 13px;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Clinic" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your OTP verification code',
    html,
  });
}

export const sendWelcomeEmail = async ({ doctor, tempPassword }) => {
  const html = `
    <div style="font-family: sans-serif; max-width: 520px; margin: auto;">
      <h2 style="color: #0171be;">Welcome to MediBook 👋</h2>
      <p>Hi <strong>Dr. ${doctor.full_name || doctor.fullName}</strong>,</p>
      <p>Your account has been created. Use the credentials below to log in:</p>

      <table style="width:100%; border-collapse:collapse; margin: 16px 0;">
        <tr>
          <td style="padding:10px; background:#f5f5f5; color:#555;">Login URL</td>
          <td style="padding:10px;"><a href="${process.env.DOCTOR_LOGIN_URL}">${process.env.DOCTOR_LOGIN_URL}</a></td>
        </tr>
        <tr>
          <td style="padding:10px; color:#555;">Email</td>
          <td style="padding:10px;">${doctor.email}</td>
        </tr>
        <tr>
          <td style="padding:10px; background:#f5f5f5; color:#555;">Temporary Password</td>
          <td style="padding:10px; font-weight:bold; letter-spacing:2px;">${tempPassword}</td>
        </tr>
      </table>

      <div style="background:#fff3cd; border:1px solid #ffc107; padding:12px; border-radius:8px; margin:16px 0;">
        <p style="margin:0; color:#856404; font-size:13px;">
          ⚠️ You will be asked to change this password on your first login.
        </p>
      </div>

      <p style="color:#888; font-size:12px;">
        If you didn't expect this email, please contact your clinic administrator.
      </p>
    </div>
  `

  await transporter.sendMail({
    from: `"MediBook Clinic" <${process.env.EMAIL_USER}>`,
    to: doctor.email,
    subject: 'Your MediBook doctor account credentials',
    html,
  })

  return true;
};

export const sendReminderEmail = async ({ patient, doctor, appointment }) => {
  const html = `
    <div style="font-family: sans-serif; max-width: 520px; margin: auto;">
      <h2 style="color: #0171be;">Appointment reminder 🔔</h2>
      <p>Hi <strong>${patient.full_name || patient.fullName}</strong>,</p>
      <p>This is a reminder that you have an appointment <strong>tomorrow</strong>.</p>

      <table style="width:100%; border-collapse:collapse; margin: 16px 0;">
        <tr>
          <td style="padding:10px; background:#f5f5f5; color:#555;">Doctor</td>
          <td style="padding:10px;"><strong>Dr. ${doctor.full_name || doctor.fullName}</strong></td>
        </tr>
        <tr>
          <td style="padding:10px; color:#555;">Specialization</td>
          <td style="padding:10px;">${doctor.specialization}</td>
        </tr>
        <tr>
          <td style="padding:10px; background:#f5f5f5; color:#555;">Date</td>
          <td style="padding:10px;">${appointment.appointment_date}</td>
        </tr>
        <tr>
          <td style="padding:10px; color:#555;">Time</td>
          <td style="padding:10px;"><strong>${appointment.appointment_time}</strong></td>
        </tr>
      </table>

      <div style="background:#fff3cd; border:1px solid #ffc107; padding:12px; border-radius:8px; margin:16px 0;">
        <p style="margin:0; color:#856404; font-size:13px;">
          📌 Please arrive 10 minutes early. If you need to cancel, use the link below.
        </p>
      </div>

      <a href="${process.env.FRONTEND_URL}/cancel/${appointment.id || appointment._id}/${appointment.cancel_token}"
        style="display:inline-block; margin-top:8px; padding:10px 20px; background:#dc2626; color:white;
               border-radius:8px; text-decoration:none; font-size:13px; font-weight:500;">
        Cancel appointment
      </a>

      <p style="color:#888; font-size:12px; margin-top:16px;">
        If you did not book this appointment, please ignore this email.
      </p>
    </div>
  `

  await transporter.sendMail({
    from: `"MediBook Clinic" <${process.env.FROM_EMAIL}>`,
    to: patient.email,
    subject: `Reminder: Appointment tomorrow with Dr. ${doctor.full_name || doctor.fullName} at ${appointment.appointment_time}`,
    html,
  })
}
export const sendRescheduleConfirmationEmail = async ({ appointment, oldTime, patient, doctor }) => {
  const { id, appointment_date, appointment_time } = appointment

  const [h, m] = appointment_time.split(':').map(Number)
  const suffix = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`

  const [oh, om] = oldTime.split(':').map(Number)
  const oldSuffix = `${oh % 12 || 12}:${String(om).padStart(2, '0')} ${oh >= 12 ? 'PM' : 'AM'}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color:#f7f7f7;">
      
      <div style="background-color:#ffffff; max-width:600px; margin:20px auto; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.1); overflow:hidden;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding:40px 30px; text-align:center;">
          <h1 style="margin:0; color:#ffffff; font-size:28px; font-weight:700;">✓ Appointment Rescheduled</h1>
          <p style="margin:8px 0 0 0; color:#d1fae5; font-size:14px;">Your new appointment is confirmed</p>
        </div>

        <!-- Content -->
        <div style="padding:40px 30px;">
          
          <!-- Greeting -->
          <p style="margin:0 0 24px 0; color:#333333; font-size:16px; line-height:1.6;">
            Hi <strong>${patient.full_name || patient.fullName}</strong>,
          </p>
          
          <p style="margin:0 0 32px 0; color:#666666; font-size:15px; line-height:1.6;">
            Your appointment has been successfully rescheduled! Your previous time slot has been freed up for other patients. Find your new appointment details below.
          </p>

          <!-- Old Appointment (Cancelled) -->
          <div style="background-color:#fee2e2; border-left:4px solid #dc2626; padding:16px; border-radius:6px; margin-bottom:24px;">
            <h3 style="margin:0 0 12px 0; color:#7f1d1d; font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">❌ Previous Appointment</h3>
            <p style="margin:0; color:#991b1b; font-size:14px;">
              <span style="text-decoration:line-through;">${oldSuffix}</span> - No longer active
            </p>
          </div>

          <!-- New Appointment Card -->
          <div style="background-color:#f0fdf4; border-left:4px solid #10b981; padding:24px; border-radius:6px; margin-bottom:32px;">
            
            <h2 style="margin:0 0 20px 0; color:#047857; font-size:16px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">✓ New Appointment Details</h2>
            
            <table style="width:100%; border-collapse:collapse;">
              <tr>
                <td style="padding:12px 0; border-bottom:1px solid #c6f6d5;">
                  <span style="color:#16a34a; font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Doctor</span>
                </td>
                <td style="padding:12px 0; border-bottom:1px solid #c6f6d5; text-align:right;">
                  <span style="color:#047857; font-size:15px; font-weight:600;">Dr. ${doctor.full_name || doctor.fullName}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0; border-bottom:1px solid #c6f6d5;">
                  <span style="color:#16a34a; font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Specialization</span>
                </td>
                <td style="padding:12px 0; border-bottom:1px solid #c6f6d5; text-align:right;">
                  <span style="color:#333333; font-size:15px;">${doctor.specialization}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0; border-bottom:1px solid #c6f6d5;">
                  <span style="color:#16a34a; font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">📅 New Date</span>
                </td>
                <td style="padding:12px 0; border-bottom:1px solid #c6f6d5; text-align:right;">
                  <span style="color:#10b981; font-size:15px; font-weight:700;">${appointment_date}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0;">
                  <span style="color:#16a34a; font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">🕐 New Time</span>
                </td>
                <td style="padding:12px 0; text-align:right;">
                  <span style="color:#10b981; font-size:15px; font-weight:700;">${suffix}</span>
                </td>
              </tr>
            </table>

          </div>

          <!-- Important Info -->
          <div style="background-color:#fef3e0; border-left:4px solid #ff9800; padding:16px; border-radius:6px; margin-bottom:32px;">
            <p style="margin:0; color:#e65100; font-size:14px; line-height:1.6;">
              <strong>📌 Important:</strong> Please arrive <strong>10 minutes early</strong> to check in. Your updated appointment is now confirmed.
            </p>
          </div>

          <!-- Action Buttons -->
          <div style="margin-bottom:32px;">
            <table style="width:100%; margin:0; border-collapse:collapse;">
              <tr>
                <td style="width:48%; padding-right:4%; padding-bottom:0;">
                  <a href="${process.env.FRONTEND_URL}/reschedule/${id}/${appointment.cancel_token}" style="display:block; text-align:center; padding:14px 20px; background-color:#10b981; color:white; text-decoration:none; border-radius:6px; font-size:14px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; border:2px solid #10b981; transition:all 0.3s;">
                    🔄 Reschedule Again
                  </a>
                </td>
                <td style="width:48%; padding-left:4%;">
                  <a href="${process.env.FRONTEND_URL}/cancel/${id}/${appointment.cancel_token}" style="display:block; text-align:center; padding:14px 20px; background-color:#ffffff; color:#dc2626; text-decoration:none; border-radius:6px; font-size:14px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; border:2px solid #dc2626; transition:all 0.3s;">
                    ✕ Cancel
                  </a>
                </td>
              </tr>
            </table>
          </div>

        </div>

        <!-- Footer -->
        <div style="background-color:#f8f9fa; padding:30px; text-align:center; border-top:1px solid #e0e0e0;">
          <p style="margin:0 0 12px 0; color:#666666; font-size:13px;">
            Need any assistance?
          </p>
          <p style="margin:0; color:#999999; font-size:12px; line-height:1.6;">
            MediBook Clinic | 📧 support@medibook.com | 📞 1-800-MED-BOOK<br>
            This is an automated message, please do not reply to this email.
          </p>
        </div>

      </div>

    </body>
    </html>
  `;

  try {
    const res = await transporter.sendMail({
      from: `MediBook Clinic <${process.env.EMAIL_USER}>`,
      to: patient.email,
      subject: `✓ Appointment Rescheduled — Dr. ${doctor?.full_name || doctor?.fullName}`,
      html,
    });
    return !!res;
  } catch (err) {
    console.error('Email send failed:', err.message);
  }
}
