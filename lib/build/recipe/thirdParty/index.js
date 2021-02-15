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
Object.defineProperty(exports, "__esModule", { value: true });
const recipe_1 = require("./recipe");
const error_1 = require("./error");
const thirdPartyProviders = require("./providers");
// For Express
class Wrapper {
    static signInUp(thirdPartyId, thirdPartyUserId, email) {
        return recipe_1.default.getInstanceOrThrowError().signInUp(thirdPartyId, thirdPartyUserId, email);
    }
    static getUserById(userId) {
        return recipe_1.default.getInstanceOrThrowError().getUserById(userId);
    }
    static getUserByThirdPartyInfo(thirdPartyId, thirdPartyUserId) {
        return recipe_1.default.getInstanceOrThrowError().getUserByThirdPartyInfo(thirdPartyId, thirdPartyUserId);
    }
    static getUsersOldestFirst(limit, nextPaginationToken) {
        return recipe_1.default.getInstanceOrThrowError().getUsersOldestFirst(limit, nextPaginationToken);
    }
    static getUsersNewestFirst(limit, nextPaginationToken) {
        return recipe_1.default.getInstanceOrThrowError().getUsersNewestFirst(limit, nextPaginationToken);
    }
    static getUserCount() {
        return recipe_1.default.getInstanceOrThrowError().getUserCount();
    }
    static createEmailVerificationToken(userId) {
        return recipe_1.default.getInstanceOrThrowError().createEmailVerificationToken(userId);
    }
    static verifyEmailUsingToken(token) {
        return recipe_1.default.getInstanceOrThrowError().verifyEmailUsingToken(token);
    }
    static isEmailVerified(userId) {
        return recipe_1.default.getInstanceOrThrowError().isEmailVerified(userId);
    }
}
exports.default = Wrapper;
Wrapper.init = recipe_1.default.init;
Wrapper.Error = error_1.default;
Wrapper.Google = thirdPartyProviders.Google;
Wrapper.Github = thirdPartyProviders.Github;
Wrapper.Facebook = thirdPartyProviders.Facebook;
Wrapper.Apple = thirdPartyProviders.Apple;
exports.init = Wrapper.init;
exports.Error = Wrapper.Error;
exports.signInUp = Wrapper.signInUp;
exports.getUserById = Wrapper.getUserById;
exports.getUserByThirdPartyInfo = Wrapper.getUserByThirdPartyInfo;
exports.createEmailVerificationToken = Wrapper.createEmailVerificationToken;
exports.verifyEmailUsingToken = Wrapper.verifyEmailUsingToken;
exports.isEmailVerified = Wrapper.isEmailVerified;
exports.getUsersOldestFirst = Wrapper.getUsersOldestFirst;
exports.getUsersNewestFirst = Wrapper.getUsersNewestFirst;
exports.getUserCount = Wrapper.getUserCount;
exports.Google = Wrapper.Google;
exports.Github = Wrapper.Github;
exports.Facebook = Wrapper.Facebook;
exports.Apple = Wrapper.Apple;
//# sourceMappingURL=index.js.map
