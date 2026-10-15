import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../services/firebase';

interface AuthContextType {
  currentUser: User | { email: string; uid: string; displayName?: string } | null;
  loading: boolean;
  isFirebaseReady: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
  isDevDemoAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDevDemoAdmin, setIsDevDemoAdmin] = useState<boolean>(false);

  useEffect(() => {
    // Check if offline dev session was saved
    const demoAdminSession = sessionStorage.getItem('sjec_demo_admin_logged_in');
    if (!isFirebaseConfigured && demoAdminSession === 'true') {
      setCurrentUser({
        email: 'admin@sjec.ac.in',
        uid: 'demo-local-admin-uid',
        displayName: 'SJEC Demo Administrator',
      });
      setIsDevDemoAdmin(true);
      setLoading(false);
      return;
    }

    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsDevDemoAdmin(false);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    setError(null);

    // If Firebase is configured with real credentials
    if (auth && isFirebaseConfigured) {
      try {
        await signInWithEmailAndPassword(auth, email, pass);
      } catch (err: any) {
        console.error('Firebase Auth Login Error:', err);
        let msg = 'Failed to sign in. Please verify your email and password.';
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
          msg = 'Firebase rejected this sign-in. Confirm the user exists in Firebase Authentication for project aqms-cdc39 and use the password set for that account. Demo credentials do not work while Firebase is configured.';
        } else if (err.code === 'auth/too-many-requests') {
          msg = 'Access temporarily disabled due to many failed login attempts. Try again later.';
        } else if (err.code === 'auth/operation-not-allowed') {
          msg = 'Email/Password sign-in is disabled for this Firebase project. Enable it in Firebase Console > Authentication > Sign-in method.';
        } else if (err.code === 'auth/invalid-api-key') {
          msg = 'Firebase rejected the configured API key. Check the web app configuration in this project.';
        } else if (err.code === 'auth/network-request-failed') {
          msg = 'Could not reach Firebase Authentication. Check the network connection and try again.';
        }
        setError(msg);
        throw new Error(msg);
      }
      return;
    }

    // Offline / Demo evaluation mode fallback
    if (email === 'admin@sjec.ac.in' && pass === 'admin123') {
      sessionStorage.setItem('sjec_demo_admin_logged_in', 'true');
      setCurrentUser({
        email: 'admin@sjec.ac.in',
        uid: 'demo-local-admin-uid',
        displayName: 'SJEC Demo Administrator',
      });
      setIsDevDemoAdmin(true);
      return;
    }

    const msg = 'Invalid credentials. In local demo mode, use admin@sjec.ac.in / admin123, or configure your Firebase .env variables.';
    setError(msg);
    throw new Error(msg);
  };

  const logout = async () => {
    setError(null);
    if (auth && isFirebaseConfigured) {
      await firebaseSignOut(auth);
    }
    sessionStorage.removeItem('sjec_demo_admin_logged_in');
    setCurrentUser(null);
    setIsDevDemoAdmin(false);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        isFirebaseReady: isFirebaseConfigured,
        login,
        logout,
        error,
        clearError,
        isDevDemoAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
