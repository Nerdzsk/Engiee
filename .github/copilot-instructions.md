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
