// Match existing mixed-case addresses without treating SQL LIKE wildcards as input.
export const emailLookup = email => (typeof email === 'string' ? email.trim().toLowerCase() : '')
  .replace(/[\\%_]/g, '\\$&')
