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
exports.default = emailVerify;
const utils_1 = require("../../../utils");
const error_1 = __importDefault(require("../error"));
const session_1 = __importDefault(require("../../session"));
async function emailVerify(apiImplementation, tenantId, options, userContext) {
    let result;
    if ((0, utils_1.normaliseHttpMethod)(options.req.getMethod()) === "post") {
        // Logic according to Logic as per https://github.com/supertokens/supertokens-node/issues/62#issuecomment-751616106
        if (apiImplementation.verifyEmailPOST === undefined) {
            return false;
        }
        const requestBody = await options.req.getJSONBody();
        let token = requestBody.token;
        if (token === undefined || token === null) {
            throw new error_1.default({
                type: error_1.default.BAD_INPUT_ERROR,
                message: "Please provide the email verification token",
            });
        }
        if (typeof token !== "string") {
            throw new error_1.default({
                type: error_1.default.BAD_INPUT_ERROR,
                message: "The email verification token must be a string",
            });
        }
        const session = await session_1.default.getSession(
            options.req,
            options.res,
            { overrideGlobalClaimValidators: () => [], sessionRequired: false },
            userContext
        );
        let response = await apiImplementation.verifyEmailPOST({
            token,
            tenantId,
            options,
            session,
            userContext,
        });
        if (response.status === "OK") {
            // if there is a new session, it will be
            // automatically added to the response by the createNewSession function call
            // inside the verifyEmailPOST function.
            result = { status: "OK" };
        } else {
            result = response;
        }
    } else {
        if (apiImplementation.isEmailVerifiedGET === undefined) {
            return false;
        }
        const session = await session_1.default.getSession(
            options.req,
            options.res,
            { overrideGlobalClaimValidators: () => [] },
            userContext
        );
        result = await apiImplementation.isEmailVerifiedGET({
            options,
            session,
            userContext,
        });
    }
    (0, utils_1.send200Response)(options.res, result);
    return true;
}
