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

import { NormalisedAppinfo } from "../../types";
import { validateTheStructureOfUserInput } from "../../utils";
import { TypeInput as TypeNormalisedInputEmailVerification } from "../emailverification/types";
import {
    User,
    TypeInput,
    InputSchema,
    TypeNormalisedInput,
    TypeInputSignUp,
    TypeInputSignIn,
    TypeNormalisedInputSignUp,
    TypeContextEmailPassowrd,
    TypeContextThirdParty,
    TypeNormalisedInputSignIn,
    TypeInputEmailVerificationFeature,
    TypeInputSignOut,
    TypeNormalisedInputSignOut,
    TypeNormalisedInputSessionFeature,
    TypeInputSessionFeature,
} from "./types";
import { NormalisedFormField } from "../emailpassword/types";
import Recipe from "./recipe";
import STError from "./error";
import { normaliseSignUpFormFields } from "../emailpassword/utils";

export function validateAndNormaliseUserInput(
    recipeInstance: Recipe,
    appInfo: NormalisedAppinfo,
    config?: TypeInput
): TypeNormalisedInput {
    validateTheStructureOfUserInput(
        config,
        InputSchema,
        "thirdpartyemailpassword recipe",
        recipeInstance.getRecipeId()
    );

    let sessionFeature = validateAndNormaliseSessionFeatureConfig(
        recipeInstance,
        appInfo,
        config === undefined ? undefined : config.sessionFeature
    );

    let signUpFeature = validateAndNormaliseSignUpConfig(
        recipeInstance,
        appInfo,
        config === undefined ? undefined : config.signUpFeature
    );

    let signInFeature = validateAndNormaliseSignInConfig(
        recipeInstance,
        appInfo,
        config === undefined ? undefined : config.signInFeature
    );

    let resetPasswordUsingTokenFeature = config === undefined ? undefined : config.resetPasswordUsingTokenFeature;

    let providers = config === undefined || config.providers === undefined ? [] : config.providers;

    let signOutFeature = validateAndNormaliseSignOutConfig(
        recipeInstance,
        appInfo,
        config === undefined ? undefined : config.signOutFeature
    );

    let emailVerificationFeature = validateAndNormaliseEmailVerificationConfig(
        recipeInstance,
        appInfo,
        config === undefined ? undefined : config.emailVerificationFeature
    );

    return {
        sessionFeature,
        signUpFeature,
        signInFeature,
        providers,
        signOutFeature,
        resetPasswordUsingTokenFeature,
        emailVerificationFeature,
    };
}

async function defaultValidator(value: any): Promise<string | undefined> {
    return undefined;
}

async function defaultHandlePostSignUp(user: User, context: TypeContextEmailPassowrd | TypeContextThirdParty) {}

async function defaultHandlePostSignIn(user: User, context: TypeContextEmailPassowrd | TypeContextThirdParty) {}

async function defaultSetSessionDataForSession(
    user: User,
    context: TypeContextEmailPassowrd | TypeContextThirdParty,
    action: "signin" | "signup"
) {
    return {};
}

async function defaultSetJwtPayloadForSession(
    user: User,
    context: TypeContextEmailPassowrd | TypeContextThirdParty,
    action: "signin" | "signup"
) {
    return {};
}

function validateAndNormaliseSignUpConfig(
    recipeInstance: Recipe,
    appInfo: NormalisedAppinfo,
    config?: TypeInputSignUp
): TypeNormalisedInputSignUp {
    let disableDefaultImplementation =
        config === undefined || config.disableDefaultImplementation === undefined
            ? false
            : config.disableDefaultImplementation;

    let formFields: NormalisedFormField[] = config === undefined ? [] : normaliseSignUpFormFields(config.formFields);
    let handlePostSignUp =
        config === undefined || config.handlePostSignUp === undefined
            ? defaultHandlePostSignUp
            : config.handlePostSignUp;

    return {
        disableDefaultImplementation,
        formFields,
        handlePostSignUp,
    };
}

function validateAndNormaliseSessionFeatureConfig(
    recipeInstance: Recipe,
    appInfo: NormalisedAppinfo,
    config?: TypeInputSessionFeature
): TypeNormalisedInputSessionFeature {
    let setJwtPayload =
        config === undefined || config.setJwtPayload === undefined
            ? defaultSetJwtPayloadForSession
            : config.setJwtPayload;

    let setSessionData =
        config === undefined || config.setSessionData === undefined
            ? defaultSetSessionDataForSession
            : config.setSessionData;

    return {
        setJwtPayload,
        setSessionData,
    };
}

function validateAndNormaliseSignInConfig(
    recipeInstance: Recipe,
    appInfo: NormalisedAppinfo,
    config?: TypeInputSignIn
): TypeNormalisedInputSignIn {
    let disableDefaultImplementation =
        config === undefined || config.disableDefaultImplementation === undefined
            ? false
            : config.disableDefaultImplementation;

    let handlePostSignIn =
        config === undefined || config.handlePostSignIn === undefined
            ? defaultHandlePostSignIn
            : config.handlePostSignIn;

    return {
        disableDefaultImplementation,
        handlePostSignIn,
    };
}

function validateAndNormaliseEmailVerificationConfig(
    recipeInstance: Recipe,
    appInfo: NormalisedAppinfo,
    config?: TypeInputEmailVerificationFeature
): TypeNormalisedInputEmailVerification {
    return config === undefined
        ? {
              getEmailForUserId: recipeInstance.getEmailForUserId,
          }
        : {
              disableDefaultImplementation: config.disableDefaultImplementation,
              getEmailForUserId: recipeInstance.getEmailForUserId,
              createAndSendCustomEmail:
                  config.createAndSendCustomEmail === undefined
                      ? undefined
                      : async (user, link) => {
                            let userInfo = await recipeInstance.getUserById(user.id);
                            if (userInfo === undefined || config.createAndSendCustomEmail === undefined) {
                                throw new STError(
                                    {
                                        type: STError.UNKNOWN_USER_ID_ERROR,
                                        message: "User ID unknown",
                                    },
                                    recipeInstance.getRecipeId()
                                );
                            }
                            return await config.createAndSendCustomEmail(userInfo, link);
                        },
              getEmailVerificationURL:
                  config.getEmailVerificationURL === undefined
                      ? undefined
                      : async (user) => {
                            let userInfo = await recipeInstance.getUserById(user.id);
                            if (userInfo === undefined || config.getEmailVerificationURL === undefined) {
                                throw new STError(
                                    {
                                        type: STError.UNKNOWN_USER_ID_ERROR,
                                        message: "User ID unknown",
                                    },
                                    recipeInstance.getRecipeId()
                                );
                            }
                            return await config.getEmailVerificationURL(userInfo);
                        },
              handlePostEmailVerification:
                  config.handlePostEmailVerification === undefined
                      ? undefined
                      : async (user) => {
                            let userInfo = await recipeInstance.getUserById(user.id);
                            if (userInfo === undefined || config.handlePostEmailVerification === undefined) {
                                throw new STError(
                                    {
                                        type: STError.UNKNOWN_USER_ID_ERROR,
                                        message: "User ID unknown",
                                    },
                                    recipeInstance.getRecipeId()
                                );
                            }
                            return await config.handlePostEmailVerification(userInfo);
                        },
          };
}

function validateAndNormaliseSignOutConfig(
    recipeInstance: Recipe,
    appInfo: NormalisedAppinfo,
    config?: TypeInputSignOut
): TypeNormalisedInputSignOut {
    let disableDefaultImplementation =
        config === undefined || config.disableDefaultImplementation === undefined
            ? false
            : config.disableDefaultImplementation;

    return {
        disableDefaultImplementation,
    };
}

export function createNewPaginationToken(userId: string, timeJoined: number): string {
    return Buffer.from(`${userId};${timeJoined}`).toString("base64");
}

export function combinePaginationTokens(
    thirdPartyPaginationToken: string | null,
    emailPasswordPaginationToken: string | null
): string {
    return Buffer.from(`${thirdPartyPaginationToken};${emailPasswordPaginationToken}`).toString("base64");
}

export function extractPaginationTokens(
    recipe: Recipe,
    nextPaginationToken: string
): {
    thirdPartyPaginationToken: string | undefined;
    emailPasswordPaginationToken: string | undefined;
} {
    let extractedTokens = Buffer.from(nextPaginationToken, "base64").toString().split(";");
    if (extractedTokens.length !== 2) {
        throw new STError(
            {
                type: "INVALID_PAGINATION_TOKEN",
                message: "nextPaginationToken is invalid",
            },
            recipe.getRecipeId()
        );
    }
    return {
        thirdPartyPaginationToken: extractedTokens[0] === "null" ? undefined : extractedTokens[0],
        emailPasswordPaginationToken: extractedTokens[1] === "null" ? undefined : extractedTokens[1],
    };
}

export function combinePaginationResults(
    thirdPartyResult: {
        users: User[];
        nextPaginationToken?: string;
    },
    emailPasswordResult: {
        users: User[];
        nextPaginationToken?: string;
    },
    limit: number,
    oldestFirst: boolean
): {
    users: User[];
    nextPaginationToken?: string;
} {
    let maxLoop = Math.min(limit, thirdPartyResult.users.length + emailPasswordResult.users.length);
    let thirdPartyResultLoopIndex = 0;
    let emailPasswordResultLoopIndex = 0;
    let users: User[] = [];
    for (let i = 0; i < maxLoop; i++) {
        if (
            thirdPartyResultLoopIndex !== thirdPartyResult.users.length && // there are still users available in the thirdPartyResult
            (emailPasswordResultLoopIndex === emailPasswordResult.users.length || // no more users left in emailPasswordResult array to match against
                (oldestFirst &&
                    thirdPartyResult.users[thirdPartyResultLoopIndex].timeJoined <
                        emailPasswordResult.users[emailPasswordResultLoopIndex].timeJoined) ||
                (!oldestFirst &&
                    thirdPartyResult.users[thirdPartyResultLoopIndex].timeJoined >
                        emailPasswordResult.users[emailPasswordResultLoopIndex].timeJoined))
        ) {
            users.push(thirdPartyResult.users[thirdPartyResultLoopIndex]);
            thirdPartyResultLoopIndex++;
        } else {
            users.push(emailPasswordResult.users[emailPasswordResultLoopIndex]);
            emailPasswordResultLoopIndex++;
        }
    }
    let thirdPartyPaginationToken: string | null = null;
    let emailPasswordPaginationToken: string | null = null;

    // all users of thirdPartyResult are in the resulting users array. thus use the pagination token sent by the core (if any)
    if (thirdPartyResultLoopIndex === thirdPartyResult.users.length) {
        thirdPartyPaginationToken =
            thirdPartyResult.nextPaginationToken === undefined ? null : thirdPartyResult.nextPaginationToken;
    } else {
        thirdPartyPaginationToken = createNewPaginationToken(
            thirdPartyResult.users[thirdPartyResultLoopIndex].id,
            thirdPartyResult.users[thirdPartyResultLoopIndex].timeJoined
        );
    }

    // all users of emailPasswordResult are in the resulting users array. thus use the pagination token sent by the core (if any)
    if (emailPasswordResultLoopIndex === emailPasswordResult.users.length) {
        emailPasswordPaginationToken =
            emailPasswordResult.nextPaginationToken === undefined ? null : emailPasswordResult.nextPaginationToken;
    } else {
        emailPasswordPaginationToken = createNewPaginationToken(
            emailPasswordResult.users[emailPasswordResultLoopIndex].id,
            emailPasswordResult.users[emailPasswordResultLoopIndex].timeJoined
        );
    }

    let nextPaginationToken = combinePaginationTokens(thirdPartyPaginationToken, emailPasswordPaginationToken);
    return {
        users,
        nextPaginationToken,
    };
}
