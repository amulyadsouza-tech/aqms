import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';

// TODO: Replace with your actual Firebase config from the Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyDjE8Omi0Ghqt-393nshqcHpdyNQ-7UhgI",
  authDomain: "practive-b6bbc.firebaseapp.com",
  databaseURL: "https://practive-b6bbc-default-rtdb.firebaseio.com",
  projectId: "practive-b6bbc",
  storageBucket: "practive-b6bbc.firebasestorage.app",
  messagingSenderId: "356723227013",
  appId: "1:356723227013:web:ba4567d44f27cb2875ecec",
  measurementId: "G-XYJNVBC9SB"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

export const subscribeToSensorData = (callback) => {
  const sensorRef = ref(db, 'sensors/data'); // Adjust path based on your Firebase structure
  return onValue(sensorRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      callback(data);
    }
  });
};
