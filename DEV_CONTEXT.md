# Engee3D — Developer Context

Krátky súhrn pre rýchlu orientáciu (na účely spolupráce a nástrojov).

## Účel repozitára
- Webová hra / demo založené na Three.js a Firebase (Firestore). Klient je čistý ES module + importmap bez bundlera.

## Ako spustiť lokálne (rýchlo)
- Otvoriť `index.html` cez lokálny server (Live Server alebo):
  - `python -m http.server 5500` (v priečinku `www`) a prejsť na `http://127.0.0.1:5500`
- Konfigurácia Firebase sa načítava z `config.local.js` (není v GIT). Skontroluj `config.example.js`.

## Dôležité súbory
- `index.html` — hlavný vstup; obsahuje importmap a načítava `app.js`.
- `app.js` — hlavná aplikácia (scéna, render loop, integrácia s DB a subsystémami).
- `config.js`, `config.local.js`, `config.example.js` — Firebase config; `config.local.js` je ignorovaný v .gitignore.
- `database.js` — wrapper pre Firestore operácie (watchRoom, watchItems, watchPlayer, update functions).
- `world.js` — generovanie miestností, dverí, nabíjačiek a ich stavov.
- `items.js`, `angie.js`, `hud.js`, `controls.js`, `camera.js` — herné subsystémy (itemy, UI hovorenie, HUD, input, kamera).
- `assets/` — 3D modely, obrázky, video.

## Firestore — aktuálna schéma (z konzoly)
- Kolekcie: `players`, `rooms`, `ship_data`.
- `players/{playerId}` (príklad `robot1`):
  - `accumulator` (number)
  - `accumulatorMax` (number)
  - `energy` (number)
  - `maxEnergy` (number)
  - `positionX`, `positionZ` (number)
  - `seenDialogues` (array[string])
  - `serviceActive` (bool)
  - `steps_sync`, `storyStep` (number)
- `rooms/{roomId}` (príklad `room1`):
  - `width`, `depth`, `name`, `walls` (array)
  - `doors` (array of maps: id, x, z, isBroken, repairCost, rotation)
  - `chargers` (array of maps: id, isBroken, repairCost, position...)

Poznámka: schéma je flexibilná (používa sa množstvo polí v objektoch). Pre robustnosť odporúčam držať konzistenciu tvarov (napr. `position: {x,z}` namiesto samostatných polí), ale nie je to nutné teraz.

## Bezpečnosť / pravidlá
- Aktuálne Firestore pravidlá v konzole sú veľmi otvorené (dočasné pravidlo umožňujúce read/write do určitého dátumu). To je riziko v produkcii.
- Odporúčanie: pridať `firestore.rules` do repo a nastaviť pravidlá, ktoré povoľujú klientovi zápis iba svojmu dokumentu (`request.auth.uid == playerId`) alebo zakázať klientský zápis a použiť Admin SDK / Cloud Functions.

## Návrhy krátkodobo
- Pridať `firestore.rules` s jednoduchými pravidlami.
- Pridať Firebase Emulator + seed skript (`tools/seed-firestore.js`) pre lokálny vývoj.
- Presunúť citlivé operácie (napr. platby/seed/masívne update) do admin skriptu.

## Kde ďalej upraviť (typické zmeny)
- Ak pridáš nové kolekcie alebo zmeníš polia, uprav `database.js` (watch/transform) a `app.js` ktorý transformy využíva.
- Ak meníš 3D modely, pridaj ich do `assets/` a aktualizuj cesty v `app.js`/`world.js`.

## Checkpointy a commity
- Keď robíš zmeny v `config.js`/`config.local.js`, uisti sa, že `config.local.js` zostane v `.gitignore`.

## Kontakty / poznámky
- Ak chceš, vytvorím: `firestore.rules` + `firebase.json` + `tools/seed-firestore.js`.

---
Súbor vytvorený na zlepšenie viditeľnosti projektu pri ďalšej spolupráci.
