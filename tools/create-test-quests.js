/**
 * tools/create-test-quest-player.js
 * 
 * Script na vytvorenie test player quest dokumentov
 * Priradí hráčovi robot1 niektoré questy aby ich mohol testovať
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

const PLAYER_QUESTS = [
  {
    playerId: 'robot1',
    questId: 'quest_restore_reactor',
    questTitle: 'Restore the Reactor Core',
    questType: 'main',
    status: 'active',
    startedAt: new Date(),
    objectivesProgress: {
      0: { completed: false, progress: 0, target: 1 },
      1: { completed: false, progress: 0, target: 5 },
      2: { completed: false, progress: 0, target: 1 }
    },
    completedAt: null
  },
  {
    playerId: 'robot1',
    questId: 'quest_energy_cells',
    questTitle: 'Collect Energy Cells',
    questType: 'side',
    status: 'active',
    startedAt: new Date(),
    objectivesProgress: {
      0: { completed: false, progress: 0, target: 10 }
    },
    completedAt: null
  },
  {
    playerId: 'robot1',
    questId: 'quest_communications',
    questTitle: 'Repair Communications System',
    questType: 'side',
    status: 'active',
    startedAt: new Date(),
    objectivesProgress: {
      0: { completed: false, progress: 0, target: 1 },
      1: { completed: false, progress: 0, target: 3 },
      2: { completed: false, progress: 0, target: 1 }
    },
    completedAt: null
  }
];

async function createPlayerQuests() {
  console.log('📌 Creating player quests for robot1...\n');
  
  try {
    for (const playerQuest of PLAYER_QUESTS) {
      const docId = `${playerQuest.playerId}_${playerQuest.questId}`;
      await db.collection('player_quests').doc(docId).set(playerQuest);
      console.log(`✓ Created: ${playerQuest.questTitle}`);
    }
    
    console.log('\n✅ All player quests created!');
    console.log('\n🎮 You can now test:');
    console.log('   - Press J to open Quest Log');
    console.log('   - See 1 MAIN quest + 2 SIDE quests');
    console.log('   - Objectives show 0 progress');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating player quests:', error);
    process.exit(1);
  }
}

createPlayerQuests();
