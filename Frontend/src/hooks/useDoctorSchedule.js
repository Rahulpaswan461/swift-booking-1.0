import { doctorApi } from '../api/axios'
import useApiSnapshot from './useApiSnapshot'
export default function useDoctorSchedule(date) {
  return useApiSnapshot(doctorApi, '/doctor/appointments', { date })
}
