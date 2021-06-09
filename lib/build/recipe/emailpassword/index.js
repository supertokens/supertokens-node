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
const recipeImplementation_1 = require("./recipeImplementation");
const implementation_1 = require("./api/implementation");
// For Express
class Wrapper {
    static signUp(email, password) {
        return recipe_1.default.getInstanceOrThrowError().signUp(email, password);
    }
    static signIn(email, password) {
        return recipe_1.default.getInstanceOrThrowError().signIn(email, password);
    }
    static getUserById(userId) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getUserById({ userId });
    }
    static getUserByEmail(email) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getUserByEmail({ email });
    }
    static createResetPasswordToken(userId) {
        return recipe_1.default.getInstanceOrThrowError().createResetPasswordToken(userId);
    }
    static resetPasswordUsingToken(token, newPassword) {
        return recipe_1.default.getInstanceOrThrowError().resetPasswordUsingToken(token, newPassword);
    }
    static getUsersOldestFirst(limit, nextPaginationToken) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.getUsersOldestFirst({ limit, nextPaginationToken });
    }
    static getUsersNewestFirst(limit, nextPaginationToken) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.getUsersNewestFirst({ limit, nextPaginationToken });
    }
    static getUserCount() {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getUserCount();
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
exports.init = Wrapper.init;
exports.Error = Wrapper.Error;
exports.signUp = Wrapper.signUp;
exports.signIn = Wrapper.signIn;
exports.getUserById = Wrapper.getUserById;
exports.getUserByEmail = Wrapper.getUserByEmail;
exports.createResetPasswordToken = Wrapper.createResetPasswordToken;
exports.resetPasswordUsingToken = Wrapper.resetPasswordUsingToken;
exports.createEmailVerificationToken = Wrapper.createEmailVerificationToken;
exports.verifyEmailUsingToken = Wrapper.verifyEmailUsingToken;
exports.isEmailVerified = Wrapper.isEmailVerified;
exports.getUsersOldestFirst = Wrapper.getUsersOldestFirst;
exports.getUsersNewestFirst = Wrapper.getUsersNewestFirst;
exports.getUserCount = Wrapper.getUserCount;
//# sourceMappingURL=index.js.map
