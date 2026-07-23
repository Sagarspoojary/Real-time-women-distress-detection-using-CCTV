import React, { createContext, useContext, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut,
  updateProfile
} from "firebase/auth";
import { auth, googleProvider, githubProvider } from "../services/firebase";
import toast from "react-hot-toast";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Monitor real Firebase Auth status
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Successfully logged in!");
    } catch (error: any) {
      toast.error(error.message || "Failed to log in.");
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName: fullName });
        setUser({ ...userCredential.user, displayName: fullName });
      }
      toast.success("Successfully registered account!");
    } catch (error: any) {
      toast.error(error.message || "Registration failed.");
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success("Logged in with Google!");
    } catch (error: any) {
      if (error.code === "auth/account-exists-with-different-credential") {
        toast.error("This email is already associated with another login method (e.g., Email or GitHub). Please sign in using your original provider.");
      } else {
        toast.error(error.message || "Google Login failed.");
      }
      throw error;
    }
  };

  const signInWithGithub = async () => {
    try {
      await signInWithPopup(auth, githubProvider);
      toast.success("Logged in with GitHub!");
    } catch (error: any) {
      if (error.code === "auth/account-exists-with-different-credential") {
        toast.error("This email is already associated with another login method (e.g., Google or Email). Please sign in using your original provider.");
      } else {
        toast.error(error.message || "GitHub Login failed.");
      }
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Password reset email sent!");
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset link.");
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully!");
    } catch (error: any) {
      toast.error(error.message || "Logout failed.");
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signInWithGithub,
      resetPassword,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
