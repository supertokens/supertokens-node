"use strict";
/* Copyright (c) 2024, VRAI Labs and/or its affiliates. All rights reserved.
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
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../../utils");
// TODO: separate post and get?
async function consent(apiImplementation, options, userContext) {
    var _a;
    if (utils_1.normaliseHttpMethod(options.req.getMethod()) === "post") {
        if (apiImplementation.consentPOST === undefined) {
            return false;
        }
        const reqBody = await options.req.getJSONBody();
        let response = await apiImplementation.consentPOST({
            options,
            accept: reqBody.accept,
            consentChallenge: reqBody.consentChallenge,
            grantScope: reqBody.grantScope,
            remember: reqBody.remember,
            userContext,
        });
        if ("status" in response) {
            utils_1.send200Response(options.res, response);
        } else {
            options.res.original.redirect(response.redirectTo);
        }
    } else {
        if (apiImplementation.consentGET === undefined) {
            return false;
        }
        const consentChallenge =
            (_a = options.req.getKeyValueFromQuery("consentChallenge")) !== null && _a !== void 0
                ? _a
                : options.req.getKeyValueFromQuery("consent_challenge");
        if (consentChallenge === undefined) {
            throw new Error("TODO");
        }
        let response = await apiImplementation.consentGET({
            options,
            consentChallenge,
            userContext,
        });
        if ("status" in response) {
            utils_1.send200Response(options.res, response);
        } else {
            options.res.original.redirect(response.redirectTo);
        }
    }
    return true;
}
exports.default = consent;
