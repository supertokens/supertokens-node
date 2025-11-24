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
exports.validateAndNormaliseUserInput = validateAndNormaliseUserInput;
exports.getEmailVerifyLink = getEmailVerifyLink;
const backwardCompatibility_1 = __importDefault(require("./emaildelivery/services/backwardCompatibility"));
function validateAndNormaliseUserInput(_, appInfo, config) {
    let override = Object.assign(
        {
            functions: (originalImplementation) => originalImplementation,
            apis: (originalImplementation) => originalImplementation,
        },
        config.override
    );
    function getEmailDeliveryConfig(isInServerlessEnv) {
        var _a;
        let emailService = (_a = config.emailDelivery) === null || _a === void 0 ? void 0 : _a.service;
        /**
         * following code is for backward compatibility.
         * if user has not passed emailService config, we use the default
         * createAndSendEmailUsingSupertokensService implementation which calls our supertokens API
         */
        if (emailService === undefined) {
            emailService = new backwardCompatibility_1.default(appInfo, isInServerlessEnv);
        }
        return Object.assign(Object.assign({}, config.emailDelivery), {
            /**
             * if we do
             * let emailDelivery = {
             *    service: emailService,
             *    ...config.emailDelivery,
             * };
             *
             * and if the user has passed service as undefined,
             * it it again get set to undefined, so we
             * set service at the end
             */
            service: emailService,
        });
    }
    return {
        mode: config.mode,
        getEmailForRecipeUserId: config.getEmailForRecipeUserId,
        override,
        getEmailDeliveryConfig,
    };
}
function getEmailVerifyLink(input) {
    return (
        input.appInfo
            .getOrigin({
                request: input.request,
                userContext: input.userContext,
            })
            .getAsStringDangerous() +
        input.appInfo.websiteBasePath.getAsStringDangerous() +
        "/verify-email" +
        "?token=" +
        input.token +
        "&tenantId=" +
        input.tenantId
    );
}
