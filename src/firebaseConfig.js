import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBPw4LwML4ReIO9deuW92x0rdAXDJhX5Y",
  authDomain: "travellog-80759.firebaseapp.com",
  databaseURL: "https://travellog-80759-default-rtdb.firebaseio.com",
  projectId: "travellog-80759",
  storageBucket: "travellog-80759.firebasestorage.app",
  messagingSenderId: "150892374669",
  appId: "1:150892374669:web:7c4581a7182fdb6ec010c4",
  measurementId: "G-23K07MDND6",
};

let app;
let auth;
let database;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  database = getDatabase(app);
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

export { auth, database, app };