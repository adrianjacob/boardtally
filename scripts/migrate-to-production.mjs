/**
 * Script to migrate data from local JSON files to production Firebase
 * Uses Firebase client SDK with anonymous auth
 * Run with: node scripts/migrate-to-production.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
const storage = getStorage(app);

async function migrateData() {
  console.log('🚀 Starting migration to production...\n');

  // Read JSON files
  const dataDir = path.join(__dirname, '..', 'data');
  const players = JSON.parse(fs.readFileSync(path.join(dataDir, 'players.json'), 'utf-8'));
  const scores = JSON.parse(fs.readFileSync(path.join(dataDir, 'scores.json'), 'utf-8'));

  // Migrate players
  console.log('📝 Migrating players...');
  for (const player of players) {
    await setDoc(doc(db, 'players', player.id), {
      name: player.name,
      color: player.color,
    });
    console.log(`  ✓ ${player.name}`);
  }
  console.log(`  Added ${players.length} players\n`);

  // Migrate scores
  console.log(`📝 Migrating ${scores.length} scores...`);
  let count = 0;
  for (const score of scores) {
    await setDoc(doc(db, 'scores', score.id), {
      date: score.date,
      gameId: score.gameId,
      gameName: score.gameName,
      expansions: score.expansions || [],
      players: score.players,
    });
    count++;
    if (count % 100 === 0) {
      console.log(`  ... ${count}/${scores.length} scores migrated`);
    }
  }
  console.log(`  ✓ Added ${scores.length} scores\n`);

  // Upload images
  console.log('🖼️  Uploading game images...');
  const imagesDir = path.join(__dirname, '..', 'public', 'game-images');
  
  if (fs.existsSync(imagesDir)) {
    const imageFiles = fs.readdirSync(imagesDir).filter(f => f.endsWith('.jpg'));
    
    for (const imageFile of imageFiles) {
      const filePath = path.join(imagesDir, imageFile);
      const fileBuffer = fs.readFileSync(filePath);
      const storageRef = ref(storage, `game-images/${imageFile}`);
      
      try {
        await uploadBytes(storageRef, fileBuffer, {
          contentType: 'image/jpeg',
          cacheControl: 'public, max-age=31536000',
        });
        console.log(`  ✓ ${imageFile}`);
      } catch (err) {
        console.log(`  ✗ ${imageFile}: ${err.message}`);
      }
    }
    console.log(`  Uploaded ${imageFiles.length} images\n`);
  } else {
    console.log('  No local images found\n');
  }

  console.log('✅ Migration complete!');
  console.log('\nYour app will be available at: https://boardtally.web.app');
  process.exit(0);
}

migrateData().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

