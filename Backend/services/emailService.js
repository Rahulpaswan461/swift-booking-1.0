import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  }
})

export const sendBookingConfirmationEmail = async ({ appointment, patient, doctor }) => {
  console.log("send booking confiration email", process.env.FRONTEND_URL)

  const { _id, appointment_date, appointment_time } = appointment

  const [h, m] = appointment_time.split(':').map(Number)
  const suffix = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
  // Step 2: Define the email
  const html = `
    <div style="font-family: sans-serif; max-width: 520px; margin: auto;">
      <h2 style="color: #1a73e8;">Appointment Confirmed ✓</h2>
      <p>Hi <strong>${patient.fullName}</strong>,</p>
      <p>Your appointment has been successfully booked. Here are your details:</p>
      <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px; color: #555;">Doctor</td>
            <td style="padding: 8px;"><strong>Dr. ${doctor.fullName}</strong></td></tr>
        <tr style="background:#f5f5f5"><td style="padding: 8px; color: #555;">Specialization</td>
            <td style="padding: 8px;">${doctor.specialization}</td></tr>
        <tr><td style="padding: 8px; color: #555;">Date</td>
            <td style="padding: 8px;">${appointment_date}</td></tr>
        <tr style="background:#f5f5f5"><td style="padding: 8px; color: #555;">Time</td>
            <td style="padding: 8px;">${suffix}</td></tr>
      </table>
      <div style="background:#fff3cd; border:1px solid #ffc107; padding:12px; border-radius:8px; margin:16px 0;">
        <p style="margin:0; color:#856404; font-size:13px;">
          📌 Please arrive 10 minutes early. If you need to cancel, use the link below.
        </p>
      </div>

      <a href="${process.env.FRONTEND_URL}/cancel/${appointment._id}/${appointment.cancel_token}"
        style="display:inline-block; margin-top:8px; padding:10px 20px; background:#dc2626; color:white;
               border-radius:8px; text-decoration:none; font-size:13px; font-weight:500;">
        Cancel appointment
      </a>

    </div>
  `;

  try {
    const res = await transporter.sendMail({
      from: `Booking Appointment <${process.env.EMAIL_USER}>`,
      to: patient.email,
      subject: `Appointment confirmed — Dr. ${doctor?.fullName} on ${appointment_date}`,
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
      <p>Hi <strong>Dr. ${doctor.fullName}</strong>,</p>
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
      <p>Hi <strong>${patient.fullName}</strong>,</p>
      <p>This is a reminder that you have an appointment <strong>tomorrow</strong>.</p>

      <table style="width:100%; border-collapse:collapse; margin: 16px 0;">
        <tr>
          <td style="padding:10px; background:#f5f5f5; color:#555;">Doctor</td>
          <td style="padding:10px;"><strong>Dr. ${doctor.fullName}</strong></td>
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

      <a href="${process.env.FRONTEND_URL}/cancel/${appointment._id}/${appointment.cancel_token}"
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
    subject: `Reminder: Appointment tomorrow with Dr. ${doctor.fullName} at ${appointment.appointment_time}`,
    html,
  })
}