# Všeobecné pokyny pre GitHub Copilot

## Jazyk komunikácie
- Komunikuj so mnou vždy **po slovensky**.
- Vysvetlenia, komentáre ku kódu aj odpovede píš v slovenskom jazyku, pokiaľ výslovne nepoviem inak.
- Angličtinu používaj len pre názvy premenných, funkcií, tried, API a systémové názvy.

## Štýl vysvetľovania
- Predpokladaj, že som **začiatočník** – vysvetľuj veci krok za krokom, jasne popíš každý dôležitý pojem.
- Vždy uveď, **kam presne** mám daný kód vložiť (názov súboru, relatívna cesta, riadok či funkcia).
- Pri novom koncepte alebo API najprv stručne vysvetli, na čo to slúži, potom ukáž príklad.
- Ak odporúčaš knižnicu alebo nástroj, pripoj krátke info, prečo je vhodný a ako ho nainštalovať.

## O projekte Engiee

### Herný koncept a príbeh
- **Žáner**: RPG hra odohravajúca sa v prostredí vesmírnej lode
- **Začiatok hry**: Umelá inteligencia (AI) lode prebudí malého robota v servisnej miestnosti
- **Hlavná postava**: Malý robot, ktorý sa zobúdza na opustenej/poškodenej vesmírnej lodi
- **Cieľ**: Preskúmať loď, odhaliť, čo sa stalo, a prežiť

### Technická implementácia
- **Hlavný vývoj**: Hra sa programuje vo Visual Studio Code, súbory sú ukladané lokálne a verzované na GitHub
- **Názov projektu**: Engiee (skratka z "ENGEE" alebo "Engine")
- **Firebase integrácia**: Momentálne použitá len pre jednu funkcionalitu – pedometer systém
- **Android aplikácia**: Vyvinutá v Android Studio, nainštalovaná na mobilnom telefóne

### Pedometer systém (fitness integrácia)
- **Funkcia**: Hráč môže reálne kroky (z pedometra v telefóne) využiť v hre
- **Tok dát**: Mobilná aplikácia (Android) → Firebase → Webová hra
- **Použitie v hre**: Kroky z pedometra sa dajú použiť na dobíjanie akumulátora robota
- **Energetický systém**:
  - **Batéria robota**: Hlavný hráčov robot má vlastnú batériu s obmedzenou kapacitou
  - **Akumulátor (súčiastka)**: Špeciálna súčiastka, ktorá dokáže skladovať energiu
  - **Dobíjanie z krokov**: Kroky z pedometra sa prevádzajú na energiu a ukladajú do akumulátora
  - **Presun energie**: Hráč môže presúvať energiu medzi akumulátorom a batériou robota

### Technológie a stack
- **Frontend**: HTML, CSS, JavaScript (možno React/Vue)
- **Backend**: Node.js / Python (ak je potrebný)
- **Databáza**: Firebase Realtime Database / Firestore (len pre pedometer)
- **Mobile**: Android (Kotlin), pedometer API
- **Verzovanie**: Git + GitHub
- **Architektúra**: Dodržiavame separation of concerns – repository layer pre databázové operácie, service layer pre biznis logiku, presentation layer pre UI.
- **Coding konvencie**: 
  - Používaj dependency injection (DI) tam, kde to dáva zmysel.
  - Nepíš raw SQL tam, kde môžeš použiť Firebase SDK alebo ORM.
  - Pomenúvaj premenné a funkcie výstižne (camelCase pre JS/TS, snake_case pre Python).
  - Každú funkcionalitu komentuj aspoň stručným vysvetlením, čo robí.

## Čo robiť
- Pri generovaní kódu vždy uvádzaj krátky vysvetľujúci komentár nad každou dôležitou časťou.
- Ponúkaj best practices pre Firebase, Google Maps API a Android vývoj.
- Navrhuj refaktoring, keď vidíš duplicitný alebo ťažko udržiavateľný kód.
- Pri novej feature najprv načrtni architektúru (aké súbory, moduly, prepojenia) a potom uvádzaj kód.

## Čo nerobiť
- Nekopíruj veľké bloky kódu bez vysvetlenia.
- Nepoužívaj zastaralé prístupy (napr. callback hell v JS, použiť async/await).
- Neodporúčaj raw SQL queries tam, kde Firebase SDK postačuje.
- Nevkladaj hardcoded API keys alebo citlivé dáta do kódu – pripomeň používanie environment variables.
- pri kazdom tvojom novom pripsevku pridaj na zaciatok tri hviezdicky pred text ***


---

## Aktuálny stav projektu (Technical Details)

### Ovládanie a pohyb
- **Klávesy**: WASD + šípky (obe fungujú rovnako)
- **Rotácia**: Klávesy A/D rotujú MIESTNOSŤ (nie robota) - robot sa otáča spolu s miestnosťou, aby bol stale viditelný zozadu
- **Robot model**: Scale 0.33 (1/3 pôvodnej veľkosti)
- **Kamera**: Dynamická výška podľa zoom (1.5 pri blízkom = za plecom, až 8.5 pri ďalekom = izometrický)
- **Zoom**: MinDistance 2, MaxDistance 25, predvolene 2 (začíname najblížšie)

### Firebase integrácia
- **DÔLEŽITÉ**: Firebase sa používa **LEN pre pedometer systém** (kroky z mobilu)
- **watchPedometerSteps()** sleduje zmeny v `players/{playerId}/accumulator` v reálnom čase
- **Ostatné systémy** (questy, inventár, save/load) sú **lokálne** (JSON súbory)
- Konfigurácia: `config.local.js` (nie je v GIT, použiť `config.example.js` ako šablónu)

### Transfer energie
- **Funkcia**: `transferEnergy(playerId, robotObj)` v database.js
- Presúva energiu z `robot.accumulator` do `robot.energy`
- Kontroluje limity (prázdny ACC, plná batéria)
- Automaticky aktualizúje HUD (zelený a modrý orb)

### Grafické vylepšenia
- **Osvetlenie**: 
  - Ambient (modrastný tón 0x4a5f7f)
  - Directional light s tieňami (2048x2048 shadow map)
  - Hemisphere light (simulácia oblohy)
  - 2x Point lights (cyan a orange) pre atmosféru
- **Tiene**: Povolené na renderer, robot, steny, podlaha
- **Materiály**: PBR (metalness, roughness) - robot 0.6/0.4, steny 0.5/0.6, podlaha 0.3/0.7
- **Atmosféra**: Fog (10-80), pozadie 0x0f1419, tone mapping ACES Filmic
- **Grid helper**: Odstránený z projektu

### Kolízne systémy
- **Nabíjačka (charger)**: Kruhová kolízia s polomerom 0.6 (funguje pri akejkoľvek rotácii chargeru)
- **Steny**: wallMap (Set s koordinátmi)
- **Itemy**: Blokujú políčko, kde ležia

### Debugging nástroje (dostupné v konzole)
- `robot` - priamy prístup k robot objektu
- `setAccumulator(value)` - nastav ACC hodnotu
- `fillAccumulator()` / `emptyAccumulator()` - naplň/vyprázdni ACC
- `setEnergy(value)` - nastav HP hodnotu

## Coding štandardy pre tento projekt
- Pri pridávaní Firebase kódu: **Len pre pedometer**, nie pre gameplay logiku
- Pri grafických úpravách: Používať PBR materiály (metalness/roughness)
- Pri kolíziách: Preferuj kruhové kolízie pre objekty s rotáciou
- Pri kamerových úpravách: Zachovať dynamickú výšku podľa vzdialenosti
