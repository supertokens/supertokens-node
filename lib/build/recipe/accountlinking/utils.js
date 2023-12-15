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
exports.verifyEmailForRecipeUserIfLinkedAccountsAreVerified = exports.validateAndNormaliseUserInput = void 0;
const recipe_1 = __importDefault(require("../emailverification/recipe"));
async function defaultOnAccountLinked() {}
async function defaultShouldDoAutomaticAccountLinking() {
    return {
        shouldAutomaticallyLink: false,
    };
}
function validateAndNormaliseUserInput(_, config) {
    let onAccountLinked =
        (config === null || config === void 0 ? void 0 : config.onAccountLinked) || defaultOnAccountLinked;
    let shouldDoAutomaticAccountLinking =
        (config === null || config === void 0 ? void 0 : config.shouldDoAutomaticAccountLinking) ||
        defaultShouldDoAutomaticAccountLinking;
    let override = Object.assign(
        { functions: (originalImplementation) => originalImplementation },
        config === null || config === void 0 ? void 0 : config.override
    );
    return {
        override,
        onAccountLinked,
        shouldDoAutomaticAccountLinking,
    };
}
exports.validateAndNormaliseUserInput = validateAndNormaliseUserInput;
async function verifyEmailForRecipeUserIfLinkedAccountsAreVerified(input) {
    try {
        recipe_1.default.getInstanceOrThrowError();
    } catch (ignored) {
        // if email verification recipe is not initialized, we do a no-op
        return;
    }
    // This is just a helper function cause it's called in many places
    // like during sign up, sign in and post linking accounts.
    // This is not exposed to the developer as it's called in the relevant
    // recipe functions.
    // We do not do this in the core cause email verification is a different
    // recipe.
    // Finally, we only mark the email of this recipe user as verified and not
    // the other recipe users in the primary user (if this user's email is verified),
    // cause when those other users sign in, this function will be called for them anyway
    if (input.user.isPrimaryUser) {
        let recipeUserEmail = undefined;
        let isAlreadyVerified = false;
        input.user.loginMethods.forEach((lm) => {
            if (lm.recipeUserId.getAsString() === input.recipeUserId.getAsString()) {
                recipeUserEmail = lm.email;
                isAlreadyVerified = lm.verified;
            }
        });
        if (recipeUserEmail !== undefined) {
            if (isAlreadyVerified) {
                return;
            }
            let shouldVerifyEmail = false;
            input.user.loginMethods.forEach((lm) => {
                if (lm.hasSameEmailAs(recipeUserEmail) && lm.verified) {
                    shouldVerifyEmail = true;
                }
            });
            if (shouldVerifyEmail) {
                let resp = await recipe_1.default
                    .getInstanceOrThrowError()
                    .recipeInterfaceImpl.createEmailVerificationToken({
                        // While the token we create here is tenant specific, the verification status is not
                        // So we can use any tenantId the user is associated with here as long as we use the
                        // same in the verifyEmailUsingToken call
                        tenantId: input.user.tenantIds[0],
                        recipeUserId: input.recipeUserId,
                        email: recipeUserEmail,
                        userContext: input.userContext,
                    });
                if (resp.status === "OK") {
                    // we purposely pass in false below cause we don't want account
                    // linking to happen
                    await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.verifyEmailUsingToken({
                        // See comment about tenantId in the createEmailVerificationToken params
                        tenantId: input.user.tenantIds[0],
                        token: resp.token,
                        attemptAccountLinking: false,
                        userContext: input.userContext,
                    });
                }
            }
        }
    }
}
exports.verifyEmailForRecipeUserIfLinkedAccountsAreVerified = verifyEmailForRecipeUserIfLinkedAccountsAreVerified;
