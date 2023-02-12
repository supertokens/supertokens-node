// @ts-nocheck
import { HTTPMethod } from "../types";
export declare abstract class BaseRequest {
    wrapperUsed: boolean;
    original: any;
    constructor();
    abstract getKeyValueFromQuery: (key: string) => string | undefined;
    abstract getJSONBody: () => Promise<any>;
    abstract getMethod: () => HTTPMethod;
    abstract getCookieValue: (key_: string) => string | undefined;
    abstract getHeaderValue: (key: string) => string | undefined;
    abstract getOriginalURL: () => string;
    abstract getFormData: () => Promise<any>;
}
