/**
 * tools/cleanup-test-quests.js
 * 
 * Vymaže testovacie questy z Firestore
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const PROJECT = process.env.FIREBASE_PROJECT || process.env.GCLOUD_PROJECT || undefined;
const SA_PATH = process.env.SERVICE_ACCOUNT || process.env.GOOGLE_APPLICATION_CREDENTIALS;

let serviceAccount = null;
if (SA_PATH && fs.existsSync(SA_PATH)) {
  serviceAccount = require(path.resolve(SA_PATH));
}

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: PROJECT || serviceAccount.project_id
  });
} else {
  try {
    admin.initializeApp();
  } catch (err) {
    console.error('❌ Firebase admin initialization failed.');
    process.exit(1);
  }
}

const db = admin.firestore();

// Testovacie quest IDs na vymazanie
const TEST_QUEST_IDS = [
  'quest_restore_reactor',
  'quest_energy_cells',
  'quest_communications',
  'quest_server_exploration'
];

async function cleanupTestQuests() {
  console.log('🧹 Cleaning up test quests...\n');
  
  try {
    // 1. Vymazať z quests kolekcie
    console.log('Deleting from quests collection:');
    for (const questId of TEST_QUEST_IDS) {
      await db.collection('quests').doc(questId).delete();
      console.log(`  ✓ Deleted: ${questId}`);
    }
    
    // 2. Vymazať z player_quests kolekcie (pre robot1)
    console.log('\nDeleting from player_quests collection:');
    for (const questId of TEST_QUEST_IDS) {
      const playerQuestId = `robot1_${questId}`;
      await db.collection('player_quests').doc(playerQuestId).delete();
      console.log(`  ✓ Deleted: ${playerQuestId}`);
    }
    
    console.log('\n✅ All test quests cleaned up!');
    console.log('\n📋 Remaining quests:');
    console.log('   - quest_where_am_i (main quest)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error cleaning up:', error);
    process.exit(1);
  }
}

cleanupTestQuests();
