interface Response {
    /**
     * @param {string} key
     * @param {string} value
     * @param {boolean} allowDuplicateKey
     */
    setHeader: (key: string, value: string, allowDuplicateKey: boolean) => void;
    setCookie: (
        key: string,
        value: string,
        domain: string | undefined,
        secure: boolean,
        httpOnly: boolean,
        expires: number,
        path: string,
        sameSite: "strict" | "lax" | "none"
    ) => void;
    setStatusCode: (statusCode: number) => void;
    sendJSONResponse: (content: any) => void;
}
export declare abstract class BaseResponse implements Response {
    wrapperUsed: boolean;
    constructor();
    abstract setHeader: (key: string, value: string, allowDuplicateKey: boolean) => void;
    abstract setCookie: (
        key: string,
        value: string,
        domain: string | undefined,
        secure: boolean,
        httpOnly: boolean,
        expires: number,
        path: string,
        sameSite: "strict" | "lax" | "none"
    ) => void;
    abstract setStatusCode: (statusCode: number) => void;
    abstract sendJSONResponse: (content: any) => void;
}
export {};
