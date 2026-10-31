/* Majuri Pro cloud adapter. Firebase Web SDK v11.10.0, modular CDN imports. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirestore, doc, getDoc, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { firebaseConfig, allowedEmails } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });
const allowed = new Set(allowedEmails.map(x => String(x).trim().toLowerCase()));

function assertAllowed(user) {
  const email = String(user?.email || '').toLowerCase();
  if (!user || !user.emailVerified || !allowed.has(email)) {
    throw new Error('This Google account is not approved for Majuri Pro.');
  }
  return user;
}

export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    try { return assertAllowed(result.user); }
    catch (error) { await signOut(auth); throw error; }
  } catch (error) {
    // Browsers and installed PWAs may block popups. Fall back to a full-page
    // redirect, which is initiated directly from the user's click handler.
    if (['auth/popup-blocked','auth/operation-not-supported-in-this-environment','auth/cancelled-popup-request'].includes(error?.code)) {
      await signInWithRedirect(auth, provider);
      return null; // browser navigates away; onAuthStateChanged handles return
    }
    throw error;
  }
}
export async function completeRedirectLogin() {
  const result = await getRedirectResult(auth);
  if (!result?.user) return null;
  try { return assertAllowed(result.user); }
  catch (error) { await signOut(auth); throw error; }
}
export function logout() { return signOut(auth); }
export function watchLogin(callback) {
  return onAuthStateChanged(auth, user => {
    if (!user) return callback(null);
    try { callback(assertAllowed(user)); }
    catch { signOut(auth); callback(null); }
  });
}
function stateRef(user) {
  assertAllowed(user);
  return doc(db, 'users', user.uid, 'app', 'main');
}
export async function loadCloudState(user) {
  const snap = await getDoc(stateRef(user));
  if (!snap.exists()) return { state: null, revision: 0 };
  const data = snap.data();
  return { state: data.state ?? null, revision: Number(data.revision || 0) };
}
function cloudSafeState(input) {
  // Photos remain on the device. Keeping base64 photos out avoids Firestore's
  // 1 MiB document limit and avoids requiring Cloud Storage / a billing plan.
  const state = structuredClone(input);
  for (const work of state.works || []) work.photos = [];
  for (const payment of state.payments || []) payment.photo = '';
  const bytes = new TextEncoder().encode(JSON.stringify(state)).length;
  if (bytes > 850_000) throw new Error('Cloud record is too large. Photos are local-only; export a JSON backup and reduce unusually large text fields.');
  return state;
}
export async function saveCloudState(user, input, expectedRevision) {
  const ref = stateRef(user);
  const safeState = cloudSafeState(input);
  return runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    const current = snap.exists() ? Number(snap.data().revision || 0) : 0;
    if (current !== Number(expectedRevision || 0)) {
      const error = new Error('CLOUD_CONFLICT: Cloud data changed on another device. Reload cloud data before making further changes.');
      error.code = 'CLOUD_CONFLICT';
      throw error;
    }
    const next = current + 1;
    tx.set(ref, { state: safeState, revision: next, schemaVersion: 1, updatedAt: serverTimestamp() });
    return next;
  });
}
