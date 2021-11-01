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
import { HTTPMethod } from "../../types";
import { normaliseHttpMethod } from "../../utils";
import { BaseRequest } from "../request";
import { BaseResponse } from "../response";
import { normalizeHeaderValue, getCookieValueFromHeaders, serializeCookieValue } from "../utils";
import { COOKIE_HEADER } from "../constants";
import { SessionContainerInterface } from "../../recipe/session/types";
import SuperTokens from "../../supertokens";
import { Framework } from "../types";

export class AWSRequest extends BaseRequest {
    private event: APIGatewayProxyEventV2 | APIGatewayProxyEvent;
    private parsedJSONBody: Object | undefined;

    constructor(event: APIGatewayProxyEventV2 | APIGatewayProxyEvent) {
        super();
        this.original = event;
        this.event = event;
        this.parsedJSONBody = undefined;
    }

    getFormData = async (): Promise<any> => {
        // TODO:
        return undefined;
    };

    getKeyValueFromQuery = (key: string): string | undefined => {
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
        let cookies = (this.event as APIGatewayProxyEventV2).cookies;
        if (
            (this.event.headers === undefined || this.event.headers === null) &&
            (cookies === undefined || cookies === null)
        ) {
            return undefined;
        }
        let value = getCookieValueFromHeaders(this.event.headers, key);
        if (value === undefined && cookies !== undefined && cookies !== null) {
            value = getCookieValueFromHeaders(
                {
                    cookie: cookies.join(";"),
                },
                key
            );
        }
        return value;
    };

    getHeaderValue = (key: string): string | undefined => {
        if (this.event.headers === undefined || this.event.headers === null) {
            return undefined;
        }
        return normalizeHeaderValue(this.event.headers[key]);
    };

    getOriginalURL = (): string => {
        let path = (this.event as APIGatewayProxyEvent).path;
        if (path === undefined) {
            path = (this.event as APIGatewayProxyEventV2).requestContext.http.path;
            let stage = (this.event as APIGatewayProxyEventV2).requestContext.stage;
            if (stage !== undefined && path.startsWith(`/${stage}`)) {
                path = path.slice(stage.length + 1);
            }
        }
        return path;
    };
}

interface SupertokensLambdaEvent extends APIGatewayProxyEvent {
    supertokens: {
        response: {
            headers: { key: string; value: boolean | number | string; allowDuplicateKey: boolean }[];
            cookies: string[];
        };
    };
}

interface SupertokensLambdaEventV2 extends APIGatewayProxyEventV2 {
    supertokens: {
        response: {
            headers: { key: string; value: boolean | number | string; allowDuplicateKey: boolean }[];
            cookies: string[];
        };
    };
}

export class AWSResponse extends BaseResponse {
    private statusCode: number;
    private event: SupertokensLambdaEvent | SupertokensLambdaEventV2;
    private content: string;
    public responseSet: boolean;

    constructor(event: SupertokensLambdaEvent | SupertokensLambdaEventV2) {
        super();
        this.original = event;
        this.event = event;
        this.statusCode = 200;
        this.content = JSON.stringify({});
        this.responseSet = false;
        this.event.supertokens = {
            response: {
                headers: [],
                cookies: [],
            },
        };
    }

    redirect = (_: number, __: string) => {
        // TODO:
    };

    setHeader = (key: string, value: string, allowDuplicateKey: boolean) => {
        this.event.supertokens.response.headers.push({
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
        this.event.supertokens.response.cookies.push(serialisedCookie);
    };

    /**
     * @param {number} statusCode
     */
    setStatusCode = (statusCode: number) => {
        this.statusCode = statusCode;
    };

    sendJSONResponse = (content: any) => {
        this.content = JSON.stringify(content);
        this.setHeader("Context-Type", "application/json", false);
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
        let supertokensHeaders = this.event.supertokens.response.headers;
        let supertokensCookies = this.event.supertokens.response.cookies;
        for (let i = 0; i < supertokensHeaders.length; i++) {
            let currentValue = undefined;
            let currentHeadersSet = Object.keys(headers === undefined ? [] : headers);
            for (let j = 0; j < currentHeadersSet.length; j++) {
                if (currentHeadersSet[j].toLowerCase() === supertokensHeaders[i].key.toLowerCase()) {
                    supertokensHeaders[i].key = currentHeadersSet[j];
                    currentValue = headers[currentHeadersSet[j]];
                    break;
                }
            }
            if (supertokensHeaders[i].allowDuplicateKey && currentValue !== undefined) {
                let newValue = `${currentValue}, ${supertokensHeaders[i].value}`;
                headers[supertokensHeaders[i].key] = newValue;
            } else {
                headers[supertokensHeaders[i].key] = supertokensHeaders[i].value;
            }
        }
        if ((this.event as APIGatewayProxyEventV2).version !== undefined) {
            let cookies = (response as APIGatewayProxyStructuredResultV2).cookies;
            if (cookies === undefined) {
                cookies = [];
            }
            cookies.push(...supertokensCookies);

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
                multiValueHeaders[COOKIE_HEADER] = supertokensCookies;
            } else {
                multiValueHeaders[cookieHeader].push(...supertokensCookies);
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

export interface SessionEventV2 extends SupertokensLambdaEventV2 {
    session?: SessionContainerInterface;
}

export interface SessionEvent extends SupertokensLambdaEvent {
    session?: SessionContainerInterface;
}

export const middleware = (handler?: Handler): Handler => {
    return async (event: SessionEvent | SessionEventV2, context: Context, callback: Callback) => {
        let supertokens = SuperTokens.getInstanceOrThrowError();
        let request = new AWSRequest(event);
        let response = new AWSResponse(event);
        try {
            let result = await supertokens.middleware(request, response);
            if (result) {
                return response.sendResponse({});
            }
            if (handler !== undefined) {
                let handlerResult = await handler(event, context, callback);
                return response.sendResponse(handlerResult);
            }
            return response.sendResponse({});
        } catch (err) {
            await supertokens.errorHandler(err, request, response);
            if (response.responseSet) {
                return response.sendResponse({});
            }
            throw err;
        }
    };
};

export interface AWSFramework extends Framework {
    middleware: () => Handler;
}

export const AWSWrapper: AWSFramework = {
    middleware,
    wrapRequest: (unwrapped) => {
        return new AWSRequest(unwrapped);
    },
    wrapResponse: (unwrapped) => {
        return new AWSResponse(unwrapped);
    },
};
