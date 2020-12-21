/* Copyright (c) 2020, VRAI Labs and/or its affiliates. All rights reserved.
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
import Session from "./recipe/session";

function next(
    request: any,
    response: any,
    resolve: (value?: any) => void,
    reject: (reason?: any) => void
): (middlewareError: any) => void {
    return async function (middlewareError: any) {
        if (middlewareError !== undefined) {
            SuperTokens.errorHandler()(middlewareError, request, response, (errorHandlerError: any) => {
                if (errorHandlerError !== undefined) {
                    reject(errorHandlerError);
                }

                return resolve();
            });
            return;
        }

        return resolve();
    };
}

export default class NextJS {
    static superTokensMiddleware(request: any, response: any): Promise<any> {
        return new Promise((resolve, reject) => {
            return SuperTokens.middleware()(request, response, next(request, response, resolve, reject));
        });
    }

    static superTokensVerifySession(request: any, response: any): Promise<any> {
        return new Promise((resolve, reject) => {
            //  When called from getServerSideProps, we want to resolve and use req.session afterwards to check for existing session.
            if (response.json === undefined) {
                response.json = () => {
                    return resolve();
                };
            }
            return Session.verifySession()(request, response, next(request, response, resolve, reject));
        });
    }
}

export let superTokensMiddleware = NextJS.superTokensMiddleware;
export let superTokensVerifySession = NextJS.superTokensVerifySession;
