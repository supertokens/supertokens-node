export enum PROCESS_STATE {
    CALLING_SERVICE_IN_VERIFY
}

export class ProcessState {
    history: PROCESS_STATE[];
    private static instance: ProcessState | undefined;

    private constructor() {}

    static getInstance() {
        if (ProcessState.instance == undefined) {
            ProcessState.instance = new ProcessState();
        }
        return ProcessState.instance;
    }

    addState = (state: PROCESS_STATE) => {
        if (process.env.TEST_MODE === "testing") {
            this.history.push(state);
        }
    };

    private getEventByLastEventByName = (state: PROCESS_STATE) => {
        for (let i = this.history.length - 1; i >= 0; i--) {
            if (this.history[i] == state) {
                return this.history[i];
            }
        }
        return undefined;
    };

    reset = () => {
        this.history = [];
    };

    waitForEvent = async (state: PROCESS_STATE, timeInMS = 7000) => {
        let startTime = Date.now();
        return new Promise(resolve => {
            let actualThis = this;
            function tryAndGet() {
                let result = actualThis.getEventByLastEventByName(state);
                if (result === undefined) {
                    if (Date.now() - startTime > timeInMS) {
                        resolve(undefined);
                    } else {
                        setTimeout(tryAndGet, 1000);
                    }
                } else {
                    resolve(result);
                }
            }
            tryAndGet();
        });
    };
}
