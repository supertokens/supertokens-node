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
                if (!callbackCalled) {
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
}
export let superTokensNextWrapper = NextJS.superTokensNextWrapper;
