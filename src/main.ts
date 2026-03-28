import './main.scss';
import { bindKeyboard } from './keyboard';

const input = document.getElementById('input') as HTMLInputElement;
const output = document.getElementById('output') as HTMLDivElement;
const cursor = document.querySelector('.cursor') as HTMLElement;
const powerButton = document.getElementById('powerButton') as HTMLButtonElement;
const powerLed = document.getElementById('powerLed') as HTMLElement;
const screenEl = document.getElementById('screen') as HTMLDivElement;
const screenContent = document.getElementById('screenContent') as HTMLDivElement;
const powerOverlay = document.getElementById('powerOverlay') as HTMLDivElement;
let commandHistory: string[] = [];
let isPowerOn: boolean = true;
let isShuttingDown: boolean = false;
const bootLines: string[] = [
    '> Tanay OS v0.1 initializing...',
    '> Loading command processor...',
    '> Ready for input.',
    '> Type \'help\' for available commands.',
];
type TerminalMode = 'working' | 'ready-for-input';
let terminalMode: TerminalMode = 'ready-for-input';

function setMode(mode: TerminalMode): void {
    terminalMode = mode;
    if (mode === 'ready-for-input') {
        input.focus();
    }
}

// Power button functionality
powerButton.addEventListener('click', () => {
    if (isShuttingDown) return;

    if (isPowerOn) {
        // Turn off - show shutdown sequence first
        isShuttingDown = true;
        const shutdownLines = [
            '> Received a shutdown command',
            '> Saving files',
            '> Killing all the background programs',
        ];
        addLinesSequentially(shutdownLines, 0, () => {
            isShuttingDown = false;
            screenContent.classList.add('turning-off');
            screenContent.classList.remove('turning-on');
            powerLed.classList.remove('on');

            setTimeout(() => {
                screenContent.classList.remove('turning-off');
                screenContent.classList.add('powered-off');
                output.innerHTML = '';
                isPowerOn = false;
            }, 800);
        });
    } else {
        // Turn on
        screenContent.classList.remove('powered-off');
        screenContent.classList.add('turning-on');
        powerLed.classList.add('on');

        setTimeout(() => {
            screenContent.classList.remove('turning-on');
            isPowerOn = true;
            addLinesSequentially(bootLines);
        }, 1200);
    }
});

// Initialize power LED as on
powerLed.classList.add('on');

// Update cursor position based on input
function updateCursor(): void {
    const text: string = input.value;
    const canvas: HTMLCanvasElement = document.createElement('canvas');
    const context = canvas.getContext('2d') as CanvasRenderingContext2D;
    context.font = getComputedStyle(input).font;
    const width: number = context.measureText(text).width;
    cursor.style.left = width + 'px';
}

input.addEventListener('input', updateCursor);
input.addEventListener('click', updateCursor);
input.addEventListener('keyup', updateCursor);

type CommandHandler = (args: string[]) => string[] | null;

const commands: Record<string, CommandHandler> = {
    help: (_args: string[]): string[] => {
        return [
            'Available commands:',
            '  help     - Show this help message',
            '  clear    - Clear the screen',
            '  time     - Display current time',
            '  date     - Display current date',
            '  status   - Show system status',
            '  matrix   - Enter the Matrix',
            '  hello    - Greeting',
            '  echo     - Echo your message'
        ];
    },
    clear: (_args: string[]): null => {
        output.innerHTML = '';
        return null;
    },
    time: (_args: string[]): string[] => {
        return ['Current time: ' + new Date().toLocaleTimeString()];
    },
    date: (_args: string[]): string[] => {
        return ['Current date: ' + new Date().toLocaleDateString()];
    },
    status: (_args: string[]): string[] => {
        return [
            'Tanay OS Status:',
            '  Version: 0.1',
            '  CPU: 12% | RAM: 45% | DISK: 67%',
            '  Network: ONLINE',
            '  Temperature: 42°C',
            '  Uptime: 42 days, 13 hours'
        ];
    },
    hello: (_args: string[]): string[] => {
        return ['Hello, User! Welcome to Tanay OS v0.1'];
    },
    matrix: (_args: string[]): string[] => {
        const chars: string = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ01';
        const result: string[] = [];
        for (let i: number = 0; i < 5; i++) {
            let line: string = '';
            for (let j: number = 0; j < 40; j++) {
                line += chars[Math.floor(Math.random() * chars.length)];
            }
            result.push(line);
        }
        return result;
    },
    echo: (args: string[]): string[] => {
        return [args.join(' ') || 'Echo: (nothing to echo)'];
    }
};

function executeCommand(cmd: string): void {
    const parts: string[] = cmd.trim().split(' ');
    const command: string = parts[0].toLowerCase();
    const args: string[] = parts.slice(1);

    // Queue of lines to be displayed
    const linesToAdd: string[] = ['tanay@os:~$ ' + cmd];

    if (commands[command]) {
        const result: string[] | null = commands[command](args);
        if (result) {
            linesToAdd.push(...result);
        }
    } else if (cmd.trim()) {
        linesToAdd.push('Command not found: ' + command);
        linesToAdd.push('Type "help" for available commands.');
    }

    linesToAdd.push('');

    // Display lines sequentially
    addLinesSequentially(linesToAdd);
}

// Function to add lines one after another
function addLinesSequentially(lines: string[], index: number = 0, onComplete?: () => void): void {
    if (index === 0 && lines.length > 0) {
        setMode('working');
    }

    if (index >= lines.length) {
        output.scrollTop = output.scrollHeight;
        if (onComplete) {
            onComplete();
        } else {
            setMode('ready-for-input');
        }
        return;
    }

    const line: HTMLDivElement = document.createElement('div');
    line.className = 'line';
    line.textContent = ''; // Start with empty text
    output.appendChild(line);

    // Type text character by character
    if (lines[index].length > 0) {
        let charIndex: number = 0;
        const typingSpeed: number = 1000 / 120; // 120 characters per second

        const typeNextChar = (): void => {
            if (charIndex < lines[index].length) {
                line.textContent += lines[index].charAt(charIndex);
                charIndex++;
                output.scrollTop = output.scrollHeight;
                setTimeout(typeNextChar, typingSpeed);
            } else {
                // Move to the next line after this one is complete
                setTimeout(() => {
                    addLinesSequentially(lines, index + 1, onComplete);
                }, 100); // Small delay between lines
            }
        };

        typeNextChar();
    } else {
        // Empty line, move to the next immediately
        setTimeout(() => {
            addLinesSequentially(lines, index + 1, onComplete);
        }, 100);
    }

    output.scrollTop = output.scrollHeight;
}

// Function to add a single line with typing effect
function addLine(text: string): void {
    // Use our sequential function with just one line
    addLinesSequentially([text]);
}

input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
        if (terminalMode === 'working') return;
        const cmd: string = input.value;
        if (cmd.trim()) {
            commandHistory.push(cmd);
            executeCommand(cmd);
        }
        input.value = '';
        updateCursor();
    }
});

// Random flicker effect
setInterval(() => {
    if (Math.random() > 0.95 && isPowerOn) {
        const flicker = document.querySelector('.flicker') as HTMLElement;
        flicker.style.opacity = String(Math.random() * 0.5 + 0.5);
        setTimeout(() => {
            flicker.style.opacity = '1';
        }, 50);
    }
}, 100);

// Auto-focus input
document.addEventListener('click', (e: MouseEvent) => {
    if (isPowerOn && (e.target as HTMLElement).id !== 'powerButton') {
        input.focus();
    }
});

// Apply typing effect to initial text when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Clear the initial text from HTML
    output.innerHTML = '';

    // Add all lines sequentially with typing effect
    addLinesSequentially(bootLines);

    // Bind the on-screen QWERTY keyboard (visible only in responsive/mobile mode)
    const keyboardEl = document.getElementById('keyboard') as HTMLElement;
    if (keyboardEl) {
        bindKeyboard(keyboardEl, input, () => {
            if (terminalMode === 'working') return;
            const cmd: string = input.value;
            if (cmd.trim()) {
                commandHistory.push(cmd);
                executeCommand(cmd);
            }
            input.value = '';
            updateCursor();
        });
    }
});
