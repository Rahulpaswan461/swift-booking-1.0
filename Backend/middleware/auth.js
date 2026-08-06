import jwt from "jsonwebtoken"

export const protect = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "Please provide a valid token" })
    }

    const token = authHeader.split(" ")[1]

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.patient = decoded;
        next()
    }
    catch (error) {
        // An expired token is a NORMAL event (patient sessions last 12h) — the
        // frontend clears it and re-verifies. Don't log it as an error; only
        // genuinely malformed/invalid tokens are worth a warning.
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ success: false, message: "Session expired. Please verify again.", code: "token_expired" })
        }
        console.warn("Patient token invalid:", error.message)
        return res.status(401).json({ success: false, message: "Invalid token", code: "token_invalid" })
    }
}

export const protectDoctor = (req, res, next) => {
    const authHeader = req.headers.authorization

    if (req.path === '/api/doctors/login' || req.path === 'api/doctors/create') return next()

    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'No token provided. ' })
    }


    const token = authHeader.split(' ')[1]

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        if (decoded.role !== 'doctor') {
            return res.status(403).json({ success: false, message: "Access denied . " })
        }

        // clinic_id must be present in the JWT
        if (!decoded.clinic_id) {
            return res.status(403).json({ success: false, message: "Invalid session — missing clinic context. Please log in again." })
        }

        req.doctor = decoded;

        next();

    }
    catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token.' })
    }
}
export const protectAdmin = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization

        if (req.path === '/api/admin/login' || req.path.startsWith('/api/admin/clinics')) return next()

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'No token provided. ' })
        }

        const token = authHeader.split(" ")[1]

        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        if (decoded.role !== 'admin') {
            return res.status(403).json({ success: false, message: "Access denied . " })
        }

        // clinic_id must be present in the JWT
        if (!decoded.clinic_id) {
            return res.status(403).json({ success: false, message: "Invalid session — missing clinic context. Please log in again." })
        }

        req.admin = decoded;

        next();

    }
    catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token.' })
    }
}

// Optional admin auth: attaches req.admin when a valid admin token is present,
// but NEVER rejects. Used by public routes that also serve logged-in admins
// (e.g. the support form: website visitors submit anonymously, while the in-app
// help widget carries the admin token so we can tag the request with clinic_id).
export const optionalAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
        try {
            const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET)
            if (decoded.role === 'admin' && decoded.clinic_id) req.admin = decoded
        } catch {
            // Invalid/expired token → treat as anonymous, don't block the submission.
        }
    }
    next()
}