import './reset.scss';
import { cursor, prompt } from './terminalStrings';

const entityMap = new Map<string, string>(Object.entries({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "/": '&#x2F;'
}))

export function escapeHtml(source: string) {
    return String(source).replace(/[&<>"'\/]/g, (s: string) => entityMap.get(s)!);
}

class Computer {
    terminalText = [
        `Tanay OS v1992 - Open source edition`,
        `Feel free to type "help" to know all the commands`,
        `${prompt}`
    ]
    keyboardListener = (event: KeyboardEvent) => {
        this.terminalText[this.terminalText.length - 1] += event.key;
    };
    constructor() {
        document.addEventListener('keypress', this.keyboardListener);
    }
    render(screen: HTMLPreElement) {
        const escapedTerminalText = this.terminalText.map(e => escapeHtml(e))
        const textToBeRendered = escapedTerminalText.join('\n') + cursor;
        if (screen.innerHTML === textToBeRendered)
            return;
        console.log(screen.innerHTML + '\n' + textToBeRendered);
        screen.innerHTML = textToBeRendered;
    }
}

let computerObject: Computer = null;

const screen = document.getElementById("video-memory") as HTMLPreElement;
export const initializeTerminal = () => {
    console.log("Initializing...");
    computerObject = new Computer();
    setInterval((): void => {
        computerObject.render(screen);
    }, 20);
}
