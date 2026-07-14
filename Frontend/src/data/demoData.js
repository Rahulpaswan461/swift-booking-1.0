// Sample data for the interactive demo

export const demoDoctors = [
  {
    id: 'd1',
    full_name: 'Sarah Johnson',
    specialization: 'Cardiology',
    qualification: 'MBBS, MD (Cardiology)',
    experience: '12 years',
    is_active: true,
    next_available: 'Today',
    slots: ['09:00 AM', '10:30 AM', '02:00 PM'],
    rating: 4.9,
    patients: 1240,
  },
  {
    id: 'd2',
    full_name: 'James Williams',
    specialization: 'Dermatology',
    qualification: 'MBBS, DDV',
    experience: '8 years',
    is_active: true,
    next_available: 'Today',
    slots: ['11:00 AM', '03:00 PM', '04:30 PM'],
    rating: 4.7,
    patients: 890,
  },
  {
    id: 'd3',
    full_name: 'Priya Sharma',
    specialization: 'Pediatrics',
    qualification: 'MBBS, DCH',
    experience: '10 years',
    is_active: true,
    next_available: 'Tomorrow',
    slots: ['09:30 AM', '11:00 AM', '01:00 PM'],
    rating: 4.8,
    patients: 1560,
  },
  {
    id: 'd4',
    full_name: 'Michael Chen',
    specialization: 'Orthopedics',
    qualification: 'MBBS, MS (Ortho)',
    experience: '15 years',
    is_active: true,
    next_available: 'Today',
    slots: ['10:00 AM', '02:30 PM'],
    rating: 4.6,
    patients: 720,
  },
];

export const demoAppointments = [
  { id: 'a1', patient: 'Rahul P.', doctor: 'Dr. Sarah Johnson', date: 'Jul 2, 2026', time: '09:00 AM', status: 'Confirmed' },
  { id: 'a2', patient: 'Ankit M.', doctor: 'Dr. James Williams', date: 'Jul 2, 2026', time: '11:00 AM', status: 'Confirmed' },
  { id: 'a3', patient: 'Sneha K.', doctor: 'Dr. Priya Sharma', date: 'Jul 3, 2026', time: '09:30 AM', status: 'Pending' },
  { id: 'a4', patient: 'Vikram S.', doctor: 'Dr. Michael Chen', date: 'Jul 3, 2026', time: '10:00 AM', status: 'Pending' },
  { id: 'a5', patient: 'Neha R.', doctor: 'Dr. Sarah Johnson', date: 'Jul 1, 2026', time: '02:00 PM', status: 'Completed' },
  { id: 'a6', patient: 'Amit G.', doctor: 'Dr. James Williams', date: 'Jul 1, 2026', time: '03:00 PM', status: 'Cancelled' },
];

export const demoStats = {
  totalAppointments: 24,
  todayAppointments: 8,
  totalDoctors: 4,
  completionRate: '94%',
  weeklyTrend: [
    { day: 'Mon', count: 6 },
    { day: 'Tue', count: 9 },
    { day: 'Wed', count: 5 },
    { day: 'Thu', count: 12 },
    { day: 'Fri', count: 8 },
    { day: 'Sat', count: 3 },
    { day: 'Sun', count: 1 },
  ],
};

export const demoWalkthroughSteps = [
  {
    title: 'Your Own Branded Portal',
    desc: 'Every clinic gets a unique booking URL — patients see your brand, not a marketplace.',
    icon: '🏥',
    color: 'brand',
  },
  {
    title: 'Patient Booking Flow',
    desc: 'Patients verify with OTP, browse your doctors, pick a slot, and get confirmed instantly.',
    icon: '📅',
    color: 'green',
  },
  {
    title: 'Doctor Management',
    desc: 'Add doctors, set their schedules, and manage availability from one dashboard.',
    icon: '👨‍⚕️',
    color: 'amber',
  },
  {
    title: 'Real-Time Analytics',
    desc: 'Track appointments, trends, and doctor performance — all from your admin panel.',
    icon: '📊',
    color: 'purple',
  },
];

export const demoClinicInfo = {
  name: 'Apollo Clinic',
  tagline: 'Trusted healthcare since 1995',
};

export const demoAdminUser = {
  name: 'Dr. Admin',
  email: 'demo@medibook.com',
  role: 'Clinic Admin',
};

export const demoDoctorUser = {
  name: 'Dr. Sarah Johnson',
  specialization: 'Cardiology',
  email: 'sarah@apollo.demo',
  role: 'Doctor',
};

export const demoPatientUser = {
  name: 'Rahul Paswan',
  email: 'rahul@demo.com',
  role: 'Patient',
};

export const demoNotes = [
  { id: 'n1', patient: 'Rahul P.', doctor: 'Dr. Sarah Johnson', date: 'Jul 1, 2026', note: 'Routine checkup. BP normal. Advised to continue current medication.' },
  { id: 'n2', patient: 'Neha R.', doctor: 'Dr. Sarah Johnson', date: 'Jul 1, 2026', note: 'Follow-up for chest pain. ECG normal. Referred for echocardiogram.' },
];

// Trust signals
export const demoTrustSignals = {
  clinicsOnboard: '500+',
  monthlyBookings: '50K+',
  avgRating: 4.8,
  uptime: '99.9%',
  countries: 12,
};

export const demoTestimonials = [
  {
    name: 'Dr. Rajesh Kumar',
    clinic: 'MediCare Hospital, Delhi',
    text: 'We moved from WhatsApp scheduling to MediBook in one day. Patient no-shows dropped by 40%.',
  },
  {
    name: 'Priya Menon',
    clinic: 'SkinFirst Dermatology, Mumbai',
    text: 'Our patients love the self-booking. We saved 3 staff-hours every single day.',
  },
];

export const demoSecurityBadges = [
  { label: 'SSL Encrypted', icon: '🔒' },
  { label: 'HIPAA Compliant', icon: '🛡️' },
  { label: 'GDPR Ready', icon: '✅' },
];
