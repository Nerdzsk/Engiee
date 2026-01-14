/**
 * tools/seed-main-quest.js
 * 
 * Script na vytvorenie hlavného questu "Kde to som" so substages
 * - Main Quest: "Kde to som" (iniciuje sa po INTRO dialógu)
 *   - Substage 1: "Oprav nabijaciu stanicu" (100 XP)
 *   - Substage 2: [budúcnosť]
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

const MAIN_QUEST = {
  id: 'quest_where_am_i',
  title: 'Kde to som',
  type: 'main',
  description: 'You woke up in a mysterious facility with no memory. You must understand your surroundings and get the systems back online.',
  triggerDialog: 'INTRO', // Aktivuje sa po tomto dialógu
  // Objektívy pre hlavný quest (tracking progress)
  objectives: [
    {
      id: 'obj_1',
      desc: 'Repair the broken charger',
      target: 1
    }
    // Budúce objektívy/etapy
  ],
  // Rewards pre completion (štandardná štruktúra)
  rewards: {
    xp: 100,
    items: [],
    skillPoints: 0
  },
  // Substages informácia (pre referenčné účely)
  substages: [
    {
      id: 'stage_1_repair_charger',
      title: 'Oprav nabijaciu stanicu',
      description: 'The charging station is broken. You need to repair it to recharge your batteries.',
      objectives: [
        { id: 'obj_1', desc: 'Repair the broken charger', target: 1 }
      ],
      rewards: {
        xp: 100,
        items: [],
        skillPoints: 0
      },
      triggerAction: 'repair_charger',
      status: 'active'
    },
    // Budúce substages budú prídané tu
  ],
  requirements: {
    level: 1,
    skills: {}
  }
};

async function seedMainQuest() {
  console.log('🌱 Seeding main quest "Kde to som"...\n');
  
  try {
    // Vytvor quest v kolekcii quests
    await db.collection('quests').doc(MAIN_QUEST.id).set(MAIN_QUEST, { merge: true });
    console.log(`✓ Created main quest: ${MAIN_QUEST.title}`);
    console.log(`  - Triggers on dialog: ${MAIN_QUEST.triggerDialog}`);
    console.log(`  - Substage 1: ${MAIN_QUEST.substages[0].title}`);
    console.log(`  - Rewards: ${MAIN_QUEST.substages[0].rewards.xp} XP`);
    
    console.log('\n✅ Main quest seeded successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Quest ID: ${MAIN_QUEST.id}`);
    console.log(`   - Trigger: After ${MAIN_QUEST.triggerDialog} dialog`);
    console.log(`   - Substages: ${MAIN_QUEST.substages.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding main quest:', error);
    process.exit(1);
  }
}

seedMainQuest();
