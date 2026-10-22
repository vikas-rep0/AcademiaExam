/**
 * Secure Administrator Authentication Service
 * 
 * Cryptographically protected authentication gateway for the College Examination Admin Hub.
 * Features:
 * - Web Crypto SHA-256 with strong institutional salt (zero plaintext storage)
 * - Rate limiting & brute-force protection with lockout timer
 * - High-entropy session token generation
 * - Persistent administrative session state
 */

const SALT = 'AcademiaExamSecureAdminSalt2026_!#';

// SHA-256 hashes of salted credentials
const EXPECTED_USER_HASH = '319876d65629a9b761ec7515c51661f9b9bbf56a8ad5472d7e2711876c0fe2e9';
const EXPECTED_PASS_HASH = 'b715fffb225b5c5789d3b621d09270cab9840e5b36cb3a8e3fec3fca597e8959';

const ADMIN_STORAGE_KEY = 'academia_admin_secure_session';
const ATTEMPTS_STORAGE_KEY = 'academia_admin_auth_attempts';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 1000; // 30 seconds lockout

export interface AdminSession {
  token: string;
  adminId: string;
  username: string;
  displayName: string;
  email: string;
  authenticatedAt: string;
  expiresAt: number;
}

interface AttemptTracker {
  count: number;
  lockoutUntil: number;
}

async function sha256Hex(value: string): Promise<string> {
  const enc = new TextEncoder();
  const buffer = enc.encode(value + SALT);
  const hashBuf = await crypto.subtle.digest('SHA-256', buffer);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function getAttemptTracker(): AttemptTracker {
  try {
    const raw = sessionStorage.getItem(ATTEMPTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.count === 'number' && typeof parsed.lockoutUntil === 'number') {
        return parsed;
      }
    }
  } catch {
    // fallback
  }
  return { count: 0, lockoutUntil: 0 };
}

function saveAttemptTracker(tracker: AttemptTracker): void {
  try {
    sessionStorage.setItem(ATTEMPTS_STORAGE_KEY, JSON.stringify(tracker));
  } catch {
    // fallback
  }
}

/**
 * Verify administrator credentials securely with brute force lockout protection
 */
export async function verifyAdminCredentials(
  username: string,
  pass: string
): Promise<{ success: boolean; error?: string; lockoutSeconds?: number; session?: AdminSession }> {
  const now = Date.now();
  const tracker = getAttemptTracker();

  // 1. Check if currently locked out
  if (tracker.lockoutUntil > now) {
    const remainingSec = Math.ceil((tracker.lockoutUntil - now) / 1000);
    return {
      success: false,
      error: `Security lockout active: Too many failed login attempts. Please wait ${remainingSec}s.`,
      lockoutSeconds: remainingSec,
    };
  }

  // 2. Normalize inputs
  const normUser = username.trim();
  const normPass = pass;

  if (!normUser || !normPass) {
    return {
      success: false,
      error: 'Please enter both Administrator Username and Password.',
    };
  }

  // 3. Compute SHA-256 hashes
  const userHash = await sha256Hex(normUser);
  const passHash = await sha256Hex(normPass);

  // 4. Verify match
  const isMatch = userHash === EXPECTED_USER_HASH && passHash === EXPECTED_PASS_HASH;

  if (!isMatch) {
    tracker.count += 1;
    if (tracker.count >= MAX_FAILED_ATTEMPTS) {
      tracker.lockoutUntil = now + LOCKOUT_DURATION_MS;
      saveAttemptTracker(tracker);
      return {
        success: false,
        error: `Invalid credentials. Maximum attempts exceeded. Lockout active for 30 seconds.`,
        lockoutSeconds: 30,
      };
    } else {
      saveAttemptTracker(tracker);
      const remainingAttempts = MAX_FAILED_ATTEMPTS - tracker.count;
      return {
        success: false,
        error: `Invalid Administrator Username or Password. (${remainingAttempts} attempts remaining before lockout)`,
      };
    }
  }

  // Reset failed attempts on success
  saveAttemptTracker({ count: 0, lockoutUntil: 0 });

  // 5. Generate high-entropy cryptographic session token
  const randomBytes = new Uint8Array(24);
  crypto.getRandomValues(randomBytes);
  const sessionToken = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const session: AdminSession = {
    token: sessionToken,
    adminId: 'admin_rishi1230',
    username: normUser,
    displayName: 'Controller of Examinations (Rishi)',
    email: 'meenarishiswm2006@gmail.com',
    authenticatedAt: new Date().toISOString(),
    expiresAt: now + 24 * 60 * 60 * 1000, // 24-hour admin session
  };

  // Persist session
  try {
    sessionStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(session));
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // fallback
  }

  return { success: true, session };
}

/**
 * Check if an active, unexpired admin session exists
 */
export function getActiveAdminSession(): AdminSession | null {
  try {
    const raw = sessionStorage.getItem(ADMIN_STORAGE_KEY) || localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AdminSession;
    if (session.expiresAt && session.expiresAt > Date.now()) {
      return session;
    }
    // Expired
    clearAdminSession();
    return null;
  } catch {
    return null;
  }
}

/**
 * Clear the admin session
 */
export function clearAdminSession(): void {
  try {
    sessionStorage.removeItem(ADMIN_STORAGE_KEY);
    localStorage.removeItem(ADMIN_STORAGE_KEY);
  } catch {
    // fallback
  }
}
