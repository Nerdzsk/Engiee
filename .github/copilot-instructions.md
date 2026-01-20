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
- **Typ projektu**: Full-stack webová a mobilná aplikácia (turistická/hiking tracking app s Google Maps API integráciou).
- **Tech stack**: 
  - Frontend: HTML, CSS, JavaScript (možno React/Vue)
  - Backend: Node.js / Python
  - Databáza: Firebase Realtime Database / Firestore
  - Mobile: Android (Kotlin) + možné zdieľanie logiky s webom
  - Mapy a lokalizácia: Google Maps API, geolokácia
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
