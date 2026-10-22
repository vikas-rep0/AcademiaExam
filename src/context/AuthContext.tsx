import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { 
  User, 
  signInWithPopup, 
  signOut as fbSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc 
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase/config';
import { UserProfile, UserRole } from '../types/exam';
import { 
  verifyAdminCredentials, 
  getActiveAdminSession, 
  clearAdminSession 
} from '../services/adminAuthService';

const ADMIN_EMAIL = 'meenarishiswm2006@gmail.com';
const DEMO_STORAGE_KEY = 'academia_demo_session';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  isStudent: boolean;
  loading: boolean;
  error: string | null;
  signInAdminWithCredentials: (username: string, pass: string) => Promise<{ success: boolean; error?: string; lockoutSeconds?: number }>;
  signInWithGoogle: () => Promise<void>;
  signInWithRollNumber: (rollNumber: string, accessCode: string) => Promise<boolean>;
  switchRoleDemo: (type: 'admin' | 'student1' | 'student2') => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function createSyntheticUser(uid: string, email: string | undefined, displayName: string): User {
  return {
    uid,
    email: email || `${uid}@college.edu`,
    displayName,
    emailVerified: true,
    isAnonymous: false,
    metadata: {} as any,
    providerData: [],
    refreshToken: '',
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => 'synthetic-token',
    getIdTokenResult: async () => ({} as any),
    reload: async () => {},
    toJSON: () => ({}),
    phoneNumber: null,
    photoURL: null,
    providerId: 'google.com',
  } as unknown as User;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Restore stored demo session or listen to real Firebase Auth
  useEffect(() => {
    // 1. Check if there is an active verified Admin session
    const activeAdmin = getActiveAdminSession();
    if (activeAdmin) {
      const synth = createSyntheticUser(activeAdmin.adminId, activeAdmin.email, activeAdmin.displayName);
      const profile: UserProfile = {
        uid: activeAdmin.adminId,
        email: activeAdmin.email,
        displayName: activeAdmin.displayName,
        role: 'admin',
        isActive: true,
        createdAt: activeAdmin.authenticatedAt,
      };
      setCurrentUser(synth);
      setUserProfile(profile);
      setLoading(false);
      return;
    }

    // 2. Check if there is an active demo session in sessionStorage
    const storedDemo = sessionStorage.getItem(DEMO_STORAGE_KEY);
    if (storedDemo) {
      try {
        const parsed = JSON.parse(storedDemo) as { profile: UserProfile; email?: string };
        const synth = createSyntheticUser(parsed.profile.uid, parsed.email, parsed.profile.displayName);
        setCurrentUser(synth);
        setUserProfile(parsed.profile);
        setLoading(false);
      } catch (e) {
        console.warn('Failed to parse stored demo session:', e);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        sessionStorage.removeItem(DEMO_STORAGE_KEY);
        setCurrentUser(user);
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userDocRef);
          
          const isRuntimeAdmin = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            if (isRuntimeAdmin && data.role !== 'admin') {
              const updated: UserProfile = { ...data, role: 'admin' };
              await setDoc(userDocRef, updated, { merge: true });
              await setDoc(doc(db, 'admins', user.uid), { uid: user.uid, email: user.email, createdAt: new Date().toISOString() });
              setUserProfile(updated);
            } else {
              setUserProfile(data);
            }
          } else {
            const role: UserRole = isRuntimeAdmin ? 'admin' : 'student';
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || undefined,
              displayName: user.displayName || (role === 'admin' ? 'College Examination Admin' : 'Candidate Student'),
              role,
              isActive: true,
              createdAt: new Date().toISOString(),
              normalizedRollNumber: role === 'student' ? `ROLL-${user.uid.slice(0, 6).toUpperCase()}` : undefined,
              classId: role === 'student' ? 'CSE-2024' : undefined,
            };

            await setDoc(userDocRef, newProfile);
            if (role === 'admin') {
              await setDoc(doc(db, 'admins', user.uid), {
                uid: user.uid,
                email: user.email,
                createdAt: new Date().toISOString(),
              });
            } else if (newProfile.normalizedRollNumber) {
              await setDoc(doc(db, 'rollNumberMappings', newProfile.normalizedRollNumber), {
                rollNumber: newProfile.normalizedRollNumber,
                uid: user.uid,
                studentName: newProfile.displayName,
                classId: newProfile.classId || 'CSE-2024',
                active: true,
              });
            }
            setUserProfile(newProfile);
          }
        } catch (err) {
          console.error('Error fetching/creating user profile:', err);
        }
      } else if (!sessionStorage.getItem(DEMO_STORAGE_KEY)) {
        setCurrentUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setError(null);
    try {
      sessionStorage.removeItem(DEMO_STORAGE_KEY);
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      console.error('Google Sign-in error:', err);
      const message = err instanceof Error ? err.message : 'Google sign-in failed. Please try again.';
      setError(message);
      throw err;
    }
  };

  const signInWithRollNumber = async (rollNumber: string, accessCode: string): Promise<boolean> => {
    setError(null);
    try {
      const normalized = rollNumber.trim().toUpperCase();
      if (!accessCode || accessCode.trim().length < 4) {
        setError('Access code must be at least 4 characters.');
        return false;
      }

      let studentName = `Candidate (${normalized})`;
      let classId = 'CSE-2024';

      if (normalized === '2024CS0101') {
        studentName = 'Aarav Sharma';
        classId = 'CSE-3A';
      } else if (normalized === '2024CS0102') {
        studentName = 'Priya Patel';
        classId = 'CSE-3A';
      } else if (normalized === '2024CS0103') {
        studentName = 'Rohan Deshmukh';
        classId = 'CSE-3A';
      }

      const targetUid = `std_${normalized.toLowerCase()}`;
      const synth = createSyntheticUser(targetUid, `${normalized.toLowerCase()}@college.edu`, studentName);
      
      const profileData: UserProfile = {
        uid: targetUid,
        displayName: studentName,
        normalizedRollNumber: normalized,
        role: 'student',
        classId,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      setCurrentUser(synth);
      setUserProfile(profileData);
      sessionStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ profile: profileData }));

      // If already connected to Firebase with an active token, attempt sync
      if (auth.currentUser) {
        try {
          await setDoc(doc(db, 'users', targetUid), profileData, { merge: true });
        } catch (e) {
          console.warn('Optional Firestore sync for roll number:', e);
        }
      }

      return true;
    } catch (err: unknown) {
      console.error('Roll number login error:', err);
      setError(err instanceof Error ? err.message : 'Invalid roll number credentials.');
      return false;
    }
  };

  const switchRoleDemo = async (type: 'admin' | 'student1' | 'student2') => {
    setError(null);
    setLoading(true);
    try {
      let uid = '';
      let email: string | undefined = undefined;
      let name = '';
      let roll: string | undefined = undefined;
      let classId: string | undefined = undefined;
      let role: UserRole = 'student';

      if (type === 'admin') {
        uid = 'admin_prof_sharma';
        email = ADMIN_EMAIL;
        name = 'Prof. Rajesh Sharma (Exam Controller)';
        role = 'admin';
      } else if (type === 'student1') {
        uid = 'demo_std_01';
        email = 'aarav.sharma@college.edu';
        name = 'Aarav Sharma';
        roll = '2024CS0101';
        classId = 'CSE-3A';
        role = 'student';
      } else {
        uid = 'demo_std_02';
        email = 'priya.patel@college.edu';
        name = 'Priya Patel';
        roll = '2024CS0102';
        classId = 'CSE-3A';
        role = 'student';
      }

      const synth = createSyntheticUser(uid, email, name);
      const profile: UserProfile = {
        uid,
        email,
        displayName: name,
        normalizedRollNumber: roll,
        role,
        classId,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      setCurrentUser(synth);
      setUserProfile(profile);
      sessionStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ profile, email }));

      // If real Firebase Auth user is present, sync with Firestore
      if (auth.currentUser) {
        try {
          await setDoc(doc(db, 'users', uid), profile, { merge: true });
          if (role === 'admin') {
            await setDoc(doc(db, 'admins', uid), { uid, email, createdAt: new Date().toISOString() }, { merge: true });
          }
        } catch (e) {
          console.warn('Optional Firestore write on demo switch:', e);
        }
      }
    } catch (err: unknown) {
      console.error('Demo switch error:', err);
      setError(err instanceof Error ? err.message : 'Unable to switch demo account.');
    } finally {
      setLoading(false);
    }
  };

  const signInAdminWithCredentials = async (
    username: string,
    pass: string
  ): Promise<{ success: boolean; error?: string; lockoutSeconds?: number }> => {
    setError(null);
    try {
      const res = await verifyAdminCredentials(username, pass);
      if (!res.success || !res.session) {
        setError(res.error || 'Authentication failed');
        return res;
      }

      const synth = createSyntheticUser(res.session.adminId, res.session.email, res.session.displayName);
      const profile: UserProfile = {
        uid: res.session.adminId,
        email: res.session.email,
        displayName: res.session.displayName,
        role: 'admin',
        isActive: true,
        createdAt: res.session.authenticatedAt,
      };

      setCurrentUser(synth);
      setUserProfile(profile);

      // Register into admins in Firestore if connected
      try {
        await setDoc(doc(db, 'users', res.session.adminId), profile, { merge: true });
        await setDoc(
          doc(db, 'admins', res.session.adminId),
          { uid: res.session.adminId, email: res.session.email, createdAt: new Date().toISOString() },
          { merge: true }
        );
      } catch (e) {
        console.warn('Optional Firestore sync for admin session:', e);
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const signOut = async () => {
    try {
      clearAdminSession();
      sessionStorage.removeItem(DEMO_STORAGE_KEY);
      localStorage.removeItem(DEMO_STORAGE_KEY);
      await fbSignOut(auth).catch(() => {});
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setCurrentUser(null);
      setUserProfile(null);
      setError(null);
    }
  };

  const isAdmin = useMemo(() => {
    return userProfile?.role === 'admin' || currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  }, [userProfile, currentUser]);

  const isStudent = useMemo(() => {
    return userProfile?.role === 'student';
  }, [userProfile]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        isAdmin,
        isStudent,
        loading,
        error,
        signInAdminWithCredentials,
        signInWithGoogle,
        signInWithRollNumber,
        switchRoleDemo,
        signOut,
        clearError: () => setError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
