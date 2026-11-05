
import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAc7Eoxyf0SlYiE7C93WiF6Onbm7Pfzc-k",
    authDomain: "smart-shop-ai-3ff6c.firebaseapp.com",
    projectId: "smart-shop-ai-3ff6c",
    storageBucket: "smart-shop-ai-3ff6c.firebasestorage.app",
    messagingSenderId: "567549328992",
    appId: "1:567549328992:web:5a0276f296fcb15fa24d05",
    measurementId: "G-0ML90WYJKZ"
};

const app = getApps().length
    ? getApp()
    : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
