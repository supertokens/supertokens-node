import { HTTPMethod } from "../types";
import { BaseRequest } from "./request";
import { NextApiRequest } from "next";
export declare class NextRequest extends BaseRequest {
    private request;
    private parserChecked;
    constructor(request: NextApiRequest);
    getKeyValueFromQuery: (key: string) => Promise<string | undefined>;
    getJSONBody: () => Promise<any>;
    getMethod: () => HTTPMethod;
    getCookieValue: (key: string) => string | undefined;
    getHeaderValue: (key: string) => string | undefined;
    getOriginalURL: () => string;
}
