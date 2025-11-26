/**
 * Script to pull production data into local JSON files
 * Run with: pnpm pull
 * 
 * This fetches all players and scores from production Firestore
 * and saves them to data/players.json and data/scores.json
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase configuration (production)
const firebaseConfig = {
  apiKey: "AIzaSyDtaqgpJsUXIECxPWV98DIKgp2t95XLktQ",
  authDomain: "boardtally.firebaseapp.com",
  projectId: "boardtally",
  storageBucket: "boardtally.firebasestorage.app",
  messagingSenderId: "67917777022",
  appId: "1:67917777022:web:6df05966814d43ff43702f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function pullFromProd() {
  console.log('⬇️  Pulling data from production...\n');

  const dataDir = path.join(__dirname, '..', 'data');

  // Fetch players
  console.log('📝 Fetching players...');
  const playersSnapshot = await getDocs(collection(db, 'players'));
  const players = playersSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  console.log(`  Found ${players.length} players`);

  // Save players
  fs.writeFileSync(
    path.join(dataDir, 'players.json'),
    JSON.stringify(players, null, 2)
  );
  console.log('  ✓ Saved to data/players.json\n');

  // Fetch scores (ordered by date desc)
  console.log('📝 Fetching scores...');
  const scoresQuery = query(collection(db, 'scores'), orderBy('date', 'desc'));
  const scoresSnapshot = await getDocs(scoresQuery);
  const scores = scoresSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  console.log(`  Found ${scores.length} scores`);

  // Save scores
  fs.writeFileSync(
    path.join(dataDir, 'scores.json'),
    JSON.stringify(scores, null, 2)
  );
  console.log('  ✓ Saved to data/scores.json\n');

  console.log('✅ Pull complete!');
  console.log('\nNext steps:');
  console.log('  1. Start emulators: pnpm emulators');
  console.log('  2. Seed local data: pnpm seed');
  console.log('  3. Start dev server: pnpm dev');
  
  process.exit(0);
}

pullFromProd().catch(err => {
  console.error('Pull failed:', err);
  process.exit(1);
});

