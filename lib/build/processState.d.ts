// @ts-nocheck
export declare enum PROCESS_STATE {
    CALLING_SERVICE_IN_VERIFY = 0,
    CALLING_SERVICE_IN_GET_API_VERSION = 1,
    CALLING_SERVICE_IN_REQUEST_HELPER = 2,
}
export declare class ProcessState {
    history: PROCESS_STATE[];
    private static instance;
    private constructor();
    static getInstance(): ProcessState;
    addState: (state: PROCESS_STATE) => void;
    private getEventByLastEventByName;
    reset: () => void;
    waitForEvent: (state: PROCESS_STATE, timeInMS?: number) => Promise<unknown>;
}
