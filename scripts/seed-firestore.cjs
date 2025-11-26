/**
 * Seed script to populate Firestore emulator with data from JSON files.
 * 
 * Usage:
 *   1. Start the Firebase emulators: firebase emulators:start
 *   2. In another terminal: node scripts/seed-firestore.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin with emulator settings
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_STORAGE_EMULATOR_HOST = 'localhost:9199';

admin.initializeApp({
  projectId: 'boardtally-dev',
  storageBucket: 'boardtally-dev.appspot.com',
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function seedData() {
  console.log('🌱 Seeding Firestore with data...\n');

  // Read JSON files
  const dataDir = path.join(__dirname, '..', 'data');
  const players = JSON.parse(fs.readFileSync(path.join(dataDir, 'players.json'), 'utf-8'));
  const scores = JSON.parse(fs.readFileSync(path.join(dataDir, 'scores.json'), 'utf-8'));

  // Seed players
  console.log('📝 Adding players...');
  const playersRef = db.collection('players');
  for (const player of players) {
    await playersRef.doc(player.id).set({
      name: player.name,
      color: player.color,
    });
    console.log(`  ✓ ${player.name}`);
  }
  console.log(`  Added ${players.length} players\n`);

  // Seed scores
  console.log('📝 Adding scores...');
  const scoresRef = db.collection('scores');
  for (const score of scores) {
    await scoresRef.doc(score.id).set({
      date: score.date,
      gameId: score.gameId,
      gameName: score.gameName,
      expansions: score.expansions || [],
      players: score.players,
    });
    console.log(`  ✓ ${score.gameName} (${score.date})`);
  }
  console.log(`  Added ${scores.length} scores\n`);

  // Upload game images to Storage emulator
  console.log('🖼️  Uploading game images...');
  const imagesDir = path.join(__dirname, '..', 'public', 'game-images');
  
  if (fs.existsSync(imagesDir)) {
    const imageFiles = fs.readdirSync(imagesDir).filter(f => f.endsWith('.jpg'));
    
    for (const imageFile of imageFiles) {
      const imagePath = path.join(imagesDir, imageFile);
      const destination = `game-images/${imageFile}`;
      
      try {
        await bucket.upload(imagePath, {
          destination,
          metadata: {
            contentType: 'image/jpeg',
          },
        });
        // Make file public
        await bucket.file(destination).makePublic();
        console.log(`  ✓ ${imageFile}`);
      } catch (error) {
        console.log(`  ✗ ${imageFile}: ${error.message}`);
      }
    }
    console.log(`  Uploaded ${imageFiles.length} images\n`);
  } else {
    console.log('  No images directory found, skipping...\n');
  }

  console.log('✅ Seeding complete!');
  process.exit(0);
}

seedData().catch((error) => {
  console.error('Error seeding data:', error);
  process.exit(1);
});

