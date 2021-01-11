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
import SuperTokens from ".";

function next(
    request: any,
    response: any,
    resolve: (value?: any) => void,
    reject: (reason?: any) => void
): (middlewareError: any) => Promise<void> {
    return async function (middlewareError: any) {
        if (middlewareError === undefined) {
            return resolve();
        }

        return SuperTokens.errorHandler()(middlewareError, request, response, (errorHandlerError: any) => {
            if (errorHandlerError !== undefined) {
                return reject(errorHandlerError);
            }

            return resolve();
        });
    };
}

export default class NextJS {
    static async useSuperTokensFromNextJs(
        middleware: (next: (middlewareError: any) => void) => Promise<void>,
        request: any,
        response: any
    ): Promise<void> {
        return new Promise((resolve: any, reject: any) => {
            return middleware(next(request, response, resolve, reject));
        });
    }

    /* Backward compatibility */
    static superTokensMiddleware(request: any, response: any): Promise<any> {
        return new Promise((resolve: any, reject: any) => {
            return SuperTokens.middleware()(request, response, next(request, response, resolve, reject));
        });
    }
}

export let superTokensMiddleware = NextJS.superTokensMiddleware;
export let useSuperTokensFromNextJs = NextJS.useSuperTokensFromNextJs;
