// Locks a login key (phone number / username) after too many wrong guesses.
// In-memory: fine for a single server instance, resets when it restarts.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;

const failures = new Map();

function current(key) {
  const entry = failures.get(key);
  if (entry && Date.now() - entry.first > WINDOW_MS) {
    failures.delete(key);
    return null;
  }
  return entry || null;
}

// Returns minutes remaining if locked, otherwise 0.
export function lockedForMinutes(key) {
  const entry = current(key);
  if (!entry || entry.count < MAX_FAILURES) return 0;
  return Math.max(1, Math.ceil((entry.first + WINDOW_MS - Date.now()) / 60000));
}

export function recordFailure(key) {
  const entry = current(key);
  if (entry) entry.count += 1;
  else failures.set(key, { count: 1, first: Date.now() });
}

export function clearFailures(key) {
  failures.delete(key);
}
