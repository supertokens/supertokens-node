"use strict";
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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const error_1 = __importDefault(require("../../error"));
class SessionError extends error_1.default {
    constructor(options) {
        super(
            options.type === "UNAUTHORISED" && options.payload === undefined
                ? Object.assign(Object.assign({}, options), {
                      payload: {
                          clearTokens: true,
                      },
                  })
                : Object.assign({}, options)
        );
        this.fromRecipe = "session";
    }
}
SessionError.UNAUTHORISED = "UNAUTHORISED";
SessionError.TRY_REFRESH_TOKEN = "TRY_REFRESH_TOKEN";
SessionError.TOKEN_THEFT_DETECTED = "TOKEN_THEFT_DETECTED";
SessionError.INVALID_CLAIMS = "INVALID_CLAIMS";
SessionError.CLEAR_DUPLICATE_SESSION_COOKIES = "CLEAR_DUPLICATE_SESSION_COOKIES";
exports.default = SessionError;
