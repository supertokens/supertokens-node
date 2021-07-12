/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
 *
 * This software is licensed under the Apache License, Version 2.0 (the
 * "License") as published by the Apache Software Foundation.
 *
 * You may not use this file except in compliance with the License. You may
 * obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */
import type {
    APIGatewayProxyEventV2,
    APIGatewayProxyEvent,
    APIGatewayProxyResult,
    APIGatewayProxyStructuredResultV2,
    Handler,
    Context,
    Callback,
} from "aws-lambda";
import { HTTPMethod } from "../types";
import { normaliseHttpMethod } from "../utils";
import { BaseRequest } from "./request";
import { BaseResponse } from "./response";
import { normalizeHeaderValue, getCookieValueFromHeaders, serializeCookieValue } from "./utils";
import { COOKIE_HEADER } from "./constants";
import { SessionContainerInterface, VerifySessionOptions } from "../recipe/session/types";
import SuperTokens from "../supertokens";
import { Framework } from "./types";
import Session from "../recipe/session/recipe";

export class AWSRequest extends BaseRequest {
    private event: APIGatewayProxyEventV2 | APIGatewayProxyEvent;
    private parsedJSONBody: Object | undefined;

    constructor(event: APIGatewayProxyEventV2 | APIGatewayProxyEvent) {
        super();
        this.event = event;
        this.parsedJSONBody = undefined;
    }

    getKeyValueFromQuery = async (key: string): Promise<string | undefined> => {
        if (this.event.queryStringParameters === undefined || this.event.queryStringParameters === null) {
            return undefined;
        }
        let value = this.event.queryStringParameters[key];
        if (value === undefined || typeof value !== "string") {
            return undefined;
        }
        return value;
    };

    getJSONBody = async (): Promise<any> => {
        if (this.parsedJSONBody === undefined) {
            if (this.event.body === null || this.event.body === undefined) {
                this.parsedJSONBody = {};
            } else {
                this.parsedJSONBody = JSON.parse(this.event.body);
                if (this.parsedJSONBody === undefined) {
                    this.parsedJSONBody = {};
                }
            }
        }
        return this.parsedJSONBody;
    };

    getMethod = (): HTTPMethod => {
        let rawMethod = (this.event as APIGatewayProxyEvent).httpMethod;
        if (rawMethod !== undefined) {
            return normaliseHttpMethod(rawMethod);
        }
        return normaliseHttpMethod((this.event as APIGatewayProxyEventV2).requestContext.http.method);
    };

    getCookieValue = (key: string): string | undefined => {
        return getCookieValueFromHeaders(this.event.headers, key);
    };

    getHeaderValue = (key: string): string | undefined => {
        return normalizeHeaderValue(this.event.headers[key]);
    };

    getOriginalURL = (): string => {
        let path = (this.event as APIGatewayProxyEvent).requestContext.path;
        if (path === undefined) {
            path = (this.event as APIGatewayProxyEventV2).requestContext.http.path;
        }
        return path;
    };
}

export class AWSResponse extends BaseResponse {
    private headers: { key: string; value: boolean | number | string; allowDuplicateKey: boolean }[];
    private cookies: string[];
    private statusCode: number;
    private event: APIGatewayProxyEventV2 | APIGatewayProxyEvent;
    private content: string;
    public responseSet: boolean;

    constructor(event: APIGatewayProxyEventV2 | APIGatewayProxyEvent) {
        super();
        this.event = event;
        this.headers = [];
        this.cookies = [];
        this.statusCode = 200;
        this.content = JSON.stringify({});
        this.responseSet = false;
    }

    setHeader = (key: string, value: string, allowDuplicateKey: boolean) => {
        this.headers.push({
            key,
            value,
            allowDuplicateKey,
        });
    };

    setCookie = (
        key: string,
        value: string,
        domain: string | undefined,
        secure: boolean,
        httpOnly: boolean,
        expires: number,
        path: string,
        sameSite: "strict" | "lax" | "none"
    ) => {
        let serialisedCookie = serializeCookieValue(key, value, domain, secure, httpOnly, expires, path, sameSite);
        this.cookies.push(serialisedCookie);
    };

    /**
     * @param {number} statusCode
     */
    setStatusCode = (statusCode: number) => {
        this.statusCode = statusCode;
    };

    sendJSONResponse = (content: any) => {
        this.content = JSON.stringify(content);
        this.responseSet = true;
    };

    sendResponse = (response: APIGatewayProxyResult | APIGatewayProxyStructuredResultV2) => {
        let headers:
            | {
                  [header: string]: boolean | number | string;
              }
            | undefined = response.headers;
        if (headers === undefined) {
            headers = {};
        }
        let body = response.body;
        let statusCode = response.statusCode;
        if (this.responseSet) {
            statusCode = this.statusCode;
            body = this.content;
        }
        for (let i = 0; i < this.headers.length; i++) {
            let currentValue = undefined;
            let currentHeadersSet = Object.keys(headers === undefined ? [] : headers);
            for (let j = 0; j < currentHeadersSet.length; j++) {
                if (currentHeadersSet[i].toLowerCase() === this.headers[i].key.toLowerCase()) {
                    this.headers[i].key = currentHeadersSet[i];
                    currentValue = headers[currentHeadersSet[i]];
                    break;
                }
            }
            if (this.headers[i].allowDuplicateKey && currentValue !== undefined) {
                let newValue = `${currentValue}, ${this.headers[i].value}`;
                headers[this.headers[i].key] = newValue;
            } else {
                headers[this.headers[i].key] = this.headers[i].value;
            }
        }
        if ((this.event as APIGatewayProxyEventV2).version !== undefined) {
            let cookies = (response as APIGatewayProxyStructuredResultV2).cookies;
            if (cookies === undefined) {
                cookies = [];
            }
            cookies.push(...this.cookies);

            let result: APIGatewayProxyStructuredResultV2 = {
                ...(response as APIGatewayProxyStructuredResultV2),
                cookies,
                body,
                statusCode,
                headers,
            };
            return result;
        } else {
            let multiValueHeaders = (response as APIGatewayProxyResult).multiValueHeaders;
            if (multiValueHeaders === undefined) {
                multiValueHeaders = {};
            }
            let headsersInMultiValueHeaders = Object.keys(multiValueHeaders);
            let cookieHeader = headsersInMultiValueHeaders.find((h) => h.toLowerCase() === COOKIE_HEADER.toLowerCase());
            if (cookieHeader === undefined) {
                multiValueHeaders[COOKIE_HEADER] = this.cookies;
            } else {
                multiValueHeaders[cookieHeader].push(...this.cookies);
            }
            let result: APIGatewayProxyResult = {
                ...(response as APIGatewayProxyResult),
                multiValueHeaders,
                body: body as string,
                statusCode: statusCode as number,
                headers,
            };
            return result;
        }
    };
}

export interface SessionRequestV2 extends APIGatewayProxyEventV2 {
    session?: SessionContainerInterface;
}

export interface SessionRequest extends APIGatewayProxyEvent {
    session?: SessionContainerInterface;
}

export const SupertokensLambdaHandler = (
    handler: Handler,
    options: {
        verifySession?: boolean;
        verifySessionOptions?: VerifySessionOptions;
    } = {}
): Handler => {
    return async (event: SessionRequest | SessionRequestV2, context: Context, callback: Callback) => {
        let supertokens = SuperTokens.getInstanceOrThrowError();
        let request = new AWSRequest(event);
        let response = new AWSResponse(event);
        try {
            let result = await supertokens.middleware(request, response);
            if (result) {
                return response.sendResponse({});
            }
            if (options.verifySession !== undefined) {
                let sessionRecipe = Session.getInstanceOrThrowError();
                event.session = await sessionRecipe.verifySession(options.verifySessionOptions, request, response);
            }
            let handlerResult = await handler(event, context, callback);
            return response.sendResponse(handlerResult);
        } catch (err) {
            supertokens.errorHandler(err, request, response);
            if (response.responseSet) {
                return response.sendResponse({});
            }
            throw err;
        }
    };
};

const AWSWrapper: Framework = {
    middleware: () => {},
    errorHandler: () => {},
    verifySession: (_) => {},
    wrapRequest: (unwrapped) => {
        return new AWSRequest(unwrapped);
    },
    wrapResponse: (unwrapped) => {
        return new AWSResponse(unwrapped);
    },
};

export default AWSWrapper;
