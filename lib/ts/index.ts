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

import SuperTokens from "./supertokens";
import STError from "./error";

export * from "./error";

// For Express
export default class SuperTokensWrapper {
    static init = SuperTokens.init;

    static middleware = SuperTokens.getInstanceOrThrowError().middleware;

    static errorHandler = SuperTokens.getInstanceOrThrowError().errorHandler;

    static getAllCORSHeaders = SuperTokens.getInstanceOrThrowError().getAllCORSHeaders;

    static Error = STError;
}

export let init = SuperTokens.init;

export let middleware = SuperTokensWrapper.middleware;

export let errorHandler = SuperTokensWrapper.errorHandler;

export let getAllCORSHeaders = SuperTokensWrapper.getAllCORSHeaders;
