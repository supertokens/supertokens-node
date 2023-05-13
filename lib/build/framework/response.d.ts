// @ts-nocheck
export declare abstract class BaseResponse {
    wrapperUsed: boolean;
    original: any;
    constructor();
    abstract setHeader: (key: string, value: string, allowDuplicateKey: boolean) => void;
    abstract removeHeader: (key: string) => void;
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
    abstract sendHTMLResponse: (html: string) => void;
}
