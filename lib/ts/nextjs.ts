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

import { errorHandler } from "./framework/express";
import { CollectingResponse, PreParsedRequest } from "./framework/custom";
import { SessionContainer, VerifySessionOptions } from "./recipe/session";
import { JWTPayload } from "jose";
import {
    withPreParsedRequestResponse as customWithPreParsedRequestResponse,
    getSessionForSSRUsingAccessToken,
    withSession as customWithSession,
    handleAuthAPIRequest,
} from "./customFramework";

function next(
    request: any,
    response: any,
    resolve: (value?: any) => void,
    reject: (reason?: any) => void
): (middlewareError?: any) => Promise<any> {
    return async function (middlewareError?: any) {
        if (middlewareError === undefined) {
            return resolve();
        }
        await errorHandler()(middlewareError, request, response, (errorHandlerError: any) => {
            if (errorHandlerError !== undefined) {
                return reject(errorHandlerError);
            }

            // do nothing, error handler does not resolve the promise.
        });
    };
}

type PartialNextRequest = {
    method: string;
    url: string;
    headers: Headers;
    formData: () => any;
    json: () => any;
    cookies: {
        getAll: () => {
            name: string;
            value: string;
        }[];
    };
};

export default class NextJS {
    static async superTokensNextWrapper<T>(
        middleware: (next: (middlewareError?: any) => void) => Promise<T>,
        request: any,
        response: any
    ): Promise<T> {
        return new Promise<T>(async (resolve: any, reject: any) => {
            try {
                let callbackCalled = false;
                const result = await middleware((err) => {
                    callbackCalled = true;
                    next(request, response, resolve, reject)(err);
                });
                if (!callbackCalled && !response.finished && !response.headersSent) {
                    return resolve(result);
                }
            } catch (err) {
                await errorHandler()(err, request, response, (errorHandlerError: any) => {
                    if (errorHandlerError !== undefined) {
                        return reject(errorHandlerError);
                    }
                    // do nothing, error handler does not resolve the promise.
                });
            }
        });
    }

    static getAppDirRequestHandler() {
        return handleAuthAPIRequest();
    }

    static async getSSRSession(
        cookies: Array<{ name: string; value: string }>
    ): Promise<{
        accessTokenPayload: JWTPayload | undefined;
        hasToken: boolean;
        error: Error | undefined;
    }> {
        let accessToken = cookies.find((cookie) => cookie.name === "sAccessToken")?.value;
        return await getSessionForSSRUsingAccessToken(accessToken);
    }

    static async withSession<NextRequest extends PartialNextRequest, NextResponse extends Response>(
        req: NextRequest,
        handler: (error: Error | undefined, session: SessionContainer | undefined) => Promise<NextResponse>,
        options?: VerifySessionOptions,
        userContext?: Record<string, any>
    ): Promise<NextResponse> {
        return await customWithSession<NextRequest, NextResponse>(req, handler, options, userContext);
    }

    static async withPreParsedRequestResponse<NextRequest extends PartialNextRequest, NextResponse extends Response>(
        req: NextRequest,
        handler: (baseRequest: PreParsedRequest, baseResponse: CollectingResponse) => Promise<NextResponse>
    ): Promise<NextResponse> {
        return customWithPreParsedRequestResponse(req, handler);
    }
}
export let superTokensNextWrapper = NextJS.superTokensNextWrapper;
export let getAppDirRequestHandler = NextJS.getAppDirRequestHandler;
export let getSSRSession = NextJS.getSSRSession;
export let withSession = NextJS.withSession;
export let withPreParsedRequestResponse = NextJS.withPreParsedRequestResponse;
