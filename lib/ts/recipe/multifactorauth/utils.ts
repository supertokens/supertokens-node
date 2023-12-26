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

import { BaseRequest, BaseResponse } from "../../framework";
import { TypeInput, TypeNormalisedInput, RecipeInterface, APIInterface, MFAClaimValue } from "./types";
import MultiFactorAuthRecipe from "./recipe";
import Session from "../session";
import SessionRecipe from "../session/recipe";
import { UserContext } from "../../types";

export function validateAndNormaliseUserInput(config?: TypeInput): TypeNormalisedInput {
    if (config?.firstFactors !== undefined && config?.firstFactors.length === 0) {
        throw new Error("'firstFactors' can be either undefined or a non-empty array");
    }

    let override = {
        functions: (originalImplementation: RecipeInterface) => originalImplementation,
        apis: (originalImplementation: APIInterface) => originalImplementation,
        ...config?.override,
    };

    return {
        firstFactors: config?.firstFactors,
        override,
    };
}

export function checkFactorRequirement(req: string, completedFactors: MFAClaimValue["c"]) {
    return {
        id: req,
        isValid: completedFactors[req] !== undefined,
        message: "Not completed",
    };
}

export async function getFactorFlowControlFlags(req: BaseRequest, res: BaseResponse, userContext: UserContext) {
    // Factor Login flow is described here -> https://github.com/supertokens/supertokens-core/issues/554#issuecomment-1857915021

    // - no session -> normal operation
    // - with session:
    //   - mfa disabled ->
    //     - if session overwrite is not allowed -> we don’t do auto account linking and no manual account linking (even if user has switched on automatic account linking)
    //       - the 2nd account already exists -> no op (do not change the db)
    //       - the 2nd account does not exist -> isSignUpAllowed -> create a recipe user
    //     - if session overwrite is allowed -> we ignore the input session and just do normal operation as if there was no input session.
    //   - mfa enabled -> we don’t do auto account linking (even if user has switched on automatic account linking)
    //     - the 2nd account already exists:
    //       - if user is already linked to first account -> modify session’s completed and next array
    //       - if user is not already linked to first account -> Contact support case (cause we can’t do account linking here cause the other account may have some info already in it, and we do not call shouldDoAutomaticAccountLinking function)
    //     - the 2nd account does not exist -> creating and linking (if linking is allowed, if not, we aren’t creating either + isAllowedToSetupFactor + (2nd factor is verification || login method with same email and its verified))
    //       - If linking is not allowed, we return a support status code
    //       - The code path should never use the session overwrite boolean in this case!

    let session = await Session.getSession(
        req,
        res,
        {
            sessionRequired: false,
            overrideGlobalClaimValidators: () => [],
        },
        userContext
    );
    const mfaInstance = MultiFactorAuthRecipe.getInstance();
    let overwriteSessionDuringSignIn = SessionRecipe.getInstanceOrThrowError().config.overwriteSessionDuringSignIn;
    let shouldCheckIfSignInIsAllowed: boolean;
    let shouldCheckIfSignUpIsAllowed: boolean;
    let shouldAttemptAccountLinking: boolean;
    let shouldCreateSession: boolean;

    if (session === undefined) {
        // There is not active session, so we do all normal operations
        shouldCheckIfSignInIsAllowed = true;
        shouldCheckIfSignUpIsAllowed = true;
        shouldAttemptAccountLinking = true;
        shouldCreateSession = true;
    } else {
        // With an active session
        if (mfaInstance === undefined) {
            // MFA is disabled

            // we do this check either ways, because
            //  1. if not overwriting session, we allow creation of recipe user
            //  2. if overwriting session, we do all normal operations

            // We want to check if sign up is allowed even if we are not going to attempt account linking
            // because the account linking may be attempted later on when the same recipe user sign's in 
            // later on, it will trigger accountlinking and then the attacker might be able to take over
            // this account for the reasons mentioned here: https://github.com/supertokens/supertokens-node/blob/f25bc019f493538eb9a2a111454ba4b6c03e0f87/lib/ts/recipe/accountlinking/recipe.ts#L419

            // an example here:
            // 1. victim -> tp sigup using e1 (verified)
            // 2. attacker -> sign up using e1 -> triggers email verification
            // 3. victim -> verifies email
            // 4. attacker -> signs in and the account will be linked to the victim
            // in step 2, even if we don't link accounts, we don't want the sign up to be allowed
            shouldCheckIfSignUpIsAllowed = true;

            if (overwriteSessionDuringSignIn === false) {
                shouldCreateSession = false; // not overwriting session
                shouldAttemptAccountLinking = false; // no account linking
                shouldCheckIfSignInIsAllowed = false; // Sign in is a no-op (no auto account linking), so we don't check if sign in allowed
            } else {
                // Since we do a session overwrite, we do all normal operations

                shouldCheckIfSignInIsAllowed = true;
                shouldAttemptAccountLinking = true;
                shouldCreateSession = true;
            }
        } else {
            // With MFA, no auto linking, so no checks for signIn or signUp
            // This would treated as a factor setup, so not creating new session as well
            shouldCreateSession = false;
            shouldAttemptAccountLinking = false;
            shouldCheckIfSignInIsAllowed = false;
            shouldCheckIfSignUpIsAllowed = false;
        }
    }

    return {
        shouldCheckIfSignInIsAllowed,
        shouldCheckIfSignUpIsAllowed,
        shouldAttemptAccountLinking,
        shouldCreateSession,

        session,
        mfaInstance,
    };
}
