import { initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  getDatabase,
  onValue,
  push,
  ref,
  remove,
  set,
} from "firebase/database";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signUpWithEmail = async (email, password) => {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(credential.user);
  return credential;
};

export const signInWithEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);

export const logOut = () => signOut(auth);

export const resetPassword = (email) => sendPasswordResetEmail(auth, email);

export const sendVerificationEmail = () => {
  if (!auth.currentUser) {
    throw new Error("No authenticated user.");
  }

  return sendEmailVerification(auth.currentUser);
};

export const refreshAuthUser = async () => {
  if (!auth.currentUser) {
    return null;
  }

  await reload(auth.currentUser);
  return auth.currentUser;
};

const getUserLayoutsRef = (uid) => {
  if (!uid) {
    throw new Error("User ID is required.");
  }

  return ref(db, `users/${uid}/layouts`);
};

const getUserTemplatesRef = (uid) => {
  if (!uid) {
    throw new Error("User ID is required.");
  }

  return ref(db, `users/${uid}/templates`);
};

const getUserMetaRef = (uid) => {
  if (!uid) {
    throw new Error("User ID is required.");
  }

  return ref(db, `users/${uid}/meta`);
};

export const subscribeToUserLayouts = (uid, onLayouts, onError) => {
  const layoutsRef = getUserLayoutsRef(uid);

  return onValue(
    layoutsRef,
    (snapshot) => {
      const value = snapshot.val() ?? {};
      const layouts = Object.entries(value)
        .map(([id, entry]) => ({
          id,
          name: entry?.name ?? "Untitled layout",
          layout: entry?.layout ?? null,
          createdAt: Number(entry?.createdAt) || 0,
          updatedAt: Number(entry?.updatedAt) || 0,
        }))
        .sort((a, b) => b.updatedAt - a.updatedAt);
      onLayouts(layouts);
    },
    onError,
  );
};

export const saveUserLayout = async (
  uid,
  { layoutId, name, layout, createdAt },
) => {
  const baseRef = getUserLayoutsRef(uid);
  const targetRef = layoutId ? ref(db, `users/${uid}/layouts/${layoutId}`) : push(baseRef);
  const nextCreatedAt = layoutId ? Number(createdAt) || Date.now() : Date.now();

  await set(targetRef, {
    name: name?.trim() || "Untitled layout",
    layout,
    createdAt: nextCreatedAt,
    updatedAt: Date.now(),
  });

  return targetRef.key;
};

export const deleteUserLayout = (uid, layoutId) => {
  if (!layoutId) {
    throw new Error("Layout ID is required.");
  }

  return remove(ref(db, `users/${uid}/layouts/${layoutId}`));
};

export const subscribeToUserTemplates = (uid, onTemplates, onError) => {
  const templatesRef = getUserTemplatesRef(uid);

  return onValue(
    templatesRef,
    (snapshot) => {
      const value = snapshot.val();
      onTemplates(Array.isArray(value) ? value : []);
    },
    onError,
  );
};

export const saveUserTemplates = (uid, templates) =>
  set(getUserTemplatesRef(uid), templates);

export const subscribeToLastOpenedLayoutId = (uid, onValueChange, onError) =>
  onValue(
    ref(db, `users/${uid}/meta/lastOpenedLayoutId`),
    (snapshot) => {
      onValueChange(typeof snapshot.val() === "string" ? snapshot.val() : "");
    },
    onError,
  );

export const saveLastOpenedLayoutId = (uid, layoutId) =>
  set(ref(db, `users/${uid}/meta/lastOpenedLayoutId`), layoutId || "");
