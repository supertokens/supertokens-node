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
    TypeNormalisedInputSignUp,
    TypeContextThirdParty,
    TypeNormalisedInputSessionFeature,
    TypeInputSessionFeature,
    TypeContextEmailPasswordSessionDataAndJWT,
} from "./types";
import { NormalisedFormField } from "../emailpassword/types";
import Recipe from "./recipe";
import { normaliseSignUpFormFields } from "../emailpassword/utils";
import { RecipeImplementation, APIImplementation } from "./";

export function validateAndNormaliseUserInput(
    recipeInstance: Recipe,
    appInfo: NormalisedAppinfo,
    config?: TypeInput
): TypeNormalisedInput {
    validateTheStructureOfUserInput(config, InputSchema, "thirdpartyemailpassword recipe");

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

    let resetPasswordUsingTokenFeature = config === undefined ? undefined : config.resetPasswordUsingTokenFeature;

    let providers = config === undefined || config.providers === undefined ? [] : config.providers;

    let emailVerificationFeature = validateAndNormaliseEmailVerificationConfig(recipeInstance, appInfo, config);

    let override = {
        functions: (originalImplementation: RecipeImplementation) => originalImplementation,
        apis: (originalImplementation: APIImplementation) => originalImplementation,
        ...config?.override,
    };

    return {
        override,
        sessionFeature,
        signUpFeature,
        providers,
        resetPasswordUsingTokenFeature,
        emailVerificationFeature,
    };
}

async function defaultSetSessionDataForSession(
    _: User,
    __: TypeContextEmailPasswordSessionDataAndJWT | TypeContextThirdParty,
    ___: "signin" | "signup"
) {
    return {};
}

async function defaultSetJwtPayloadForSession(
    _: User,
    __: TypeContextEmailPasswordSessionDataAndJWT | TypeContextThirdParty,
    ___: "signin" | "signup"
) {
    return {};
}

function validateAndNormaliseSignUpConfig(
    _: Recipe,
    __: NormalisedAppinfo,
    config?: TypeInputSignUp
): TypeNormalisedInputSignUp {
    let formFields: NormalisedFormField[] = normaliseSignUpFormFields(
        config === undefined ? undefined : config.formFields
    );

    return {
        formFields,
    };
}

function validateAndNormaliseSessionFeatureConfig(
    _: Recipe,
    __: NormalisedAppinfo,
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

function validateAndNormaliseEmailVerificationConfig(
    recipeInstance: Recipe,
    _: NormalisedAppinfo,
    config?: TypeInput
): TypeNormalisedInputEmailVerification {
    return {
        getEmailForUserId: recipeInstance.getEmailForUserId,
        override: config?.override?.emailVerificationFeature,
        createAndSendCustomEmail:
            config?.emailVerificationFeature?.createAndSendCustomEmail === undefined
                ? undefined
                : async (user, link) => {
                      let userInfo = await recipeInstance.recipeInterfaceImpl.getUserById({ userId: user.id });
                      if (
                          userInfo === undefined ||
                          config?.emailVerificationFeature?.createAndSendCustomEmail === undefined
                      ) {
                          throw new Error("Unknown User ID provided");
                      }
                      return await config.emailVerificationFeature.createAndSendCustomEmail(userInfo, link);
                  },
        getEmailVerificationURL:
            config?.emailVerificationFeature?.getEmailVerificationURL === undefined
                ? undefined
                : async (user) => {
                      let userInfo = await recipeInstance.recipeInterfaceImpl.getUserById({ userId: user.id });
                      if (
                          userInfo === undefined ||
                          config?.emailVerificationFeature?.getEmailVerificationURL === undefined
                      ) {
                          throw new Error("Unknown User ID provided");
                      }
                      return await config.emailVerificationFeature.getEmailVerificationURL(userInfo);
                  },
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
    nextPaginationToken: string
): {
    thirdPartyPaginationToken: string | undefined;
    emailPasswordPaginationToken: string | undefined;
} {
    let extractedTokens = Buffer.from(nextPaginationToken, "base64").toString().split(";");
    if (extractedTokens.length !== 2) {
        throw new Error("Pagination token is invalid");
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
