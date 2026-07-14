import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Patient (OTP-based) auth
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [patientId, setPatientId] = useState(() => localStorage.getItem('patient_id'));
  const [contact, setContact] = useState(() => localStorage.getItem('otp_contact'));
  const [contactType, setContactType] = useState(
    () => localStorage.getItem('otp_contact_type') || 'email'
  );

  // Doctor auth
  const [doctorToken, setDoctorToken] = useState(() =>
    localStorage.getItem('doctor_token')
  );
  const [doctorInfo, setDoctorInfo] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('doctor') || 'null');
    } catch {
      return null;
    }
  });

  // Admin auth
  const [adminToken, setAdminToken] = useState(() =>
    localStorage.getItem('admin_token')
  );
  const [adminInfo, setAdminInfo] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('admin') || 'null');
    } catch {
      return null;
    }
  });

  // Sync from localStorage on load
  useEffect(() => {
    setToken(localStorage.getItem('token'));
    setPatientId(localStorage.getItem('patient_id'));
  }, []);

  // Patient actions
  const saveToken = (t) => {
    localStorage.setItem('token', t);
    setToken(t);
  };

  // Persist the contact the OTP was sent to (read back on the OTP page)
  const saveContact = (c, type = 'email') => {
    localStorage.setItem('otp_contact', c);
    localStorage.setItem('otp_contact_type', type);
    setContact(c);
    setContactType(type);
  };

  const savePatient = (t, pid, c, type = 'email') => {
    localStorage.setItem('token', t);
    localStorage.setItem('patient_id', pid);
    localStorage.setItem('otp_contact', c);
    localStorage.setItem('otp_contact_type', type);
    setToken(t);
    setPatientId(pid);
    setContact(c);
    setContactType(type);
  };

  const isPatientVerified = !!token && !!patientId;

  // Doctor actions
  const saveDoctorToken = (t, info) => {
    localStorage.setItem('doctor_token', t);
    localStorage.setItem('doctor', JSON.stringify(info));
    setDoctorToken(t);
    setDoctorInfo(info);
  };

  // Admin actions
  const saveAdminToken = (t, info) => {
    localStorage.setItem('admin_token', t);
    localStorage.setItem('admin', JSON.stringify(info));
    setAdminToken(t);
    setAdminInfo(info);
  };

  // Logout actions
  const logoutPatient = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('otp_contact');
    localStorage.removeItem('otp_contact_type');
    localStorage.removeItem('patient_id');
    setToken(null);
    setPatientId(null);
    setContact(null);
    setContactType('email');
  };

  const logoutDoctor = () => {
    localStorage.removeItem('doctor_token');
    localStorage.removeItem('doctor');
    setDoctorToken(null);
    setDoctorInfo(null);
  };

  const logoutAdmin = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin');
    setAdminToken(null);
    setAdminInfo(null);
  };

  return (
    <AuthContext.Provider
      value={{
        // Patient
        token,
        patientId,
        contact,
        contactType,
        isPatientVerified,
        saveToken,
        saveContact,
        savePatient,
        logoutPatient,
        // Doctor
        doctorToken,
        doctorInfo,
        isDoctorLoggedIn: !!doctorToken,
        saveDoctorToken,
        logoutDoctor,
        // Admin
        adminToken,
        adminInfo,
        isAdminLoggedIn: !!adminToken,
        saveAdminToken,
        logoutAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
