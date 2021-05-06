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

import SuperTokens from "./supertokens";
import SuperTokensError from "./error";
import * as express from "express";

// For Express
export default class SuperTokensWrapper {
    static init = SuperTokens.init;

    static Error = SuperTokensError;

    static middleware() {
        // See https://github.com/supertokens/supertokens-node/issues/122
        return (req: express.Request, res: express.Response, next: express.NextFunction) =>
            SuperTokens.getInstanceOrThrowError().middleware()(req, res, next);
    }

    static errorHandler() {
        // See https://github.com/supertokens/supertokens-node/issues/122
        return (err: any, req: express.Request, res: express.Response, next: express.NextFunction) =>
            SuperTokens.getInstanceOrThrowError().errorHandler()(err, req, res, next);
    }

    static getAllCORSHeaders() {
        return SuperTokens.getInstanceOrThrowError().getAllCORSHeaders();
    }
}

export let init = SuperTokensWrapper.init;

export let middleware = SuperTokensWrapper.middleware;

export let errorHandler = SuperTokensWrapper.errorHandler;

export let getAllCORSHeaders = SuperTokensWrapper.getAllCORSHeaders;

export let Error = SuperTokensWrapper.Error;
