import { requestReset, confirmReset } from "../services/passwordReset.js"

/**
 * HTTP handlers for staff password reset.
 *
 * Both admins and doctors use the identical flow, so these are factories
 * parameterised by role rather than two copies of the same controller:
 *   adminRouter.post("/forgot-password", forgotPassword("admin"))
 *   DoctorAuthRouter.post("/forgot-password", forgotPassword("doctor"))
 */

// Deliberately identical whether or not the account exists — the response
// must never reveal which emails are registered.
const GENERIC_SENT_MESSAGE =
  "If an account exists for that email, we've sent a reset code. Check your inbox."

/** POST /forgot-password — issue a reset code. */
export const forgotPassword = (role) => async (req, res) => {
  try {
    await requestReset({ role, email: req.body?.email })
  } catch (error) {
    // Log, but still return the generic response: an error here would
    // otherwise become an oracle for whether an account exists.
    console.error(`forgotPassword(${role}) error:`, error.message)
  }
  return res.status(200).json({ success: true, message: GENERIC_SENT_MESSAGE })
}

/** POST /reset-password — verify the code and set the new password. */
export const resetPassword = (role) => async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body || {}
    const result = await confirmReset({ role, email, otp, newPassword })

    if (!result.ok) {
      return res.status(400).json({ success: false, message: result.message })
    }
    return res.status(200).json({
      success: true,
      message: "Password updated. You can now log in with your new password.",
    })
  } catch (error) {
    console.error(`resetPassword(${role}) error:`, error.message)
    return res.status(500).json({
      success: false,
      message: "Could not reset your password. Please try again.",
    })
  }
}
