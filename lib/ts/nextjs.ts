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
import { serialize } from "cookie";
import { errorHandler } from "./framework/express";
import { CollectingResponse, PreParsedRequest, middleware } from "./framework/custom";
import { HTTPMethod } from "./types";
import Session, { SessionContainer, VerifySessionOptions } from "./recipe/session";
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

    static getAppDirRequestHandler<T extends PartialNextRequest>(NextResponse: typeof Response) {
        const stMiddleware = middleware<T>((req) => {
            const query = Object.fromEntries(new URL(req.url).searchParams.entries());
            const cookies: Record<string, string> = Object.fromEntries(
                req.cookies.getAll().map((cookie) => [cookie.name, cookie.value])
            );

            return new PreParsedRequest({
                method: req.method as HTTPMethod,
                url: req.url,
                query: query,
                headers: req.headers,
                cookies,
                getFormBody: () => req.formData(),
                getJSONBody: () => req.json(),
            });
        });

        return async function handleCall(req: T) {
            const baseResponse = new CollectingResponse();

            const { handled, error } = await stMiddleware(req, baseResponse);

            if (error) {
                throw error;
            }
            if (!handled) {
                return new NextResponse("Not found", { status: 404 });
            }

            for (const respCookie of baseResponse.cookies) {
                baseResponse.headers.append(
                    "Set-Cookie",
                    serialize(respCookie.key, respCookie.value, {
                        domain: respCookie.domain,
                        expires: new Date(respCookie.expires),
                        httpOnly: respCookie.httpOnly,
                        path: respCookie.path,
                        sameSite: respCookie.sameSite,
                        secure: respCookie.secure,
                    })
                );
            }

            return new NextResponse(baseResponse.body, {
                headers: baseResponse.headers,
                status: baseResponse.statusCode,
            });
        };
    }

    private static async commonSSRSession(
        baseRequest: PreParsedRequest,
        options?: VerifySessionOptions
    ): Promise<{
        session: SessionContainer | undefined;
        hasToken: boolean;
        hasInvalidClaims: boolean;
        baseResponse?: CollectingResponse;
        nextResponse?: Response;
    }> {
        let baseResponse = new CollectingResponse();

        try {
            let session = await Session.getSession(baseRequest, baseResponse, options);
            return {
                session,
                hasInvalidClaims: false,
                hasToken: session !== undefined,
                baseResponse,
            };
        } catch (err) {
            if (Session.Error.isErrorFromSuperTokens(err)) {
                return {
                    hasToken: err.type !== Session.Error.UNAUTHORISED,
                    hasInvalidClaims: err.type === Session.Error.INVALID_CLAIMS,
                    session: undefined,
                    baseResponse,
                    nextResponse: new Response("Authentication required", {
                        status: err.type === Session.Error.INVALID_CLAIMS ? 403 : 401,
                    }),
                };
            } else {
                throw err;
            }
        }
    }

    static async getSSRSession(
        cookies: Array<{ name: string; value: string }>,
        headers: Headers,
        options?: VerifySessionOptions
    ): Promise<{
        session: SessionContainer | undefined;
        hasToken: boolean;
        hasInvalidClaims: boolean;
    }> {
        let cookiesObj: Record<string, string> = Object.fromEntries(
            cookies.map((cookie) => [cookie.name, cookie.value])
        );

        let baseRequest = new PreParsedRequest({
            method: "get",
            url: "",
            query: {},
            headers: headers,
            cookies: cookiesObj,
            getFormBody: async () => [],
            getJSONBody: async () => [],
        });

        const { baseResponse, nextResponse, ...result } = await NextJS.commonSSRSession(baseRequest, options);
        return result;
    }

    static async withSession<NextRequest extends PartialNextRequest, NextResponse extends Response>(
        req: NextRequest,
        handler: (session: SessionContainer | undefined) => Promise<NextResponse>,
        options?: VerifySessionOptions
    ) {
        const query = Object.fromEntries(new URL(req.url).searchParams.entries());
        const cookies: Record<string, string> = Object.fromEntries(
            req.cookies.getAll().map((cookie) => [cookie.name, cookie.value])
        );

        let baseRequest = new PreParsedRequest({
            method: req.method as HTTPMethod,
            url: req.url,
            query: query,
            headers: req.headers,
            cookies: cookies,
            getFormBody: () => req!.formData(),
            getJSONBody: () => req!.json(),
        });

        const { session, nextResponse, baseResponse } = await NextJS.commonSSRSession(baseRequest, options);

        if (nextResponse) {
            return nextResponse as NextResponse;
        }

        if (!baseResponse) {
            throw Error("Expected baseResponse to be present");
        }

        let userResponse = await handler(session);

        let didAddCookies = false;
        let didAddHeaders = false;

        for (const respCookie of baseResponse.cookies) {
            didAddCookies = true;
            userResponse.headers.append(
                "Set-Cookie",
                serialize(respCookie.key, respCookie.value, {
                    domain: respCookie.domain,
                    expires: new Date(respCookie.expires),
                    httpOnly: respCookie.httpOnly,
                    path: respCookie.path,
                    sameSite: respCookie.sameSite,
                    secure: respCookie.secure,
                })
            );
        }

        baseResponse.headers.forEach((value: string, key: string) => {
            didAddHeaders = true;
            userResponse.headers.set(key, value);
        });

        /**
         * For some deployment services (Vercel for example) production builds can return cached results for
         * APIs with older header values. In this case if the session tokens have changed (because of refreshing
         * for example) the cached result would still contain the older tokens and sessions would stop working.
         *
         * As a result, if we add cookies or headers from base response we also set the Cache-Control header
         * to make sure that the final result is not a cached version.
         */
        if (didAddCookies || didAddHeaders) {
            if (!userResponse.headers.has("Cache-Control")) {
                // This is needed for production deployments with Vercel
                userResponse.headers.set("Cache-Control", "no-cache, no-store, max-age=0, must-revalidate");
            }
        }

        return userResponse;
    }
}
export let superTokensNextWrapper = NextJS.superTokensNextWrapper;
export let getAppDirRequestHandler = NextJS.getAppDirRequestHandler;
export let getSSRSession = NextJS.getSSRSession;
export let withSession = NextJS.withSession;
