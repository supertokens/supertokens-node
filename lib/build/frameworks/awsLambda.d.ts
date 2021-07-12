import type {
    APIGatewayProxyEventV2,
    APIGatewayProxyEvent,
    APIGatewayProxyResult,
    APIGatewayProxyStructuredResultV2,
    Handler,
} from "aws-lambda";
import { HTTPMethod } from "../types";
import { BaseRequest } from "./request";
import { BaseResponse } from "./response";
import { SessionContainerInterface, VerifySessionOptions } from "../recipe/session/types";
import { Framework } from "./types";
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
export declare class AWSResponse extends BaseResponse {
    private headers;
    private cookies;
    private statusCode;
    private event;
    private content;
    responseSet: boolean;
    constructor(event: APIGatewayProxyEventV2 | APIGatewayProxyEvent);
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
    /**
     * @param {number} statusCode
     */
    setStatusCode: (statusCode: number) => void;
    sendJSONResponse: (content: any) => void;
    sendResponse: (
        response: APIGatewayProxyResult | APIGatewayProxyStructuredResultV2
    ) => APIGatewayProxyResult | APIGatewayProxyStructuredResultV2;
}
export interface SessionRequestV2 extends APIGatewayProxyEventV2 {
    session?: SessionContainerInterface;
}
export interface SessionRequest extends APIGatewayProxyEvent {
    session?: SessionContainerInterface;
}
export declare const SupertokensLambdaHandler: (
    handler: Handler<any, any>,
    options?: {
        verifySession?: boolean | undefined;
        verifySessionOptions?: VerifySessionOptions | undefined;
    }
) => Handler<any, any>;
declare const AWSWrapper: Framework;
export default AWSWrapper;
