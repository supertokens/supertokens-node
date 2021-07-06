import { APIGatewayProxyEventV2, APIGatewayProxyEvent } from "aws-lambda";
import { HTTPMethod } from "../types";
import { BaseRequest } from "./request";
export declare class AWSRequest extends BaseRequest {
    private event;
    private parsedJSONBody;
    constructor(event: APIGatewayProxyEventV2 | APIGatewayProxyEvent);
    getKeyValueFromQuery: (key: string) => Promise<string | undefined>;
    getJSONBody: () => Promise<any>;
    getMethod: () => HTTPMethod;
    getCookieValue: (key: string) => string | undefined;
    getHeaderValue: (key: string) => string | undefined;
    getOriginalURL: () => string;
}
