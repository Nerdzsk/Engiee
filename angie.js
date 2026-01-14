// angie.js - ENGEE AI Dialogue System
// Statický avatar bez 3D animácie

let visitedOptions = [];

// ============================================================
// SECTION: Dialogue System - Typewriter Effect
// ============================================================

export function speak(dialogueObject) {
    if (!dialogueObject || typeof dialogueObject.text === 'undefined') {
        console.error("Angie Error: Funkcia speak nedostala text alebo objekt!", dialogueObject);
        return;
    }

    const ui = document.getElementById('angie-ui');
    const textElement = document.getElementById('angie-text');

    ui.classList.remove('hidden');
    textElement.innerHTML = "";
    
    if (window.angieInterval) clearInterval(window.angieInterval);

    let i = 0;
    const text = dialogueObject.text;

    window.angieInterval = setInterval(() => {
        if (i < text.length) {
            textElement.innerHTML += text.charAt(i);
            i++;
        } else {
            clearInterval(window.angieInterval);
            
            const btnContainer = document.createElement('div');
            btnContainer.className = 'angie-btn-container';

            if (dialogueObject.options && Array.isArray(dialogueObject.options)) {
                dialogueObject.options.forEach(option => {
                    const btn = document.createElement('button');
                    btn.className = 'angie-next-btn';
                    btn.innerHTML = option.text;

                    // --- NOVÁ ČASŤ: KONTROLA ZABLOKOVANIA ---
                    if (option.disabled) {
                        btn.disabled = true;
                        btn.classList.add('btn-disabled'); // Pridáme triedu pre vzhľad
                    }
                    // ---------------------------------------

                    if (option.id && visitedOptions.includes(option.id)) {
                        btn.classList.add('visited');
                    }

                    btn.onclick = (e) => {
                        // Ak je tlačidlo vypnuté, nič sa nestane
                        if (option.disabled) return;

                        e.stopPropagation();
                        if (option.id) visitedOptions.push(option.id);
                        if (option.action) option.action();

                        if (!option.next) {
                            ui.classList.add('hidden');
                            visitedOptions = []; 
                        } else {
                            speak(option.next);
                        }
                    };
                    btnContainer.appendChild(btn);
                });
            }
            textElement.appendChild(btnContainer);
        }
    }, 30);
}