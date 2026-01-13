# Engee3D

Jednoduchý projekt: webová 3D aplikácia (Three.js) pre robotickú hru.

Základné informácie
- Otvor `index.html` v prehliadači alebo spusti lokálny server (odporúčané).
- Projekt používa Firebase (Firestore) na ukladanie stavu hráča a položiek.

Súbory (stručne)
- `index.html` — hlavná stránka, inicializácia scény a animačná slučka.
- `angie.js` — AI avatar + typografický výstup (dialógy).
- `world.js` — generovanie miestnosti, stien, dverí, nabíjačiek.
- `controls.js` — vstupy, pohyb robota, inventár.
- `database.js` — Firebase wrapper (watch, update, repair functions).
- `items.js`, `hud.js`, `camera.js`, `pedometer.js`, `dialogues.js` — pomocné moduly.
- `config.example.js` — príklad konfigurácie Firebase.
- `config.local.js` — tvoje lokálne kľúče (MUSÍ byť v `.gitignore`).

Ako spustiť lokálne (rýchlo)
1. Skopíruj `config.example.js` ako `config.local.js` a doplň svoje Firebase kľúče.
2. Otvor `index.html` dvojklikom (rýchle), alebo spusti jednoduchý server (odporúčam):
   - Python 3: `python -m http.server 8000` v priečinku `www` a potom otvor `http://localhost:8000`.
3. Použi konzolu (F12) na sledovanie chýb a logov.

Bezpečnosť
- Nikdy necommituj `config.local.js` s kľúčmi. Použi `config.example.js` v repozitári.
- Pre GitHub push používaj Personal Access Token (PAT) alebo SSH kľúč.

Ďalšie kroky (navrhované)
- Pridať `README` rozšírený o popis assetov a workflow pre Android/Cordova.
- Pridať Git LFS ak chceš verzovať veľké modely alebo videá.

Kontakt
- Ak chceš pokračovať, napíš mi, ktorú featuru implementovať ďalej (UI, opravy, nové dialógy).
