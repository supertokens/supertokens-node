"use strict";
/* Copyright (c) 2025, VRAI Labs and/or its affiliates. All rights reserved.
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
exports.default = registerCredentialAPI;
const utils_1 = require("../../../utils");
const utils_2 = require("./utils");
const session_1 = __importDefault(require("../../session"));
const error_1 = __importDefault(require("../../../error"));
async function registerCredentialAPI(apiImplementation, tenantId, options, userContext) {
    if (apiImplementation.registerCredentialPOST === undefined) {
        return false;
    }
    const session = await session_1.default.getSession(
        options.req,
        options.res,
        { overrideGlobalClaimValidators: () => [], sessionRequired: true },
        userContext
    );
    const requestBody = await options.req.getJSONBody();
    const webauthnGeneratedOptionsId = (0, utils_2.validateWebauthnGeneratedOptionsIdOrThrowError)(
        requestBody.webauthnGeneratedOptionsId
    );
    const credential = (0, utils_2.validateCredentialOrThrowError)(requestBody.credential);
    const recipeUserId = requestBody.recipeUserId;
    if (recipeUserId === undefined) {
        throw new error_1.default({
            type: error_1.default.BAD_INPUT_ERROR,
            message: "Please provide the recipeUserId",
        });
    }
    const result = await apiImplementation.registerCredentialPOST({
        recipeUserId,
        credential,
        webauthnGeneratedOptionsId,
        tenantId,
        options,
        userContext: userContext,
        session,
    });
    if (result.status === "OK") {
        (0, utils_1.send200Response)(options.res, {
            status: "OK",
        });
    } else {
        (0, utils_1.send200Response)(options.res, result);
    }
    return true;
}
