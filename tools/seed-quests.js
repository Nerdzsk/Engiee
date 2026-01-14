/**
 * tools/seed-quests.js
 * 
 * Seed script na vytvorenie testovacích questov v Firestore
 * 
 * Usage:
 *  - Mať nastaveného Firebase admin (ako v seed-firestore.js)
 *  - Run: node tools/seed-quests.js
 *  
 * Vytvorí:
 *  - 1 MAIN quest (Restore Reactor Core)
 *  - 2 SIDE quests (Collect Energy Cells, Repair Communications)
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
    console.error('Set SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS env var.');
    process.exit(1);
  }
}

const db = admin.firestore();

// Quest dáta
const QUESTS = [
  {
    id: 'quest_restore_reactor',
    title: 'Restore the Reactor Core',
    type: 'main',
    description: 'The facility\'s reactor core is offline. We need to repair it to restore power to the entire complex. This is critical for our survival.',
    objectives: [
      { id: 'obj_1', desc: 'Access the Reactor Chamber', target: 1 },
      { id: 'obj_2', desc: 'Repair circuit boards', target: 5 },
      { id: 'obj_3', desc: 'Restore power sequence', target: 1 }
    ],
    rewards: {
      xp: 500,
      items: [{ type: 'keycard', count: 1 }],
      skillPoints: 1
    },
    requirements: {
      level: 1,
      skills: { I: 3 }
    }
  },
  {
    id: 'quest_energy_cells',
    title: 'Collect Energy Cells',
    type: 'side',
    description: 'Help me gather spare energy cells from the storage rooms. These will help us power critical systems.',
    objectives: [
      { id: 'obj_1', desc: 'Collect energy cells', target: 10 }
    ],
    rewards: {
      xp: 150,
      items: [{ type: 'battery_pack', count: 3 }],
      skillPoints: 0
    },
    requirements: {
      level: 1,
      skills: {}
    }
  },
  {
    id: 'quest_communications',
    title: 'Repair Communications System',
    type: 'side',
    description: 'The communications array is down. Repair it so we can reach other facilities or get help from the surface.',
    objectives: [
      { id: 'obj_1', desc: 'Find the communications hub', target: 1 },
      { id: 'obj_2', desc: 'Replace damaged components', target: 3 },
      { id: 'obj_3', desc: 'Recalibrate the array', target: 1 }
    ],
    rewards: {
      xp: 250,
      items: [{ type: 'battery_pack', count: 1 }],
      skillPoints: 0
    },
    requirements: {
      level: 3,
      skills: { I: 4 }
    }
  },
  {
    id: 'quest_server_exploration',
    title: 'Explore the Server Room',
    type: 'side',
    description: 'The server room might contain important data about the facility\'s history. Go explore and gather information.',
    objectives: [
      { id: 'obj_1', desc: 'Reach the server room', target: 1 },
      { id: 'obj_2', desc: 'Access terminals', target: 3 }
    ],
    rewards: {
      xp: 100,
      items: [],
      skillPoints: 0
    },
    requirements: {
      level: 2,
      skills: { I: 5 }
    }
  }
];

async function seedQuests() {
  console.log('🌱 Seeding quests...\n');
  
  try {
    for (const quest of QUESTS) {
      await db.collection('quests').doc(quest.id).set(quest, { merge: true });
      console.log(`✓ Created quest: ${quest.title} (${quest.type})`);
    }
    
    console.log('\n✅ All quests seeded successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Main quests: 1`);
    console.log(`   - Side quests: 3`);
    console.log(`   - Total rewards: 1000 XP`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding quests:', error);
    process.exit(1);
  }
}

seedQuests();
