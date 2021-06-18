import './reset.scss';


class Computer {
    readonly videoMemory: HTMLPreElement
    constructor(videoMemory: HTMLPreElement) {
        this.videoMemory = videoMemory;
        this.videoMemory.innerHTML = `
Tanay OS v1992 - Open source edition
Feel free to type "help" to know all the commands
Prompt><span class="blinking-cursor">█</span>
hello
        `;
    }
}

let computerObject: Computer = null;

export const initializeTerminal = () => {
    console.log("Initializing...");
    computerObject = new Computer(document.getElementById("video-memory") as HTMLPreElement);
}
