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
import type { APIHandled, HTTPMethod, NormalisedAppinfo, RecipeListFunction, User } from "../../types";
import { SessionContainer } from "../session";
import type {
    TypeNormalisedInput,
    RecipeInterface,
    TypeInput,
    AccountInfoAndEmailWithRecipeId,
    AccountInfoWithRecipeId,
} from "./types";
import { validateAndNormaliseUserInput } from "./utils";
import { getUser, getUserForRecipeId } from "../..";
import OverrideableBuilder from "supertokens-js-override";
import RecipeImplementation from "./recipeImplementation";
import { Querier } from "../../querier";
import SuperTokensError from "../../error";
import EmailVerification from "../emailverification/recipe";

export default class Recipe extends RecipeModule {
    private static instance: Recipe | undefined = undefined;

    static RECIPE_ID = "accountlinking";

    config: TypeNormalisedInput;

    recipeInterfaceImpl: RecipeInterface;

    constructor(recipeId: string, appInfo: NormalisedAppinfo, config: TypeInput, _recipes: {}, _ingredients: {}) {
        super(recipeId, appInfo);
        this.config = validateAndNormaliseUserInput(appInfo, config);

        {
            let builder = new OverrideableBuilder(
                RecipeImplementation(Querier.getNewInstanceOrThrowError(recipeId), this.config)
            );
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }
    }

    static init(config: TypeInput): RecipeListFunction {
        return (appInfo) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(
                    Recipe.RECIPE_ID,
                    appInfo,
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

    getIdentitiesForUser = (
        user: User
    ): {
        verified: {
            emails: string[];
            phoneNumbers: string[];
            thirdpartyInfo: {
                id: string;
                userId: string;
            }[];
        };
        unverified: {
            emails: string[];
            phoneNumbers: string[];
            thirdpartyInfo: {
                id: string;
                userId: string;
            }[];
        };
    } => {
        let identities: {
            verified: {
                emails: string[];
                phoneNumbers: string[];
                thirdpartyInfo: {
                    id: string;
                    userId: string;
                }[];
            };
            unverified: {
                emails: string[];
                phoneNumbers: string[];
                thirdpartyInfo: {
                    id: string;
                    userId: string;
                }[];
            };
        } = {
            verified: {
                emails: [],
                phoneNumbers: [],
                thirdpartyInfo: [],
            },
            unverified: {
                emails: [],
                phoneNumbers: [],
                thirdpartyInfo: [],
            },
        };
        for (let i = 0; i < user.loginMethods.length; i++) {
            let loginMethod = user.loginMethods[i];
            if (loginMethod.email !== undefined) {
                if (loginMethod.verified) {
                    identities.verified.emails.push(loginMethod.email);
                } else {
                    identities.unverified.emails.push(loginMethod.email);
                }
            }
            if (loginMethod.phoneNumber !== undefined) {
                if (loginMethod.verified) {
                    identities.verified.phoneNumbers.push(loginMethod.phoneNumber);
                } else {
                    identities.unverified.phoneNumbers.push(loginMethod.phoneNumber);
                }
            }
            if (loginMethod.thirdParty !== undefined) {
                if (loginMethod.verified) {
                    identities.verified.thirdpartyInfo.push(loginMethod.thirdParty);
                } else {
                    identities.unverified.thirdpartyInfo.push(loginMethod.thirdParty);
                }
            }
        }
        return identities;
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

        let identitiesForPrimaryUser = this.getIdentitiesForUser(primaryUser);

        if (info.email !== undefined) {
            return identitiesForPrimaryUser.verified.emails.includes(info.email);
        }
        if (info.phoneNumber !== undefined) {
            return identitiesForPrimaryUser.verified.phoneNumbers.includes(info.phoneNumber);
        }
        throw Error("it should never reach here");
    };

    markEmailAsVerified = async ({
        email,
        recipeUserId,
        userContext,
    }: {
        email: string;
        recipeUserId: string;
        userContext: any;
    }): Promise<void> => {
        const emailVerificationInstance = EmailVerification.getInstance();
        if (emailVerificationInstance) {
            const tokenResponse = await emailVerificationInstance.recipeInterfaceImpl.createEmailVerificationToken({
                userId: recipeUserId,
                email: email,
                userContext,
            });

            if (tokenResponse.status === "OK") {
                await emailVerificationInstance.recipeInterfaceImpl.verifyEmailUsingToken({
                    token: tokenResponse.token,
                    userContext,
                });
            }
        }
    };

    doPostSignUpAccountLinkingOperations = async ({
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
        if (!shouldDoAccountLinking.shouldAutomaticallyLink) {
            return recipeUserId;
        }
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
                throw Error("should never come here. Error from createPrimaryUser: " + user.status);
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
        let result = await this.recipeInterfaceImpl.linkAccounts({
            recipeUserId,
            primaryUserId: primaryUser.id,
            userContext,
        });
        if (result.status !== "OK") {
            throw Error("this error status shouldn't not be thrown. Error" + result.status);
        }
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
                        | "ACCOUNT_LINKING_NOT_ALLOWED_ERROR"
                        | "EXISTING_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR"
                        | "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR";
                }
              | {
                    accountsLinked: false;
                    reason:
                        | "ACCOUNT_INFO_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                        | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
                    primaryUserId: string;
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
        /**
         * checking if the user with existing session
         * is a primary user or not
         */
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
                    reason: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR",
                };
            }

            let recipeId = user.loginMethods[0].recipeId;
            let recipeUser = await getUserForRecipeId(user.id, recipeId);

            if (recipeUser.user === undefined) {
                throw Error("This error should never be thrown. Check for bug in `getUserForRecipeId` function");
            }

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
                    reason: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR",
                };
            }
            if (shouldDoAccountLinking.shouldRequireVerification) {
                if (!user.loginMethods[0].verified) {
                    return {
                        createRecipeUser: false,
                        accountsLinked: false,
                        reason: "EXISTING_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR",
                    };
                }
            }

            /**
             * checking if primary user can be created for the existing recipe user
             */
            let canCreatePrimaryUser = await this.recipeInterfaceImpl.canCreatePrimaryUserId({
                recipeUserId: user.id,
                userContext,
            });
            if (canCreatePrimaryUser.status !== "OK") {
                return {
                    createRecipeUser: false,
                    accountsLinked: false,
                    reason: canCreatePrimaryUser.status,
                    primaryUserId: canCreatePrimaryUser.primaryUserId,
                };
            }
            /**
             * creating primary user for the recipe user
             */
            let createPrimaryUserResult = await this.recipeInterfaceImpl.createPrimaryUser({
                recipeUserId: user.id,
                userContext,
            });
            if (createPrimaryUserResult.status !== "OK") {
                return {
                    createRecipeUser: false,
                    accountsLinked: false,
                    reason: createPrimaryUserResult.status,
                    primaryUserId: createPrimaryUserResult.primaryUserId,
                };
            }
            user = createPrimaryUserResult.user;
        }
        /**
         * checking if account linking is allowed for given primary user
         * and new login info
         */
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
                reason: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR",
            };
        }

        /**
         * checking if a recipe user already exists for the given
         * login info
         */
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
            /**
             * if recipe user doesn't exists, we check if
             * any of the identifying info associated with
             * the primary user equals to the identifying info
             * of the given input. If so, return createRecipeUser
             * as true to let the recipe know that a recipe user needs
             * to be created and set updateVerificationClaim to false
             * so the recipe will call back this function when the
             * recipe user is created
             */
            let identitiesForPrimaryUser = this.getIdentitiesForUser(user);
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

            /**
             * checking if there already exists any other primary
             * user which is associated with the identifying info
             * for the given input
             */
            let existingRecipeUserForInputInfo = await this.recipeInterfaceImpl.listUsersByAccountInfo({
                info: recipeInfo,
                userContext,
            });
            if (existingRecipeUserForInputInfo !== undefined) {
                let primaryUserIfExists = existingRecipeUserForInputInfo.find((u) => u.isPrimaryUser);
                if (primaryUserIfExists !== undefined) {
                    return {
                        createRecipeUser: false,
                        accountsLinked: false,
                        reason: "ACCOUNT_INFO_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR",
                        primaryUserId: primaryUserIfExists.id,
                    };
                }
            }
            /**
             * if the existing info is not verified, we do want
             * to create a recipe user but don't want recipe
             * to again callback this function for any further
             * linking part. Instead, we want the recipe to
             * update the session claim so it can be known that
             * the new account needs to be verified. so, return
             * createRecipeUser as true to let the recipe know
             * that a recipe user needs to be created and set
             * updateVerificationClaim to true so the recipe will
             * not call back this function and update the session
             * claim instead
             */
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
        /**
         * checking if th primary user (associated with session)
         * and recipe user (associated with login info) can be
         * linked
         */
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
                primaryUserId: canLinkAccounts.primaryUserId,
            };
        }

        let identitiesForPrimaryUser = this.getIdentitiesForUser(user);
        let recipeUserIdentifyingInfoIsAssociatedWithPrimaryUser = false;
        let emailIdentityVerifiedForPrimaryUser = false;
        let phoneNumberIdentityVerifiedForPrimaryUser = false;
        if (info.email !== undefined) {
            recipeUserIdentifyingInfoIsAssociatedWithPrimaryUser =
                identitiesForPrimaryUser.verified.emails.includes(info.email) ||
                identitiesForPrimaryUser.unverified.emails.includes(info.email);
            emailIdentityVerifiedForPrimaryUser = identitiesForPrimaryUser.verified.emails.includes(info.email);
        }
        if (!recipeUserIdentifyingInfoIsAssociatedWithPrimaryUser && info.phoneNumber !== undefined) {
            recipeUserIdentifyingInfoIsAssociatedWithPrimaryUser =
                identitiesForPrimaryUser.verified.phoneNumbers.includes(info.phoneNumber) ||
                identitiesForPrimaryUser.unverified.phoneNumbers.includes(info.phoneNumber);
            phoneNumberIdentityVerifiedForPrimaryUser = identitiesForPrimaryUser.verified.phoneNumbers.includes(
                info.phoneNumber
            );
        }
        if (recipeUserIdentifyingInfoIsAssociatedWithPrimaryUser) {
            /**
             * let's Ly belongs to P1 such that Ly equal to Lx.
             * if LY verified, mark Lx as verified. If Lx is verfied,
             * then mark all Ly as verified
             */
            if (info.email !== undefined && (emailIdentityVerifiedForPrimaryUser || infoVerified)) {
                let recipeUserIdsForEmailVerificationUpdate = user.loginMethods
                    .filter((u) => u.email === info.email && !u.verified)
                    .map((l) => l.email);
                if (!infoVerified) {
                    recipeUserIdsForEmailVerificationUpdate.push(recipeUser.id);
                }
                recipeUserIdsForEmailVerificationUpdate = Array.from(new Set(recipeUserIdsForEmailVerificationUpdate));
                for (let i = 0; i < recipeUserIdsForEmailVerificationUpdate.length; i++) {
                    let rUserId = recipeUserIdsForEmailVerificationUpdate[i];
                    if (rUserId !== undefined) {
                        await this.markEmailAsVerified({
                            email: info.email,
                            recipeUserId: rUserId,
                            userContext,
                        });
                    }
                }
            } else if (info.phoneNumber !== undefined && (phoneNumberIdentityVerifiedForPrimaryUser || infoVerified)) {
                // DISCUSS: should we consider this scenario. phoneNumber will always be verified
            }
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

    getPrimaryUserIdThatCanBeLinkedToRecipeUserId = async ({
        recipeUserId,
        userContext,
    }: {
        recipeUserId: string;
        userContext: any;
    }): Promise<User | undefined> => {
        let user = await getUser(recipeUserId, userContext);
        if (user === undefined) {
            return undefined;
        }
        if (user.isPrimaryUser) {
            return user;
        }
        let pUser = await this.recipeInterfaceImpl.fetchFromAccountToLinkTable({ recipeUserId, userContext });
        if (pUser !== undefined && pUser.isPrimaryUser) {
            return pUser;
        }
        let identifier:
            | {
                  email: string;
              }
            | {
                  phoneNumber: string;
              };
        let loginMethodInfo = user.loginMethods[0]; // this is a recipe user so there will be only one item in the array
        if (loginMethodInfo.email !== undefined) {
            identifier = {
                email: loginMethodInfo.email,
            };
        } else if (loginMethodInfo.phoneNumber !== undefined) {
            identifier = {
                phoneNumber: loginMethodInfo.phoneNumber,
            };
        } else {
            throw Error("this error should never be thrown");
        }
        let users = await this.recipeInterfaceImpl.listUsersByAccountInfo({
            info: identifier,
            userContext,
        });
        if (users === undefined || users.length === 0) {
            return undefined;
        }
        return users.find((u) => u.isPrimaryUser);
    };

    createPrimaryUserIdOrLinkAccounts = async ({
        recipeUserId,
        session,
        userContext,
    }: {
        recipeUserId: string;
        session: SessionContainer | undefined;
        userContext: any;
    }) => {
        let primaryUser = await this.getPrimaryUserIdThatCanBeLinkedToRecipeUserId({
            recipeUserId,
            userContext,
        });
        if (primaryUser === undefined) {
            let user = await getUser(recipeUserId, userContext);
            if (user === undefined || user.isPrimaryUser) {
                throw Error("this error should never be thrown");
            }
            let shouldDoAccountLinking = await this.config.shouldDoAutomaticAccountLinking(
                {
                    ...user.loginMethods[0],
                },
                undefined,
                session,
                userContext
            );
            if (shouldDoAccountLinking.shouldAutomaticallyLink) {
                await this.recipeInterfaceImpl.createPrimaryUser({
                    recipeUserId: recipeUserId,
                    userContext,
                });
                // TODO: remove session claim
            }
        } else {
            /**
             * recipeUser already linked with primaryUser
             */
            let recipeUser = primaryUser.loginMethods.find((u) => u.id === recipeUserId);
            if (recipeUser === undefined) {
                let user = await getUser(recipeUserId, userContext);
                if (user === undefined || user.isPrimaryUser) {
                    throw Error("this error should never be thrown");
                }
                let shouldDoAccountLinking = await this.config.shouldDoAutomaticAccountLinking(
                    {
                        ...user.loginMethods[0],
                    },
                    primaryUser,
                    session,
                    userContext
                );
                if (shouldDoAccountLinking.shouldAutomaticallyLink) {
                    let linkAccountsResult = await this.recipeInterfaceImpl.linkAccounts({
                        recipeUserId: recipeUserId,
                        primaryUserId: primaryUser.id,
                        userContext,
                    });
                    if (linkAccountsResult.status === "OK") {
                        // TODO: remove session claim if session claim exists
                        // else create a new session
                    }
                }
            }
        }
    };
}
