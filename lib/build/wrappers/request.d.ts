import { HTTPMethod } from "../types";
interface Request {
    getKeyValueFromQuery: (key: string) => Promise<undefined | string>;
    getJSONBody: () => Promise<Object>;
    getMethod: () => HTTPMethod;
    getCookieValue: (key: string) => undefined | string;
    getHeaderValue: (key: string) => undefined | string;
    getOriginalURL: () => string;
}
export declare abstract class BaseRequest implements Request {
    constructor();
    abstract getKeyValueFromQuery: (key: string) => Promise<string | undefined>;
    abstract getJSONBody: () => Promise<any>;
    abstract getMethod: () => HTTPMethod;
    abstract getCookieValue: (key_: string) => string | undefined;
    abstract getHeaderValue: (key: string) => string | undefined;
    abstract getOriginalURL: () => string;
}
export {};
