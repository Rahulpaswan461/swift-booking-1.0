import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [email, setEmail] = useState(() => localStorage.getItem('otp_email'));

  const saveToken = (t) => {
    localStorage.setItem('token', t);
    setToken(t);
  };

  const saveEmail = (e) => {
    localStorage.setItem('otp_email', e);
    setEmail(e);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('otp_email');
    setToken(null);
    setEmail(null);
  };

  return (
    <AuthContext.Provider value={{ token, email, saveToken, saveEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
