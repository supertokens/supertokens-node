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
exports.manuallyCreateOrUpdateUser = exports.getProvider = exports.Error = exports.init = void 0;
const recipe_1 = __importDefault(require("./recipe"));
const error_1 = __importDefault(require("./error"));
const constants_1 = require("../multitenancy/constants");
const utils_1 = require("../../utils");
class Wrapper {
    static async getProvider(tenantId, thirdPartyId, clientType, userContext) {
        return await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getProvider({
            thirdPartyId,
            clientType,
            tenantId,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static async manuallyCreateOrUpdateUser(
        tenantId,
        thirdPartyId,
        thirdPartyUserId,
        email,
        isVerified,
        session,
        userContext
    ) {
        return await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.manuallyCreateOrUpdateUser({
            thirdPartyId,
            thirdPartyUserId,
            email,
            tenantId: tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId,
            isVerified,
            session,
            shouldTryLinkingWithSessionUser: !!session,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
}
Wrapper.init = recipe_1.default.init;
Wrapper.Error = error_1.default;
exports.default = Wrapper;
exports.init = Wrapper.init;
exports.Error = Wrapper.Error;
exports.getProvider = Wrapper.getProvider;
exports.manuallyCreateOrUpdateUser = Wrapper.manuallyCreateOrUpdateUser;
