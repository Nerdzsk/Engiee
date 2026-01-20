import firebase_admin
from firebase_admin import credentials, firestore

# Cesta k tvojmu serviceAccountKey.json (stiahni z Firebase Console)
cred = credentials.Certificate('serviceAccountKey.json')
firebase_admin.initialize_app(cred)
db = firestore.client()

room_ref = db.collection('rooms').document('room1')
room_ref.update({
    'chargers': [{
        'id': 'charger_1',
        'x': -5,
        'z': 0,
        'isBroken': True,
        'repairCost': 50
    }]
})
print('Charger pozícia bola aktualizovaná vo Firestore.')
