// Loader pre konfiguráciu Firebase
// Ak existuje `config.local.js`, importuje jeho `firebaseConfig`.
// Inak používaš tento súbor s ukážkovými/placeholder hodnotami.

let firebaseConfig = {
    apiKey: "REPLACE_WITH_YOUR_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID"
};

try {
    // top-level await je podporovaný v moderných modulech
    const local = await import('./config.local.js');
    if (local && local.firebaseConfig) {
        firebaseConfig = local.firebaseConfig;
        console.info('Loaded firebaseConfig from config.local.js');
    }
} catch (e) {
    console.warn('config.local.js not found — using placeholder values from config.js');
}

export { firebaseConfig };

