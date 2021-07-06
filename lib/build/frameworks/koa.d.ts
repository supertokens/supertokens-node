import { Context } from "koa";
import { HTTPMethod } from "../types";
import { BaseRequest } from "./request";
export declare class KoaRequest extends BaseRequest {
    private ctx;
    private parsedJSONBody;
    constructor(ctx: Context);
    getKeyValueFromQuery: (key: string) => Promise<string | undefined>;
    getJSONBody: () => Promise<any>;
    getMethod: () => HTTPMethod;
    getCookieValue: (key: string) => string | undefined;
    getHeaderValue: (key: string) => string | undefined;
    getOriginalURL: () => string;
}
