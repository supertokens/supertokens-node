"use strict";
/* Copyright (c) 2023, VRAI Labs and/or its affiliates. All rights reserved.
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
const recipe_1 = __importDefault(require("../recipe"));
// import { MfaClaim, completeFactorInSession } from '../../mfa';
function getAPIImplementation() {
    return {
        createDevicePOST: async function ({ session, options, deviceName, userContext }) {
            // TODO: validate claims to check if createDevice can be allowed
            let userIdentifierInfo = undefined;
            const emailOrPhoneInfo = await recipe_1.default
                .getInstanceOrThrowError()
                .getUserIdentifierInfoForUserId(session.getUserId(), userContext);
            if (emailOrPhoneInfo.status === "OK") {
                userIdentifierInfo = emailOrPhoneInfo.info;
            }
            const args = { deviceName, userId: session.getUserId(), userIdentifierInfo, userContext };
            let response = await options.recipeImplementation.createDevice(args);
            return Object.assign({}, response);
        },
        verifyCodePOST: async function ({ session, options, totp, userContext }) {
            const args = { userId: session.getUserId(), totp, tenantId: session.getTenantId(), userContext };
            let response = await options.recipeImplementation.verifyCode(args);
            // TODO: Uncomment when MFA is implemented
            // userContext.flow = 'signin';
            // await completeFactorInSession(session, 'totp', userContext);
            return response;
        },
        verifyDevicePOST: async function ({ session, options, deviceName, totp, userContext }) {
            const args = { userId: session.getUserId(), deviceName, totp, userContext };
            let response = await options.recipeImplementation.verifyDevice(args);
            // TODO: Uncomment when MFA is implemented
            // userContext.flow = 'signup';
            // await completeFactorInSession(session, 'totp', userContext);
            return response;
        },
        removeDevicePOST: async function ({ session, options, deviceName, userContext }) {
            const args = { userId: session.getUserId(), deviceName, userContext };
            let response = await options.recipeImplementation.removeDevice(args);
            return response;
        },
        listDevicesGET: async function ({ session, options, userContext }) {
            const args = { userId: session.getUserId(), userContext };
            let response = await options.recipeImplementation.listDevices(args);
            return response;
        },
    };
}
exports.default = getAPIImplementation;
