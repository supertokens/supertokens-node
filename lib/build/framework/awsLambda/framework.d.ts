import type {
    APIGatewayProxyEventV2,
    APIGatewayProxyEvent,
    APIGatewayProxyResult,
    APIGatewayProxyStructuredResultV2,
    Handler,
} from "aws-lambda";
import { HTTPMethod } from "../../types";
import { BaseRequest } from "../request";
import { BaseResponse } from "../response";
import { SessionContainerInterface } from "../../recipe/session/types";
import { Framework } from "../types";
export declare class AWSRequest extends BaseRequest {
    private event;
    private parsedJSONBody;
    constructor(event: APIGatewayProxyEventV2 | APIGatewayProxyEvent);
    getKeyValueFromQuery: (key: string) => string | undefined;
    getJSONBody: () => Promise<any>;
    getMethod: () => HTTPMethod;
    getCookieValue: (key: string) => string | undefined;
    getHeaderValue: (key: string) => string | undefined;
    getOriginalURL: () => string;
}
interface SupertokensLambdaEvent extends APIGatewayProxyEvent {
    supertokens: {
        response: {
            headers: {
                key: string;
                value: boolean | number | string;
                allowDuplicateKey: boolean;
            }[];
            cookies: string[];
        };
    };
}
interface SupertokensLambdaEventV2 extends APIGatewayProxyEventV2 {
    supertokens: {
        response: {
            headers: {
                key: string;
                value: boolean | number | string;
                allowDuplicateKey: boolean;
            }[];
            cookies: string[];
        };
    };
}
export declare class AWSResponse extends BaseResponse {
    private statusCode;
    private event;
    private content;
    responseSet: boolean;
    constructor(event: SupertokensLambdaEvent | SupertokensLambdaEventV2);
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
export interface SessionEventV2 extends SupertokensLambdaEventV2 {
    session?: SessionContainerInterface;
}
export interface SessionEvent extends SupertokensLambdaEvent {
    session?: SessionContainerInterface;
}
export declare const middleware: (handler?: Handler<any, any> | undefined) => Handler<any, any>;
export interface AWSFramework extends Framework {
    middleware: () => Handler;
}
export declare const AWSWrapper: AWSFramework;
export {};
