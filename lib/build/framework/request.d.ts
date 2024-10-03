// @ts-nocheck
import { HTTPMethod } from "../types";
export declare abstract class BaseRequest {
    private parsedJSONBody;
    private parsedUrlEncodedFormData;
    wrapperUsed: boolean;
    original: any;
    constructor();
    protected abstract getJSONFromRequestBody(): Promise<any>;
    protected abstract getFormDataFromRequestBody(): Promise<any>;
    abstract getKeyValueFromQuery: (key: string) => string | undefined;
    abstract getMethod: () => HTTPMethod;
    abstract getCookieValue: (key_: string) => string | undefined;
    abstract getHeaderValue: (key: string) => string | undefined;
    abstract getOriginalURL: () => string;
    getFormData: () => Promise<any>;
    getJSONBody: () => Promise<any>;
    getBodyAsJSONOrFormData: () => Promise<any>;
}
