import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { applyBrandColor, resetBrandColor } from '../utils/theme';

import { isPlatformHost } from '../utils/host';
import { loadClinicInfo } from '../utils/clinicBootstrap';
import { readPublicPage } from '../utils/publicPageCache';

const ClinicContext = createContext(null);

export function ClinicProvider({ children }) {
  const platformHost = isPlatformHost();
  const [clinic, setClinic] = useState(null);
  const [loading, setLoading] = useState(!platformHost);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const retryClinic = useCallback(() => {
    setError(null);
    setLoading(true);
    setAttempt(value => value + 1);
  }, []);

  useEffect(() => {
    if (platformHost) {
      // Cached branding must not turn the platform into a clinic page.
      try { localStorage.removeItem('clinic_info'); } catch { /* Optional cache */ }
      return;
    }

    const controller = new AbortController();
    loadClinicInfo({ platformHost, signal: controller.signal, get: async (path, options) => ({
      data: { data: await readPublicPage(path, { get: api.get, signal: options.signal, force: attempt > 0 }) },
    }) })
      .then(result => {
        if (controller.signal.aborted) return;
        setClinic(result.clinic);
        setError(result.error);
        try {
          // Retire the old timestamp-free cache. Public data is now stored
          // by readPublicPage with a short expiry and an explicit site scope.
          localStorage.removeItem('clinic_info');
        } catch { /* Cache failures must not prevent opening the booking page. */ }
      })
      .catch(() => { /* Unmounted or superseded lookup was cancelled. */ })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [platformHost, attempt]);

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
  const clinicName = branding.clinic_name || clinic?.name || 'Healibrate';
  const logoUrl = branding.logo_url;

  // Browser tab title reflects the clinic patients are visiting. Platform
  // (non-tenant) pages set their own title+description via useSeo, and this
  // provider is their parent — parent effects run last, so returning early
  // here is what stops it from clobbering them.
  useEffect(() => {
    if (!clinic) return;
    document.title = `${clinicName} — Book an appointment`;
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
        error,
        retryClinic,
        hasTenant: !!clinic,  // true when a tenant (clinic) is resolved
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
}

export const useClinic = () => useContext(ClinicContext);
