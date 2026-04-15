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
        console.error("Error while verifying token", error)
        return res.status(401).json({ success: false, message: "Invalid or Expired token" })
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

        if (req.path === '/api/admin/login') return next()

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'No token provided. ' })
        }

        const token = authHeader.split(" ")[1]

        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        if (decoded.role !== 'admin') {
            return res.status(403).json({ success: false, message: "Access denied . " })
        }
        req.admin = decoded;

        next();

    }
    catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token.' })
    }
}