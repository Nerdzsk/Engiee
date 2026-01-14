// Pomocný skript na pridanie test battery_pack itemu do Firestore
// Spustite: node tools/add-test-item.js

const admin = require('firebase-admin');

// Inicializácia Firebase Admin (potrebujete serviceAccount.json)
const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT || '{}');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function addTestBatteryPack() {
    try {
        // Pridáme battery_pack item do collection 'items'
        const itemRef = await db.collection('items').add({
            type: 'battery_pack',
            location: 'room1',
            status: 'on_ground',
            coords: {
                x: 3,
                z: 3
            },
            value: 100,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log('✓ Battery Pack úspešne pridaný s ID:', itemRef.id);
        console.log('  Pozícia: x=3, z=3');
        console.log('  Hodnota: 100 jednotiek energie');
    } catch (error) {
        console.error('Chyba pri pridávaní itemu:', error);
    }

    process.exit(0);
}

addTestBatteryPack();
