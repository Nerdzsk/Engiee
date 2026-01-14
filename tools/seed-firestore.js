/**
 * tools/seed-firestore.js
 * Usage:
 *  - Install dependencies: `npm install firebase-admin` (in repo or globally)
 *  - Provide service account JSON via env `GOOGLE_APPLICATION_CREDENTIALS` or `SERVICE_ACCOUNT` path
 *  - Run: `node tools/seed-firestore.js`
 *
 * The script reads `tools/seed-skills.json` and writes it into
 * `players/robot1` document using admin credentials (merge true).
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const PROJECT = process.env.FIREBASE_PROJECT || process.env.GCLOUD_PROJECT || undefined;
const SA_PATH = process.env.SERVICE_ACCOUNT || process.env.GOOGLE_APPLICATION_CREDENTIALS;
const SEED_PATH = path.join(__dirname, 'seed-skills.json');

if (!fs.existsSync(SEED_PATH)) {
  console.error('Seed file not found:', SEED_PATH);
  process.exit(1);
}

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
  // Try default application credentials (e.g., GOOGLE_APPLICATION_CREDENTIALS set)
  try {
    admin.initializeApp();
  } catch (err) {
    console.error('No service account provided and default credentials failed to initialize.');
    console.error('Set SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS env var to path of service account JSON.');
    process.exit(1);
  }
}

const db = admin.firestore();

async function seed() {
  try {
    const raw = fs.readFileSync(SEED_PATH, 'utf8');
    const data = JSON.parse(raw);

    const docRef = db.doc('players/robot1');
    console.log('Seeding players/robot1 with:', Object.keys(data));
    await docRef.set(data, { merge: true });
    console.log('Seed completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(2);
  }
}

seed();
