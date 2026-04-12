import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  }
})

export const sendBookingConfirmationEmail = async ({ appointment, patient, doctor }) => {

  const { _id, appointment_date, appointment_time } = appointment
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
            <td style="padding: 8px;">${appointment_time}</td></tr>
      </table>
      <p style="color: #888; font-size: 13px;">Appointment ID: ${_id}</p>
      <p>Please arrive 10 minutes early. If you need to cancel, contact us as soon as possible.</p>
    </div>
  `;

  try {
    const res = await transporter.sendMail({
      from: `Booking Appointment <${process.env.EMAIL_USER}>`,
      to: patient.email,
      subject: `Appointment confirmed — Dr. ${doctor?.fullName} on ${appointment_date}`,
      html,
    });
    if(!res){
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
    from:    `"MediBook Clinic" <${process.env.EMAIL_USER}>`,
    to:      doctor.email,
    subject: 'Your MediBook doctor account credentials',
    html,
  })

  return true;
};