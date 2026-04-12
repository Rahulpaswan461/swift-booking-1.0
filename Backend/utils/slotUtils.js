// Generates all possible slots for a schedule

export const generateSlots = (start_time, end_time, slot_duration_mins) => {
  const slots = [];

  const [startH, startM] = start_time.split(":").map(Number);
  const [endH, endM] = end_time.split(":").map(Number);

  let current = startH * 60 + startM;
  const end = endH * 60 + endM;

  while (current + slot_duration_mins <= end) {
    const h = String(Math.floor(current / 60)).padStart(2, "0");
    const m = String(current % 60).padStart(2, "0");

    slots.push(`${h}:${m}`);
    current += slot_duration_mins;
  }

  return slots;
};

export const isSlotBlocked = (slot, slotDate, slotDuration, unavailabilities) => {
  if(!unavailabilities) return;
  
  const slotStart = timeToMins(slot);
  const slotEnd = slotStart + slotDuration;

  return unavailabilities.some(({ start_time, end_time, date }) => {
    
    // Date check
    if (date && date !== slotDate) return false;

    // Full day block
    if (!start_time && !end_time) return true;

    if (!start_time || !end_time) return false;

    const blockStart = timeToMins(start_time);
    const blockEnd = timeToMins(end_time);

    // Overlap logic (IMPORTANT FIX)
    return slotStart < blockEnd && slotEnd > blockStart;
  });
};

export const timeToMins = (time) =>{
    const [h, m] = time.split(":").map(Number)
    return h * 60 + m;
}

export const getDayAbb = (dateStr) =>{
    const days = ["Sun","Mon",'Tue','Wed','Thu','Fri','Sat']
    return days[new Date(dateStr).getDay()]
}

