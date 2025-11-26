/**
 * Script to migrate data from local JSON files to production Firebase
 * Run with: node scripts/migrate-to-production.cjs
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin with default credentials
// You must be logged in with: firebase login
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');

// Initialize with your project
initializeApp({
  credential: applicationDefault(),
  projectId: 'boardtally',
  storageBucket: 'boardtally.firebasestorage.app'
});

const db = getFirestore();
const storage = getStorage();
const bucket = storage.bucket();

async function migrateData() {
  console.log('🚀 Starting migration to production...\n');

  // Read JSON files
  const dataDir = path.join(__dirname, '..', 'data');
  const players = JSON.parse(fs.readFileSync(path.join(dataDir, 'players.json'), 'utf-8'));
  const scores = JSON.parse(fs.readFileSync(path.join(dataDir, 'scores.json'), 'utf-8'));

  // Migrate players
  console.log('📝 Migrating players...');
  for (const player of players) {
    await db.collection('players').doc(player.id).set({
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
    await db.collection('scores').doc(score.id).set({
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
      const destination = `game-images/${imageFile}`;
      
      try {
        await bucket.upload(filePath, {
          destination,
          metadata: {
            contentType: 'image/jpeg',
            cacheControl: 'public, max-age=31536000',
          },
        });
        
        // Make file public
        await bucket.file(destination).makePublic();
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
  console.log('\nYour app is ready at: https://boardtally.web.app');
}

migrateData().catch(console.error);

