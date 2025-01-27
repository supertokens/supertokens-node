// @ts-nocheck
export declare enum PROCESS_STATE {
    CALLING_SERVICE_IN_VERIFY = 0,
    CALLING_SERVICE_IN_GET_API_VERSION = 1,
    CALLING_SERVICE_IN_REQUEST_HELPER = 2,
    MULTI_JWKS_VALIDATION = 3,
    IS_SIGN_IN_UP_ALLOWED_NO_PRIMARY_USER_EXISTS = 4,
    IS_SIGN_UP_ALLOWED_CALLED = 5,
    IS_SIGN_IN_ALLOWED_CALLED = 6,
    IS_SIGN_IN_UP_ALLOWED_HELPER_CALLED = 7,
    ADDING_NO_CACHE_HEADER_IN_FETCH = 8,
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
