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

import error from "../../error";
import { BaseRequest, BaseResponse } from "../../framework";
import normalisedURLPath from "../../normalisedURLPath";
import RecipeModule from "../../recipeModule";
import SuperTokensModule from "../../supertokens";
import type { APIHandled, HTTPMethod, NormalisedAppinfo, RecipeListFunction } from "../../types";
import { SessionContainer } from "../session";
import type {
    TypeNormalisedInput,
    RecipeInterface,
    TypeInput,
    AccountInfoAndEmailWithRecipeId,
    AccountInfoWithRecipeId,
} from "./types";
import { validateAndNormaliseUserInput } from "./utils";
import OverrideableBuilder from "supertokens-js-override";
import RecipeImplementation from "./recipeImplementation";
import { Querier } from "../../querier";
import SuperTokensError from "../../error";
import NormalisedURLPath from "../../normalisedURLPath";

export default class Recipe extends RecipeModule {
    private static instance: Recipe | undefined = undefined;

    static RECIPE_ID = "accountlinking";

    config: TypeNormalisedInput;

    recipeInterfaceImpl: RecipeInterface;

    isInServerlessEnv: boolean;

    constructor(
        recipeId: string,
        appInfo: NormalisedAppinfo,
        isInServerlessEnv: boolean,
        config: TypeInput,
        _recipes: {},
        _ingredients: {}
    ) {
        super(recipeId, appInfo);
        this.config = validateAndNormaliseUserInput(appInfo, config);
        this.isInServerlessEnv = isInServerlessEnv;

        {
            let builder = new OverrideableBuilder(
                RecipeImplementation(Querier.getNewInstanceOrThrowError(recipeId), this.config)
            );
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }
    }

    static init(config: TypeInput): RecipeListFunction {
        return (appInfo, isInServerlessEnv) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(
                    Recipe.RECIPE_ID,
                    appInfo,
                    isInServerlessEnv,
                    config,
                    {},
                    {
                        emailDelivery: undefined,
                    }
                );
                return Recipe.instance;
            } else {
                throw new Error("AccountLinking recipe has already been initialised. Please check your code for bugs.");
            }
        };
    }

    static getInstanceOrThrowError(): Recipe {
        if (Recipe.instance === undefined) {
            Recipe.init({})(
                SuperTokensModule.getInstanceOrThrowError().appInfo,
                SuperTokensModule.getInstanceOrThrowError().isInServerlessEnv
            );
        }
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the SuperTokens.init function?");
    }

    getAPIsHandled(): APIHandled[] {
        return [];
    }

    handleAPIRequest(
        _id: string,
        _req: BaseRequest,
        _response: BaseResponse,
        _path: normalisedURLPath,
        _method: HTTPMethod
    ): Promise<boolean> {
        throw new Error("Should never come here");
    }

    handleError(error: error, _request: BaseRequest, _response: BaseResponse): Promise<void> {
        throw error;
    }

    getAllCORSHeaders(): string[] {
        return [];
    }

    isErrorFromThisRecipe(err: any): err is error {
        return SuperTokensError.isErrorFromSuperTokens(err) && err.fromRecipe === Recipe.RECIPE_ID;
    }

    getIdentitiesForPrimaryUserId = async (
        primaryUserId: string
    ): Promise<{
        verified: {
            emails: string[];
            phoneNumbers: string[];
            thirdpartyInfo: {
                thirdpartyId: string;
                thirdpartyUserId: string;
            }[];
        };
        unverified: {
            emails: string[];
            phoneNumbers: string[];
            thirdpartyInfo: {
                thirdpartyId: string;
                thirdpartyUserId: string;
            }[];
        };
    }> => {
        return await Querier.getNewInstanceOrThrowError(this.getRecipeId()).sendGetRequest(
            new NormalisedURLPath("/recipe/accountlinking/user/identities"),
            {
                primaryUserId,
            }
        );
    };

    isSignUpAllowed = async ({
        info,
        userContext,
    }: {
        info: AccountInfoAndEmailWithRecipeId;
        userContext: any;
    }): Promise<boolean> => {
        let identifier:
            | {
                  email: string;
              }
            | {
                  phoneNumber: string;
              };
        if (info.email !== undefined) {
            identifier = {
                email: info.email,
            };
        } else if (info.phoneNumber !== undefined) {
            identifier = {
                phoneNumber: info.phoneNumber,
            };
        } else {
            throw Error("this error should never be thrown");
        }
        let users = await this.recipeInterfaceImpl.listUsersByAccountInfo({
            info: identifier,
            userContext,
        });
        if (users === undefined || users.length === 0) {
            return true;
        }
        let primaryUser = users.find((u) => u.isPrimaryUser);
        if (primaryUser === undefined) {
            return true;
        }
        let shouldDoAccountLinking = await this.config.shouldDoAutomaticAccountLinking(
            info,
            primaryUser,
            undefined,
            userContext
        );
        let shouldRequireVerification = shouldDoAccountLinking.shouldAutomaticallyLink
            ? shouldDoAccountLinking.shouldRequireVerification
            : false;
        if (!shouldRequireVerification) {
            return true;
        }

        /**
         * DISCUSS: new API in core which returns all the verified identities for primaryUserId
         */
        let identitiesForPrimaryUser = await this.getIdentitiesForPrimaryUserId(primaryUser.id);

        if (info.email !== undefined) {
            return identitiesForPrimaryUser.verified.emails.includes(info.email);
        }
        if (info.phoneNumber !== undefined) {
            return identitiesForPrimaryUser.verified.phoneNumbers.includes(info.phoneNumber);
        }
        throw Error("it should never reach here");
    };
    createPrimaryUserIdOrLinkAccountPostSignUp = async ({
        info,
        infoVerified,
        recipeUserId,
        userContext,
    }: {
        info: AccountInfoAndEmailWithRecipeId;
        infoVerified: boolean;
        recipeUserId: string;
        userContext: any;
    }): Promise<string> => {
        let shouldDoAccountLinking = await this.config.shouldDoAutomaticAccountLinking(
            info,
            undefined,
            undefined,
            userContext
        );
        if (shouldDoAccountLinking.shouldAutomaticallyLink && shouldDoAccountLinking.shouldRequireVerification) {
            if (!infoVerified) {
                return recipeUserId;
            }
        }
        let canCreatePrimaryUserId = await this.recipeInterfaceImpl.canCreatePrimaryUserId({
            recipeUserId,
            userContext,
        });
        if (canCreatePrimaryUserId) {
            let user = await this.recipeInterfaceImpl.createPrimaryUser({
                recipeUserId,
                userContext,
            });
            if (user.status !== "OK") {
                throw Error(user.status);
            }
            return user.user.id;
        }
        let identifier:
            | {
                  email: string;
              }
            | {
                  phoneNumber: string;
              };
        if (info.email !== undefined) {
            identifier = {
                email: info.email,
            };
        } else if (info.phoneNumber !== undefined) {
            identifier = {
                phoneNumber: info.phoneNumber,
            };
        } else {
            throw Error("this error should never be thrown");
        }
        let users = await this.recipeInterfaceImpl.listUsersByAccountInfo({
            info: identifier,
            userContext,
        });
        if (users === undefined || users.length === 0) {
            throw Error("this error should never be thrown");
        }
        let primaryUser = users.find((u) => u.isPrimaryUser);
        if (primaryUser === undefined) {
            throw Error("this error should never be thrown");
        }
        shouldDoAccountLinking = await this.config.shouldDoAutomaticAccountLinking(
            info,
            primaryUser,
            undefined,
            userContext
        );
        if (!shouldDoAccountLinking.shouldAutomaticallyLink) {
            return recipeUserId;
        }
        await this.recipeInterfaceImpl.linkAccounts({
            recipeUserId,
            primaryUserId: primaryUser.id,
            userContext,
        });
        return primaryUser.id;
    };

    accountLinkPostSignInViaSession = async ({
        session,
        info,
        infoVerified,
        userContext,
    }: {
        session: SessionContainer;
        info: AccountInfoAndEmailWithRecipeId;
        infoVerified: boolean;
        userContext: any;
    }): Promise<
        | {
              createRecipeUser: true;
              updateVerificationClaim: boolean;
          }
        | ({
              createRecipeUser: false;
          } & (
              | {
                    accountsLinked: true;
                    updateVerificationClaim: boolean;
                }
              | {
                    accountsLinked: false;
                    reason:
                        | "ACCOUNT_LINKING_IS_NOT_ALLOWED_ERROR"
                        | "EXISTING_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR"
                        | "ACCOUNT_INFO_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                        | "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR"
                        | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
                }
          ))
    > => {
        let userId = session.getUserId();
        let user = await this.recipeInterfaceImpl.getUser({
            userId,
            userContext,
        });
        if (user === undefined) {
            throw Error("this should not be thrown");
        }
        if (!user.isPrimaryUser) {
            let shouldDoAccountLinking = await this.config.shouldDoAutomaticAccountLinking(
                info,
                undefined,
                session,
                userContext
            );
            if (!shouldDoAccountLinking.shouldAutomaticallyLink) {
                return {
                    createRecipeUser: false,
                    accountsLinked: false,
                    reason: "ACCOUNT_LINKING_IS_NOT_ALLOWED_ERROR",
                };
            }

            let recipeId = user.linkedRecipes[0].recipeId;
            let querier = Querier.getNewInstanceOrThrowError(recipeId);
            let recipeUser = await querier.sendGetRequest(new NormalisedURLPath("/recipe/user"), {
                userId: user.id,
            });

            shouldDoAccountLinking = await this.config.shouldDoAutomaticAccountLinking(
                recipeUser.user,
                undefined,
                session,
                userContext
            );
            if (!shouldDoAccountLinking.shouldAutomaticallyLink) {
                return {
                    createRecipeUser: false,
                    accountsLinked: false,
                    reason: "ACCOUNT_LINKING_IS_NOT_ALLOWED_ERROR",
                };
            }
            if (shouldDoAccountLinking.shouldRequireVerification) {
                if (recipeId === "emailpassword" || recipeId === "thirdparty") {
                    let querier2 = Querier.getNewInstanceOrThrowError("emailverification");
                    let response = await querier2.sendGetRequest(new NormalisedURLPath("/recipe/user/email/verify"), {
                        userId: recipeUser.user.id,
                        email: recipeUser.user.email,
                    });
                    if (!response.isVerified) {
                        return {
                            createRecipeUser: false,
                            accountsLinked: false,
                            reason: "EXISTING_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR",
                        };
                    }
                }
            }
            let canCreatePrimaryUser = await this.recipeInterfaceImpl.canCreatePrimaryUserId({
                recipeUserId: user.id,
                userContext,
            });
            if (canCreatePrimaryUser.status !== "OK") {
                return {
                    createRecipeUser: false,
                    accountsLinked: false,
                    reason: canCreatePrimaryUser.status,
                };
            }
            let createPrimaryUserResult = await this.recipeInterfaceImpl.createPrimaryUser({
                recipeUserId: user.id,
                userContext,
            });
            if (createPrimaryUserResult.status !== "OK") {
                return {
                    createRecipeUser: false,
                    accountsLinked: false,
                    reason: createPrimaryUserResult.status,
                };
            }
            user = createPrimaryUserResult.user;
        }
        let shouldDoAccountLinking = await this.config.shouldDoAutomaticAccountLinking(
            info,
            user,
            session,
            userContext
        );
        if (!shouldDoAccountLinking.shouldAutomaticallyLink) {
            return {
                createRecipeUser: false,
                accountsLinked: false,
                reason: "ACCOUNT_LINKING_IS_NOT_ALLOWED_ERROR",
            };
        }
        let recipeInfo: AccountInfoWithRecipeId;
        if (info.recipeId === "emailpassword" && info.email !== undefined) {
            recipeInfo = {
                recipeId: "emailpassword",
                email: info.email,
            };
        } else if (info.recipeId === "thirdparty" && info.thirdParty !== undefined) {
            recipeInfo = {
                recipeId: "thirdparty",
                thirdpartyId: info.thirdParty.id,
                thirdpartyUserId: info.thirdParty.userId,
            };
        } else if (info.recipeId === "passwordless" && info.email !== undefined) {
            recipeInfo = {
                recipeId: "passwordless",
                email: info.email,
            };
        } else if (info.recipeId === "passwordless" && info.phoneNumber !== undefined) {
            recipeInfo = {
                recipeId: "passwordless",
                phoneNumber: info.phoneNumber,
            };
        } else {
            throw Error("this error should never be thrown");
        }
        let recipeUser = await this.recipeInterfaceImpl.getUserByAccountInfo({
            info: recipeInfo,
            userContext,
        });
        if (recipeUser === undefined) {
            let identitiesForPrimaryUser = await this.getIdentitiesForPrimaryUserId(user.id);
            if (info.email !== undefined) {
                let result =
                    identitiesForPrimaryUser.verified.emails.includes(info.email) ||
                    identitiesForPrimaryUser.unverified.emails.includes(info.email);
                if (result) {
                    return {
                        createRecipeUser: true,
                        updateVerificationClaim: false,
                    };
                }
            }
            if (info.phoneNumber !== undefined) {
                let result =
                    identitiesForPrimaryUser.verified.phoneNumbers.includes(info.phoneNumber) ||
                    identitiesForPrimaryUser.unverified.phoneNumbers.includes(info.phoneNumber);
                if (result) {
                    return {
                        createRecipeUser: true,
                        updateVerificationClaim: false,
                    };
                }
            }

            let existingRecipeUserForInputInfo = await this.recipeInterfaceImpl.listUsersByAccountInfo({
                info: recipeInfo,
                userContext,
            });
            if (existingRecipeUserForInputInfo !== undefined) {
                let doesPrimaryUserIdAlreadyExists =
                    existingRecipeUserForInputInfo.find((u) => u.isPrimaryUser) !== undefined;
                if (doesPrimaryUserIdAlreadyExists) {
                    return {
                        createRecipeUser: false,
                        accountsLinked: false,
                        reason: "ACCOUNT_INFO_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR",
                    };
                }
            }
            if (!infoVerified) {
                if (shouldDoAccountLinking.shouldRequireVerification) {
                    return {
                        createRecipeUser: true,
                        updateVerificationClaim: true,
                    };
                }
            }
            return {
                createRecipeUser: true,
                updateVerificationClaim: false,
            };
        }
        let canLinkAccounts = await this.recipeInterfaceImpl.canLinkAccounts({
            recipeUserId: recipeUser.id,
            primaryUserId: user.id,
            userContext,
        });
        if (canLinkAccounts.status === "ACCOUNTS_ALREADY_LINKED_ERROR") {
            return {
                createRecipeUser: false,
                accountsLinked: true,
                updateVerificationClaim: false,
            };
        }
        if (canLinkAccounts.status !== "OK") {
            return {
                createRecipeUser: false,
                accountsLinked: false,
                reason: canLinkAccounts.status,
            };
        }

        let identitiesForPrimaryUser = await this.getIdentitiesForPrimaryUserId(user.id);
        let recipeUserIdentifyingInfoIsAssociatedWithPrimaryUser = false;
        if (info.email !== undefined) {
            recipeUserIdentifyingInfoIsAssociatedWithPrimaryUser =
                identitiesForPrimaryUser.verified.emails.includes(info.email) ||
                identitiesForPrimaryUser.unverified.emails.includes(info.email);
        }
        if (!recipeUserIdentifyingInfoIsAssociatedWithPrimaryUser && info.phoneNumber !== undefined) {
            recipeUserIdentifyingInfoIsAssociatedWithPrimaryUser =
                identitiesForPrimaryUser.verified.phoneNumbers.includes(info.phoneNumber) ||
                identitiesForPrimaryUser.unverified.phoneNumbers.includes(info.phoneNumber);
        }
        if (recipeUserIdentifyingInfoIsAssociatedWithPrimaryUser) {
            /**
             * TODO: let's Ly belongs to P1 such that Ly equal to Lx.
             * if LY verified, mark Lx as verified. If Lx is verfied,
             * then mark all Ly as verified
             */
        } else {
            if (shouldDoAccountLinking.shouldRequireVerification) {
                if (!infoVerified) {
                    return {
                        createRecipeUser: false,
                        accountsLinked: false,
                        reason: "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR",
                    };
                }
            }
        }
        await this.recipeInterfaceImpl.linkAccounts({
            recipeUserId: recipeUser.id,
            primaryUserId: user.id,
            userContext,
        });
        return {
            createRecipeUser: false,
            accountsLinked: true,
            updateVerificationClaim: true,
        };
    };
}
