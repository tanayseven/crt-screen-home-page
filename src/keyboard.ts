/**
 * keyboard.ts
 * Handles the on-screen QWERTY keyboard behaviour for responsive/mobile mode.
 * Bind to the DOM via bindKeyboard() exported below.
 */

type KeyboardLayer = 'alpha' | 'numbers' | 'symbols';

const NUMBER_KEYS: string[][] = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['-', '/', ':', ';', '(', ')', '$', '&', '@', '"'],
    ['.', ',', '?', '!', "'", 'Backspace'],
    ['numbers', ' ', 'symbols'],
];

const SYMBOL_KEYS: string[][] = [
    ['[', ']', '{', '}', '#', '%', '^', '*', '+', '='],
    ['_', '\\', '|', '~', '<', '>', '€', '£', '¥', '•'],
    ['.', ',', '?', '!', "'", 'Backspace'],
    ['numbers', ' ', 'symbols'],
];

const ALPHA_KEYS: string[][] = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'Backspace'],
    ['Shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'Enter'],
    ['numbers', ' ', 'symbols'],
];

/** Label map for special keys */
const KEY_LABELS: Record<string, string> = {
    Backspace: '⌫',
    Enter: '↵',
    Shift: '⇧',
    numbers: '123',
    symbols: '!@#',
    ' ': 'SPACE',
};

/** CSS modifier classes for special keys */
const KEY_CLASSES: Record<string, string> = {
    Backspace: 'key--backspace',
    Enter: 'key--enter',
    Shift: 'key--shift',
    numbers: 'key--numbers',
    symbols: 'key--symbols',
    ' ': 'key--space',
};

export function bindKeyboard(
    keyboardEl: HTMLElement,
    targetInput: HTMLInputElement,
    onEnter: () => void
): void {
    let shiftActive = false;
    let currentLayer: KeyboardLayer = 'alpha';

    /** Rebuild the keyboard DOM for the given layer */
    function renderLayer(layer: KeyboardLayer): void {
        keyboardEl.innerHTML = '';

        const rows =
            layer === 'numbers' ? NUMBER_KEYS :
            layer === 'symbols' ? SYMBOL_KEYS :
            ALPHA_KEYS;

        rows.forEach((rowKeys) => {
            const rowEl = document.createElement('div');
            rowEl.className = 'keyboard-row';

            rowKeys.forEach((keyValue) => {
                const btn = document.createElement('button');
                btn.className = 'key';

                const extraClass = KEY_CLASSES[keyValue];
                if (extraClass) btn.classList.add(extraClass);

                // Determine display label
                let label = KEY_LABELS[keyValue] ?? keyValue.toUpperCase();
                if (layer === 'alpha' && shiftActive && keyValue.length === 1) {
                    label = keyValue.toUpperCase();
                } else if (layer === 'alpha' && !shiftActive && keyValue.length === 1) {
                    label = keyValue.toUpperCase(); // always show uppercase label
                }

                btn.textContent = label;
                btn.dataset['key'] = keyValue;
                btn.setAttribute('type', 'button'); // prevent form submission

                // Mark shift as active visually
                if (keyValue === 'Shift' && shiftActive) {
                    btn.classList.add('key--active');
                }

                // Mark layer-switch buttons
                if (keyValue === 'numbers' && layer === 'numbers') {
                    btn.classList.add('key--active');
                }
                if (keyValue === 'symbols' && layer === 'symbols') {
                    btn.classList.add('key--active');
                }

                btn.addEventListener('pointerdown', (e) => {
                    e.preventDefault(); // prevent input blur
                    handleKeyPress(keyValue, btn);
                });

                rowEl.appendChild(btn);
            });

            keyboardEl.appendChild(rowEl);
        });
    }

    /** Flash the pressed key briefly */
    function flashKey(btn: HTMLButtonElement): void {
        btn.classList.add('key--pressed');
        setTimeout(() => btn.classList.remove('key--pressed'), 120);
    }

    /** Core key-press handler */
    function handleKeyPress(keyValue: string, btn: HTMLButtonElement): void {
        flashKey(btn);

        switch (keyValue) {
            case 'Shift':
                shiftActive = !shiftActive;
                renderLayer('alpha');
                return;

            case 'numbers':
                currentLayer = currentLayer === 'numbers' ? 'alpha' : 'numbers';
                shiftActive = false;
                renderLayer(currentLayer);
                return;

            case 'symbols':
                currentLayer = currentLayer === 'symbols' ? 'alpha' : 'symbols';
                shiftActive = false;
                renderLayer(currentLayer);
                return;

            case 'Backspace': {
                const start = targetInput.selectionStart ?? targetInput.value.length;
                const end = targetInput.selectionEnd ?? targetInput.value.length;
                if (start !== end) {
                    // Delete selection
                    targetInput.value =
                        targetInput.value.slice(0, start) + targetInput.value.slice(end);
                    targetInput.setSelectionRange(start, start);
                } else if (start > 0) {
                    targetInput.value =
                        targetInput.value.slice(0, start - 1) + targetInput.value.slice(start);
                    targetInput.setSelectionRange(start - 1, start - 1);
                }
                targetInput.dispatchEvent(new Event('input'));
                break;
            }

            case 'Enter':
                onEnter();
                break;

            default: {
                const char =
                    shiftActive && keyValue.length === 1
                        ? keyValue.toUpperCase()
                        : keyValue;

                const start = targetInput.selectionStart ?? targetInput.value.length;
                const end = targetInput.selectionEnd ?? targetInput.value.length;
                targetInput.value =
                    targetInput.value.slice(0, start) + char + targetInput.value.slice(end);
                targetInput.setSelectionRange(start + char.length, start + char.length);
                targetInput.dispatchEvent(new Event('input'));

                // Auto-reset shift after one character
                if (shiftActive) {
                    shiftActive = false;
                    renderLayer('alpha');
                }
                break;
            }
        }

        // Keep focus on the input after every key press
        targetInput.focus();
    }

    // Initial render
    renderLayer(currentLayer);
}
