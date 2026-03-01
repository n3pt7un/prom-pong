import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from '../firebaseConfig';

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async (): Promise<User> => {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

export const signOut = async (): Promise<void> => {
  await firebaseSignOut(auth);
};

export const onAuthStateChanged = (callback: (user: User | null) => void) => {
  return firebaseOnAuthStateChanged(auth, callback);
};

export const getIdToken = async (): Promise<string | null> => {
  if (import.meta.env.VITE_LOCAL_DEV === 'true') return 'dev-token';
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
};

export type { User };
