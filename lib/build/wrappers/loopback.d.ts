import { MiddlewareContext } from "@loopback/rest";
import { HTTPMethod } from "../types";
import { BaseRequest } from "./request";
export declare class LoopbackRequest extends BaseRequest {
    private request;
    private parserChecked;
    constructor(ctx: MiddlewareContext);
    getKeyValueFromQuery: (key: string) => Promise<string | undefined>;
    getJSONBody: () => Promise<any>;
    getMethod: () => HTTPMethod;
    getCookieValue: (key: string) => string | undefined;
    getHeaderValue: (key: string) => string | undefined;
    getOriginalURL: () => string;
}
