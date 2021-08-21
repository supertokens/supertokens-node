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
const thirdPartyProviders = require("../thirdparty/providers");
// For Express
class Wrapper {
    static signInUp(thirdPartyId, thirdPartyUserId, email) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.signInUp({ thirdPartyId, thirdPartyUserId, email });
    }
    static getUserByThirdPartyInfo(thirdPartyId, thirdPartyUserId) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getUserByThirdPartyInfo({
            thirdPartyId,
            thirdPartyUserId,
        });
    }
    static signUp(email, password) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.signUp({ email, password });
    }
    static signIn(email, password) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.signIn({ email, password });
    }
    static getUserById(userId) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getUserById({ userId });
    }
    static getUsersByEmail(email) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getUsersByEmail({ email });
    }
    /**
     * @deprecated Use supertokens.getUsersByEmail(...) function instead IF using core version >= 3.5
     *   */
    static getUserByEmail(email) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getUserByEmail({ email });
    }
    static createResetPasswordToken(userId) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.createResetPasswordToken({ userId });
    }
    static resetPasswordUsingToken(token, newPassword) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.resetPasswordUsingToken({ token, newPassword });
    }
    /**
     * @deprecated Use supertokens.getUsersOldestFirst(...) function instead IF using core version >= 3.5
     *   */
    static getUsersOldestFirst(limit, nextPaginationToken) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.getUsersOldestFirst({ limit, nextPaginationToken });
    }
    /**
     * @deprecated Use supertokens.getUsersNewestFirst(...) function instead IF using core version >= 3.5
     *   */
    static getUsersNewestFirst(limit, nextPaginationToken) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.getUsersNewestFirst({ limit, nextPaginationToken });
    }
    /**
     * @deprecated Use supertokens.getUserCount(...) function instead IF using core version >= 3.5
     *   */
    static getUserCount() {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getUserCount();
    }
    static updateEmailOrPassword(input) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.updateEmailOrPassword(input);
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
exports.signUp = Wrapper.signUp;
exports.signIn = Wrapper.signIn;
exports.signInUp = Wrapper.signInUp;
exports.getUserById = Wrapper.getUserById;
exports.getUserByThirdPartyInfo = Wrapper.getUserByThirdPartyInfo;
/**
 * @deprecated Use supertokens.getUsersByEmail(...) function instead IF using core version >= 3.5
 *   */
exports.getUserByEmail = Wrapper.getUserByEmail;
exports.getUsersByEmail = Wrapper.getUsersByEmail;
exports.createResetPasswordToken = Wrapper.createResetPasswordToken;
exports.resetPasswordUsingToken = Wrapper.resetPasswordUsingToken;
exports.createEmailVerificationToken = Wrapper.createEmailVerificationToken;
exports.verifyEmailUsingToken = Wrapper.verifyEmailUsingToken;
exports.isEmailVerified = Wrapper.isEmailVerified;
/**
 * @deprecated Use supertokens.getUsersOldestFirst(...) function instead IF using core version >= 3.5
 *   */
exports.getUsersOldestFirst = Wrapper.getUsersOldestFirst;
/**
 * @deprecated Use supertokens.getUsersNewestFirst(...) function instead IF using core version >= 3.5
 *   */
exports.getUsersNewestFirst = Wrapper.getUsersNewestFirst;
/**
 * @deprecated Use supertokens.getUserCount(...) function instead IF using core version >= 3.5
 *   */
exports.getUserCount = Wrapper.getUserCount;
exports.updateEmailOrPassword = Wrapper.updateEmailOrPassword;
exports.Google = Wrapper.Google;
exports.Github = Wrapper.Github;
exports.Facebook = Wrapper.Facebook;
exports.Apple = Wrapper.Apple;
//# sourceMappingURL=index.js.map
