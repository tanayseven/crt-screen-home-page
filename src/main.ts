import './reset.scss';
import { cursor, prompt } from './terminalStrings';

class TextOutput {
    text: string = ''
    showCursor: boolean = false
    append(text: string): void {
        this.text += text
    }
    set(text: string): void {
        this.text = text
    }
    trim(characters = 1): void {
        this.text = this.text.substr(0, this.text.length - characters)
    }
    showTrailingCursor(): void {
        this.showCursor = true
    }
    clear(): void {
        this.text = ''
    }
    toString(): string {
        return this.text + (this.showCursor ? cursor : '')
    }
}

class GraphicalOutput {

}

type Output = (output: TextOutput | GraphicalOutput) => {};

interface Application {
    sendInput(input: KeyboardEvent): void;
    connectOutput(output: Output): void;
    disconnectOutput(): void;
    start(): void;
}

class Shell implements Application {
    sendOutput: Output = (_) => null
    output = new TextOutput()
    consoleText: string = ''
    constructor(initialText = '') {
        this.output.showTrailingCursor()
        this.output.append(initialText)
        // this.output.append(prompt) // TODO renders the cursor badly
    }
    sendInput(input: KeyboardEvent): void {
        this.consoleText += input.key
        if (input.key === 'Enter')
            this.output.append(`\n`)
        else if (input.key === 'Backspace')
            this.output.trim()
        else
            this.output.append(input.key)
        this.sendOutput(this.output)
    }
    connectOutput(sendOutput: Output): void {
        this.sendOutput = sendOutput;
    }
    disconnectOutput() {
        this.sendOutput = (_) => null;
    }
    start(): void {
        this.sendOutput(this.output)
    }
}

const applications = {
    "shell": Shell,
}

class Computer {
    applications: Array<Application> = []
    textOutput: string = ''

    constructor() {
        this.textOutput += "Tanay OS v1992 - Open source edition\n"
        this.textOutput += "Feel free to type to know all the commands\n"
        this.startApplication(new Shell(this.textOutput));
    }

    keyEvent = (event: KeyboardEvent) => {
        console.log(`Received the input ${event.key}`);
        if (this.applications.length > 0) {
            const currentApplication = this.applications[this.applications.length - 1];
            currentApplication.sendInput(event);
        }
    }

    startApplication = (application: Application) => {
        if (this.applications.length > 0) {
            const currentApplication = this.applications[this.applications.length - 1];
            currentApplication.disconnectOutput();
        }
        this.applications.push(application);
        const currentApplication = this.applications[this.applications.length - 1];
        currentApplication.connectOutput((output: TextOutput) => this.textOutput = output.toString())
        currentApplication.start()
    }

    render(screen: HTMLPreElement) {
        if (screen.innerHTML === this.textOutput)
            return;
        screen.innerHTML = this.textOutput;
    }
}

let computerObject: Computer = null;

const screen = document.getElementById("video-memory") as HTMLPreElement;
export const initializeTerminal = () => {
    computerObject = new Computer();
    document.addEventListener('keydown', event => {
        computerObject.keyEvent(event)
        setTimeout(() => {
            console.log(`Outputted something...`);
            screen.scrollTop = screen.scrollHeight;
        }, 40)
    });
    setInterval((): void => {
        computerObject.render(screen);
    }, 20);
}
