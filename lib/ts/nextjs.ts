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
    method: HTTPMethod;
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
                method: req.method,
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
}
export let superTokensNextWrapper = NextJS.superTokensNextWrapper;
export let getAppDirRequestHandler = NextJS.getAppDirRequestHandler;
