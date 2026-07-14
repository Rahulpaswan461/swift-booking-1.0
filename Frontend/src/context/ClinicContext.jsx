import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';
import { applyBrandColor, resetBrandColor } from '../utils/theme';

const ClinicContext = createContext(null);

export function ClinicProvider({ children }) {
  const [clinic, setClinic] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('clinic_info') || 'null');
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch clinic info from the resolved tenant (backend uses Host header)
    api
      .get('/clinic/info')
      .then((res) => {
        const info = res.data.data;
        setClinic(info);
        localStorage.setItem('clinic_info', JSON.stringify(info));
      })
      .catch(() => {
        // Clinic info not available — no tenant resolved (e.g., dev mode, no clinic yet)
        setClinic(null);
        localStorage.removeItem('clinic_info');
      })
      .finally(() => setLoading(false));
  }, []);

  // Apply the clinic's primary color to the whole portal (CSS variables)
  useEffect(() => {
    const color = clinic?.branding?.primary_color;
    if (color) {
      applyBrandColor(color);
    } else {
      resetBrandColor();
    }
  }, [clinic]);

  // Derived values
  const branding = clinic?.branding || {};
  const clinicName = branding.clinic_name || clinic?.name || 'MediBook';
  const logoUrl = branding.logo_url;

  // Browser tab title reflects the clinic patients are visiting
  useEffect(() => {
    document.title = clinic
      ? `${clinicName} — Book an appointment`
      : 'MediBook — Clinic appointment platform';
  }, [clinic, clinicName]);
  const primaryColor = branding.primary_color || '#0171be';
  const tagline = branding.tagline || '';

  return (
    <ClinicContext.Provider
      value={{
        clinic,
        clinicName,
        logoUrl,
        primaryColor,
        tagline,
        operatingHours: clinic?.operating_hours || null,
        loading,
        hasTenant: !!clinic,  // true when a tenant (clinic) is resolved
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
}

export const useClinic = () => useContext(ClinicContext);
