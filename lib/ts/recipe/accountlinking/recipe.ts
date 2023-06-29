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
import type { BaseRequest, BaseResponse } from "../../framework";
import normalisedURLPath from "../../normalisedURLPath";
import RecipeModule from "../../recipeModule";
import type { APIHandled, HTTPMethod, NormalisedAppinfo, RecipeListFunction, User } from "../../types";
import type { SessionContainerInterface } from "../session/types";
import type { TypeNormalisedInput, RecipeInterface, TypeInput, AccountInfoWithRecipeId } from "./types";
import { validateAndNormaliseUserInput } from "./utils";
import OverrideableBuilder from "supertokens-js-override";
import RecipeImplementation from "./recipeImplementation";
import { Querier } from "../../querier";
import SuperTokensError from "../../error";
import SessionError from "../session/error";
import supertokens from "../../supertokens";
import RecipeUserId from "../../recipeUserId";
import { ProcessState, PROCESS_STATE } from "../../processState";
import { logDebugMessage } from "../../logger";
import { mockReset } from "./mockCore";
import EmailVerificationRecipe from "../emailverification/recipe";

export default class Recipe extends RecipeModule {
    private static instance: Recipe | undefined = undefined;

    static RECIPE_ID = "accountlinking";

    config: TypeNormalisedInput;

    recipeInterfaceImpl: RecipeInterface;

    constructor(
        recipeId: string,
        appInfo: NormalisedAppinfo,
        config: TypeInput | undefined,
        _recipes: {},
        _ingredients: {}
    ) {
        super(recipeId, appInfo);
        this.config = validateAndNormaliseUserInput(appInfo, config);

        {
            let builder = new OverrideableBuilder(
                RecipeImplementation(Querier.getNewInstanceOrThrowError(recipeId), this.config, this)
            );
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }
    }

    static init(config?: TypeInput): RecipeListFunction {
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

    // we auto init the account linking recipe here cause we always require this
    // to be initialized even if the user has not initialized it.
    // The side effect of this is that if there are any APIs or errors specific to this recipe,
    // those won't be handled by the supertokens middleware and error handler (cause this recipe
    // is not in the recipeList).
    static getInstance(): Recipe {
        if (Recipe.instance === undefined) {
            Recipe.init()(
                supertokens.getInstanceOrThrowError().appInfo,
                supertokens.getInstanceOrThrowError().isInServerlessEnv
            );
        }
        return Recipe.instance!;
    }

    getAPIsHandled(): APIHandled[] {
        // APIs won't be added to the supertokens middleware cause we are auto initializing
        // it in getInstance function
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
        // Errors won't come here cause we are auto initializing
        // it in getInstance function
        throw error;
    }

    getAllCORSHeaders(): string[] {
        return [];
    }

    isErrorFromThisRecipe(err: any): err is error {
        return SuperTokensError.isErrorFromSuperTokens(err) && err.fromRecipe === Recipe.RECIPE_ID;
    }

    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new Error("calling testing function in non testing env");
        }
        Recipe.instance = undefined;
        mockReset();
    }

    // this function returns the user ID for which the session will be created.
    createPrimaryUserIdOrLinkAccounts = async ({
        recipeUserId,
        checkAccountsToLinkTableAsWell,
        userContext,
    }: {
        recipeUserId: RecipeUserId;
        checkAccountsToLinkTableAsWell: boolean;
        userContext: any;
    }): Promise<string> => {
        let recipeUser = await this.recipeInterfaceImpl.getUser({ userId: recipeUserId.getAsString(), userContext });
        if (recipeUser === undefined) {
            // This can come here if the user is using session + email verification
            // recipe with a user ID that is not known to supertokens. In this case,
            // we do not allow linking for such users.
            return recipeUserId.getAsString();
        }

        if (recipeUser.isPrimaryUser) {
            return recipeUser.id;
        }

        // now we try and find a linking candidate.
        let primaryUser = await this.getPrimaryUserIdThatCanBeLinkedToRecipeUserId({
            recipeUserId,
            checkAccountsToLinkTableAsWell,
            userContext,
        });

        if (primaryUser === undefined) {
            // this means that this can become a primary user.

            // we can use the 0 index cause this user is
            // not a primary user.
            let shouldDoAccountLinking = await this.config.shouldDoAutomaticAccountLinking(
                recipeUser.loginMethods[0],
                undefined,
                undefined,
                userContext
            );

            if (!shouldDoAccountLinking.shouldAutomaticallyLink) {
                return recipeUserId.getAsString();
            }

            if (shouldDoAccountLinking.shouldRequireVerification && !recipeUser.loginMethods[0].verified) {
                return recipeUserId.getAsString();
            }

            let createPrimaryUserResult = await this.recipeInterfaceImpl.createPrimaryUser({
                recipeUserId: recipeUserId,
                userContext,
            });

            if (createPrimaryUserResult.status === "OK") {
                return createPrimaryUserResult.user.id;
            }

            // status is "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR" or "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR"

            // if it comes here, it means that the recipe
            // user ID is already linked to another primary
            // user id (race condition), or that some other
            // primary user ID exists with the same email / phone number (again, race condition).
            // So we do recursion here to try again.
            return await this.createPrimaryUserIdOrLinkAccounts({
                recipeUserId,
                checkAccountsToLinkTableAsWell,
                userContext,
            });
        } else {
            if (primaryUser.id === recipeUser.id) {
                // This can only happen cause of a race condition cause we already check
                // if the input recipeUserId is a primary user early on in the function.
                return recipeUserId.getAsString();
            }
            // this means that we found a primary user ID which can be linked to this recipe user ID. So we try and link them.

            // we can use the 0 index cause this user is
            // not a primary user.
            let shouldDoAccountLinking = await this.config.shouldDoAutomaticAccountLinking(
                recipeUser.loginMethods[0],
                primaryUser,
                undefined,
                userContext
            );

            if (!shouldDoAccountLinking.shouldAutomaticallyLink) {
                return recipeUserId.getAsString();
            }

            if (shouldDoAccountLinking.shouldRequireVerification && !recipeUser.loginMethods[0].verified) {
                return recipeUserId.getAsString();
            }

            let linkAccountsResult = await this.recipeInterfaceImpl.linkAccounts({
                recipeUserId: recipeUserId,
                primaryUserId: primaryUser.id,
                userContext,
            });

            if (linkAccountsResult.status === "OK") {
                return primaryUser.id;
            } else if (
                linkAccountsResult.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
            ) {
                // this can happen cause of a race condition
                // wherein the recipe user ID get's linked to
                // some other primary user whilst this function is running.
                // But this is OK cause we just care about
                // returning the user ID of the linked user
                // which the result has.
                return linkAccountsResult.primaryUserId;
            } else if (linkAccountsResult.status === "INPUT_USER_IS_NOT_A_PRIMARY_USER") {
                // this can be possible during a race condition wherein the primary user
                // that we fetched somehow is no more a primary user. This can happen if
                // the unlink function was called in parallel on that user. So we can just recurse
                return await this.createPrimaryUserIdOrLinkAccounts({
                    recipeUserId,
                    checkAccountsToLinkTableAsWell,
                    userContext,
                });
            } else {
                // status is "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                // it can come here if the recipe user ID
                // can't be linked to the primary user ID cause
                // the email / phone number is associated with some other primary user ID.
                // This can happen due to a race condition in which
                // the email has changed from one primary user to another during this function call,
                // or it can happen if the accounts to link table
                // contains a user which this is supposed to
                // be linked to, but we can't link it cause during the time the user was added to that table and now, some other primary user has
                // got this email.

                // So we try again, but without caring about
                // the accounts to link table (cause they we will end up in an infinite recursion).
                return await this.createPrimaryUserIdOrLinkAccounts({
                    recipeUserId,
                    checkAccountsToLinkTableAsWell: false,
                    userContext,
                });
            }
        }
    };

    getPrimaryUserIdThatCanBeLinkedToRecipeUserId = async ({
        recipeUserId,
        checkAccountsToLinkTableAsWell,
        userContext,
    }: {
        recipeUserId: RecipeUserId;
        checkAccountsToLinkTableAsWell: boolean;
        userContext: any;
    }): Promise<User | undefined> => {
        // first we check if this user itself is a
        // primary user or not. If it is, we return that.
        let user = await this.recipeInterfaceImpl.getUser({ userId: recipeUserId.getAsString(), userContext });
        if (user === undefined) {
            return undefined;
        }
        if (user.isPrimaryUser) {
            return user;
        }

        // then we check the accounts to link table. This
        // table can have an entry if this user was trying
        // to be linked to another user post sign in but required
        // email verification.
        if (checkAccountsToLinkTableAsWell) {
            let pUserId = await this.recipeInterfaceImpl.fetchFromAccountToLinkTable({ recipeUserId, userContext });
            if (pUserId !== undefined) {
                let pUser = await this.recipeInterfaceImpl.getUser({ userId: pUserId, userContext });
                if (pUser !== undefined && pUser.isPrimaryUser) {
                    return pUser;
                }
            }
        }

        // finally, we try and find a primary user based on
        // the email / phone number / third party ID.
        let users = await this.recipeInterfaceImpl.listUsersByAccountInfo({
            accountInfo: user.loginMethods[0],
            doUnionOfAccountInfo: true,
            userContext,
        });
        let pUsers = users.filter((u) => u.isPrimaryUser);
        if (pUsers.length > 1) {
            // this means that the new user has account info such that it's
            // spread across multiple primary user IDs. In this case, even
            // if we return one of them, it won't be able to be linked anyway
            // cause if we did, it would mean 2 primary users would have the
            // same account info. So we return undefined

            /**
             * this being said, with the current set of auth recipes, it should
             * never come here - cause:
             * ----> If the recipeuserid is a passwordless user, then it can have either a phone
             * email or both. If it has just one of them, then anyway 2 primary users can't
             * exist with the same phone number / email. If it has both, then the only way
             * that it can have multiple primary users returned is if there is another passwordless
             * primary user with the same phone number - which is not possible, cause phone
             * numbers are unique across passwordless users.
             *
             * ----> If the input is a third party user, then it has third party info and an email. Now there can be able to primary user with the same email, but
             * there can't be another thirdparty user with the same third party info (since that is unique).
             * Nor can there an email password primary user with the same email along with another
             * thirdparty primary user with the same email (since emails can't be the same across primary users).
             *
             * ----> If the input is an email password user, then it has an email. There can't be multiple primary users with the same email anyway.
             */
            throw new Error("You found a bug. Please report it on github.com/supertokens/supertokens-node");
        }
        return pUsers.length === 0 ? undefined : pUsers[0];
    };

    isSignInAllowed = async ({
        recipeUserId,
        userContext,
    }: {
        recipeUserId: RecipeUserId;
        userContext: any;
    }): Promise<boolean> => {
        ProcessState.getInstance().addState(PROCESS_STATE.IS_SIGN_IN_ALLOWED_CALLED);
        let user = await this.recipeInterfaceImpl.getUser({ userId: recipeUserId.getAsString(), userContext });
        if (user === undefined) {
            throw new Error("Should never come here");
        }

        if (user.isPrimaryUser) {
            return true;
        }

        // this is now a recipe user sign in.
        let isVerified = true;
        try {
            EmailVerificationRecipe.getInstanceOrThrowError();
            let emailInfo = await EmailVerificationRecipe.getInstanceOrThrowError().getEmailForRecipeUserId(
                user.loginMethods[0].recipeUserId,
                userContext
            );
            if (emailInfo.status === "OK") {
                isVerified = await EmailVerificationRecipe.getInstanceOrThrowError().recipeInterfaceImpl.isEmailVerified(
                    {
                        recipeUserId: user.loginMethods[0].recipeUserId,
                        email: emailInfo.email,
                        userContext,
                    }
                );
            }
        } catch (ignored) {}

        return this.isSignInUpAllowedHelper({
            accountInfo: user.loginMethods[0],
            isVerified,
            userContext,
        });
    };

    isSignUpAllowed = async ({
        newUser,
        isVerified,
        userContext,
    }: {
        newUser: AccountInfoWithRecipeId;
        isVerified: boolean;
        userContext: any;
    }): Promise<boolean> => {
        ProcessState.getInstance().addState(PROCESS_STATE.IS_SIGN_UP_ALLOWED_CALLED);
        if (newUser.email !== undefined && newUser.phoneNumber !== undefined) {
            // we do this check cause below when we call listUsersByAccountInfo,
            // we only pass in one of email or phone number
            throw new Error("Please pass one of email or phone number, not both");
        }

        return this.isSignInUpAllowedHelper({
            accountInfo: newUser,
            isVerified,
            userContext,
        });
    };

    isSignInUpAllowedHelper = async ({
        accountInfo,
        isVerified,
        userContext,
    }: {
        accountInfo: AccountInfoWithRecipeId;
        isVerified: boolean;
        userContext: any;
    }): Promise<boolean> => {
        ProcessState.getInstance().addState(PROCESS_STATE.IS_SIGN_IN_UP_ALLOWED_HELPER_CALLED);
        // since this is a recipe level user, we have to do the following checks
        // before allowing sign in. We do these checks cause sign in also attempts
        // account linking:
        // - If there is no primary user for this user's account info, then
        // we check if any recipe user exist with the same info and it's not verified. If we
        // find one, we disallow signing in cause when this user becomes a primary user,
        // it may cause that other recipe user to be linked to this and if that recipe user
        // is owned by an attacker, it will lead to an account take over case
        // - If there exists another primary user, and if this user is not verified, we will
        // disallow cause if after sign in, this user sends an email verification email
        // to the email, then the primary user may click on it by mistake and get their account
        // taken over.
        // - If there exists another primary user, and that user's email is not verified,
        // then we disallow sign in cause that primary user may be owned by an attacker
        // and after this email is verified, it will link to that account causing account
        // takeover.

        // we find other accounts based on the email / phone number.
        // we do not pass in third party info, or both email or phone
        // cause we want to guarantee that the output array contains just one
        // primary user.
        let users = await this.recipeInterfaceImpl.listUsersByAccountInfo({
            accountInfo,
            doUnionOfAccountInfo: true,
            userContext,
        });
        if (users.length === 0) {
            logDebugMessage("isSignInUpAllowedHelper returning true because no user with given account info");
            // this is a brand new email / phone number, so we allow sign up.
            return true;
        }

        // now we check if there exists some primary user with the same email / phone number
        // such that that info is not verified for that account. In this case, we do not allow
        // sign up cause we cannot link this new account to that primary account yet (since
        // the email / phone is unverified - this is to prevent an attack where an attacker
        // might have access to the unverified account's primary user and we do not want to
        // link this account to that one), and we can't make this a primary user either (since
        // then there would be two primary users with the same email / phone number - which is
        // not allowed..)
        const primaryUsers = users.filter((u) => u.isPrimaryUser);
        if (primaryUsers.length === 0) {
            logDebugMessage("isSignInUpAllowedHelper no primary user exists");
            // since there is no primary user, it means that this user, if signed up, will end up
            // being the primary user. In this case, we check if any of the non primary user's
            // are in an unverified state having the same account info, and if they are, then we
            // disallow this sign up, cause if the user becomes the primary user, and then the other
            // account which is unverified sends an email verification email, the legit user might
            // click on the link and that account (which was unverified and could have been controlled
            // by an attacker), will end up getting linked to this account.

            let shouldDoAccountLinking = await this.config.shouldDoAutomaticAccountLinking(
                accountInfo,
                undefined,
                undefined,
                userContext
            );
            if (!shouldDoAccountLinking.shouldAutomaticallyLink) {
                logDebugMessage("isSignInUpAllowedHelper returning true because account linking is disabled");
                return true;
            }
            if (!shouldDoAccountLinking.shouldRequireVerification) {
                logDebugMessage(
                    "isSignInUpAllowedHelper returning true because dec does not require email verification"
                );
                // the dev says they do not care about verification before account linking
                // so we are OK with the risk mentioned above.
                return true;
            }

            let shouldAllow = true;
            for (let i = 0; i < users.length; i++) {
                let currUser = users[i]; // all these are not primary users, so we can use
                // loginMethods[0] to get the account info.
                let thisIterationIsVerified = false;
                if (accountInfo.email !== undefined) {
                    if (
                        currUser.loginMethods[0].hasSameEmailAs(accountInfo.email) &&
                        currUser.loginMethods[0].verified
                    ) {
                        logDebugMessage("isSignInUpAllowedHelper found same email for another user and verified");
                        thisIterationIsVerified = true;
                    }
                }

                if (accountInfo.phoneNumber !== undefined) {
                    if (
                        currUser.loginMethods[0].hasSamePhoneNumberAs(accountInfo.phoneNumber) &&
                        currUser.loginMethods[0].verified
                    ) {
                        logDebugMessage(
                            "isSignInUpAllowedHelper found same phone number for another user and verified"
                        );
                        thisIterationIsVerified = true;
                    }
                }
                if (!thisIterationIsVerified) {
                    // even if one of the users is not verified, we do not allow sign up (see why above).
                    // Sure, this allows attackers to create email password accounts with an email
                    // to block actual users from signing up, but that's ok, since those
                    // users will just see an email already exists error and then will try another
                    // login method. They can also still just go through the password reset flow
                    // and then gain access to their email password account (which can then be verified).
                    logDebugMessage(
                        "isSignInUpAllowedHelper returning false cause one of the other recipe level users is not verified"
                    );
                    shouldAllow = false;
                    break;
                }
            }
            ProcessState.getInstance().addState(PROCESS_STATE.IS_SIGN_IN_UP_ALLOWED_NO_PRIMARY_USER_EXISTS);
            logDebugMessage("isSignInUpAllowedHelper returning " + shouldAllow);
            return shouldAllow;
        } else {
            if (primaryUsers.length > 1) {
                throw new Error(
                    "You have found a bug. Please report to https://github.com/supertokens/supertokens-node/issues"
                );
            }
            let primaryUser = primaryUsers[0];
            logDebugMessage("isSignInUpAllowedHelper primary user found");
            let shouldDoAccountLinking = await this.config.shouldDoAutomaticAccountLinking(
                accountInfo,
                primaryUser,
                undefined,
                userContext
            );
            if (!shouldDoAccountLinking.shouldAutomaticallyLink) {
                logDebugMessage("isSignInUpAllowedHelper returning true because account linking is disabled");
                return true;
            }
            if (!shouldDoAccountLinking.shouldRequireVerification) {
                logDebugMessage(
                    "isSignInUpAllowedHelper returning true because dec does not require email verification"
                );
                // the dev says they do not care about verification before account linking
                // so we can link this new user to the primary user post recipe user creation
                // even if that user's email / phone number is not verified.
                return true;
            }

            if (!isVerified) {
                logDebugMessage(
                    "isSignInUpAllowedHelper returning false because new user's email is not verified, and primary user with the same email was found."
                );
                // this will exist early with a false here cause it means that
                // if we come here, the newUser will be linked to the primary user post email
                // verification. Whilst this seems OK, there is a risk that the actual user might
                // click on the email verification link thinking that they it's for their existing
                // (legit) account, and then the attacker (who signed up with email password maybe)
                // will have access to the account - cause email verification will cause account linking.

                // We do this AFTER calling shouldDoAutomaticAccountLinking cause
                // in case email verification is not required, then linking should not be
                // an issue anyway.
                return false;
            }

            // we check for even if one is verified as opposed to all being unverified cause
            // even if one is verified, we know that the email / phone number is owned by the
            // primary account holder.

            // we only check this for primary user and not other users in the users array cause
            // they are all recipe users. The reason why we ignore them is cause, in normal
            // situations, they should not exist cause:
            // - if primary user was created first, then the recipe user creation would not
            // be allowed via unverified means of login method (like email password).
            // - if recipe user was created first, and is unverified, then the primary user
            // sign up should not be possible either.
            for (let i = 0; i < primaryUser.loginMethods.length; i++) {
                let lM = primaryUser.loginMethods[i];
                if (lM.email !== undefined) {
                    if (lM.hasSameEmailAs(accountInfo.email) && lM.verified) {
                        logDebugMessage(
                            "isSignInUpAllowedHelper returning true cause found same email for primary user and verified"
                        );
                        return true;
                    }
                }

                if (lM.phoneNumber !== undefined) {
                    if (lM.hasSamePhoneNumberAs(accountInfo.phoneNumber) && lM.verified) {
                        logDebugMessage(
                            "isSignInUpAllowedHelper returning true cause found same phone number for primary user and verified"
                        );
                        return true;
                    }
                }
            }
            logDebugMessage(
                "isSignInUpAllowedHelper returning false cause primary user does not have the same email or phone number that is verified"
            );
            return false;
        }
    };

    linkAccountWithUserFromSession = async <T>({
        session,
        newUser,
        createRecipeUserFunc,
        verifyCredentialsFunc,
        userContext,
    }: {
        session: SessionContainerInterface;
        newUser: AccountInfoWithRecipeId;
        createRecipeUserFunc: (userContext: any) => Promise<void>;
        verifyCredentialsFunc: (
            userContext: any
        ) => Promise<
            | { status: "OK" }
            | {
                  status: "CUSTOM_RESPONSE";
                  resp: T;
              }
        >;
        userContext: any;
    }): Promise<
        | {
              status: "OK";
              wereAccountsAlreadyLinked: boolean;
          }
        | {
              status: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR";
              description: string;
          }
        | {
              status: "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR";
              primaryUserId: string;
              recipeUserId: RecipeUserId;
          }
        | {
              status: "CUSTOM_RESPONSE";
              resp: T;
          }
    > => {
        if (newUser.email !== undefined && newUser.phoneNumber !== undefined) {
            // we do this check just to enforce that user's can't sign in / up
            // with email and phone at the same time.
            throw new Error("Please pass one of email or phone number, not both");
        }

        // In order to link the newUser to the session user,
        // we need to first make sure that the session user
        // is a primary user (or make them one if they are not).

        let existingUser = await this.recipeInterfaceImpl.getUser({
            userId: session.getUserId(),
            userContext,
        });

        if (existingUser === undefined) {
            // this can come here if the user ID in the session belongs to a user
            // that is not recognized by SuperTokens. In this case, we
            // simply return the session user ID
            return {
                status: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR",
                description:
                    "Accounts cannot be linked because the session belongs to a user ID that does not exist in SuperTokens.",
            };
        }

        if (!existingUser.isPrimaryUser) {
            // we will try and make the existing user a primary user. But before that, we must ask
            // the dev if they want to allow for that.

            // here we can use the index of 0 cause the existingUser is not a primary user,
            // therefore it will only have one login method in the loginMethods' array.

            const shouldDoAccountLinkingOfExistingUser = await this.config.shouldDoAutomaticAccountLinking(
                existingUser.loginMethods[0],
                undefined,
                session,
                userContext
            );

            if (!shouldDoAccountLinkingOfExistingUser.shouldAutomaticallyLink) {
                return {
                    status: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR",
                    description: "Account linking not allowed by the developer for existing user.",
                };
            }

            if (
                shouldDoAccountLinkingOfExistingUser.shouldRequireVerification &&
                !existingUser.loginMethods[0].verified
            ) {
                // We do not allow creation of primary user
                // if the existing user is not verified
                // cause if we do, then it blocks sign up
                // with other methods for the same email / phone number
                // until this account is verified. This can be
                // used by an attacker to prevent sign up from
                // their victim by setting the account
                // in this state and not verifying the account.
                // The downside to this is that cause of this,
                // in situations like MFA, we are forcing
                // email verification to happen right after the user
                // has finished setting up the second factor.
                // This may not be something that the developer
                // wants. But they can always switch this off
                // by providing the right impl for shouldDoAutomaticAccountLinking

                // this is equivalent to throwing the email verification claim error
                throw new SessionError({
                    type: SessionError.INVALID_CLAIMS,
                    payload: [
                        {
                            id: "st-ev",
                            reason: { message: "wrong value", expectedValue: true, actualValue: false },
                        },
                    ],
                    message: "INVALID_CLAIMS",
                });
            }

            // now we can try and create a primary user for the existing user
            let createPrimaryUserResult = await this.recipeInterfaceImpl.createPrimaryUser({
                recipeUserId: existingUser.loginMethods[0].recipeUserId,
                userContext,
            });

            if (createPrimaryUserResult.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR") {
                // this can happen if there is a race condition in which the
                // existing user becomes a primary user ID by the time the code
                // execution comes into this block. So we call the function once again.
                return await this.linkAccountWithUserFromSession({
                    session,
                    newUser,
                    createRecipeUserFunc,
                    verifyCredentialsFunc,
                    userContext,
                });
            } else if (
                createPrimaryUserResult.status === "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
            ) {
                /* this can come here if in the following example: 
                - User creates a primary account (P1) using email R
                - User2 created another account (A2) with email R (but this is not yet linked to P1 cause maybe A2 is not a candidate for account linking)
                - Now User2 is logged in with A2 account, and they are trying to link with another account.
                - In this case, existingUser (A2 account), cannot become a primary user
                - So we are in a stuck state, and must ask the end user to contact support*/
                return {
                    status: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR",
                    description:
                        "No account can be linked to the session account cause the session account is not a primary account and the account info is already associated with another primary account, so we cannot make this a primary account either. Please contact support.",
                };
            } else if (createPrimaryUserResult.status === "OK") {
                // this if condition is not needed, but for some reason TS complains if it's not there.
                existingUser = createPrimaryUserResult.user;
            }

            // at this point, the existingUser is a primary user. So we can
            // go ahead and attempt account linking for the new user and existingUser.
        }

        // before proceeding to link the two accounts, we must ask the dev if it's allowed to link them

        const shouldDoAccountLinking = await this.config.shouldDoAutomaticAccountLinking(
            newUser,
            existingUser,
            session,
            userContext
        );
        if (!shouldDoAccountLinking.shouldAutomaticallyLink) {
            return {
                status: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR",
                description: "Account linking not allowed by the developer for new account.",
            };
        }

        // in order to link accounts, we need to have the recipe user ID of the new account.
        let usersArrayThatHaveSameAccountInfoAsNewUser = await this.recipeInterfaceImpl.listUsersByAccountInfo({
            accountInfo: newUser,
            doUnionOfAccountInfo: true, // we pass in true so that we can get the max number of users
            // that have this account info.
            userContext,
        });

        const userObjThatHasSameAccountInfoAndRecipeIdAsNewUser = usersArrayThatHaveSameAccountInfoAsNewUser.find(
            (u) =>
                u.loginMethods.find((lU) => {
                    if (lU.recipeId !== newUser.recipeId) {
                        return false;
                    }
                    if (newUser.recipeId === "thirdparty") {
                        return lU.hasSameThirdPartyInfoAs(newUser.thirdParty!);
                    } else {
                        return lU.hasSameEmailAs(newUser.email) || lU.hasSamePhoneNumberAs(newUser.phoneNumber);
                    }
                }) !== undefined
        );

        if (userObjThatHasSameAccountInfoAndRecipeIdAsNewUser === undefined) {
            /*
            Before proceeding to linking accounts, we need to create the recipe user ID associated
            with newUser. In order to do that we should check if there is some other primary user
            has the same account info - cause if there is, then linking to this existingUser will not
            be possible anyway, so we don't create a new recipe user cause if we did, then this
            recipe user will not be a candidate for automatic account linking in the future
            */

            let otherPrimaryUsers = usersArrayThatHaveSameAccountInfoAsNewUser.filter((u) => u.isPrimaryUser);
            for (let i = 0; i < otherPrimaryUsers.length; i++) {
                if (otherPrimaryUsers[i].id !== existingUser.id) {
                    return {
                        status: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR",
                        description:
                            "Not allowed because it will lead to two primary user id having same account info.",
                    };
                }
            }

            /**
             * We do not call isSignUpAllowed because it returns false in the following cases:
             *
             * - There exists no primary user with the same email or phone number as the new user,
             * but there exists other recipe users with the same email or phone number, and at least
             * one of these recipe users have their info as unverified. See the comments in
             * isSignUpAllowed for more info on why we prevented this. But we allow it here cause
             * if we didn't and forced the user to verify the other recipe user, it may end
             * up that that user becomes a primary user, in which case, linking to the existing
             * session's account will not be possible.
             *
             * - There exists a primary user with the same email / phone number that is not verified.
             * If the current session is that primary user, then we still allow linking cause
             * they have logged into the current session as well (proving they have ownership
             * of the account). If that current session is NOT that primary user, then it
             * would have failed in the above check itself.
             *
             * - This email is not verified, and there exists a primary user for this email / phone
             * number. The only way it can come here is if that primary user is the current session's
             * user as well (else the above check would fail). So we are OK with linking even though
             * the newUser is not verified cause they have logged into the primary user's account
             * when calling this function proving ownership AND the emails are the same.
             *
             */

            // we create the new recipe user
            await createRecipeUserFunc(userContext);

            // now when we recurse, the new recipe user will be found and we can try linking again.
            return await this.linkAccountWithUserFromSession({
                session,
                newUser,
                createRecipeUserFunc,
                verifyCredentialsFunc,
                userContext,
            });
        } else {
            // since the user already exists, we should first verify the credentials
            // before continuing to link the accounts.
            let verifyResult = await verifyCredentialsFunc(userContext);
            if (verifyResult.status === "CUSTOM_RESPONSE") {
                return verifyResult;
            }
            // this means that the verification was fine and we can continue..
        }

        // we check if the userObjThatHasSameAccountInfoAndRecipeIdAsNewUser is
        // a primary user or not, and if it is, then it means that our newUser
        // is already linked so we can return early.

        // we do this even though it will be checked later during linkAccounts function
        // call cause we do not want to do the email verification check that's below this block,
        // in case this block errors out so that we do not make the user go through the email
        // verification flow unnecessarily.

        if (userObjThatHasSameAccountInfoAndRecipeIdAsNewUser.isPrimaryUser) {
            if (userObjThatHasSameAccountInfoAndRecipeIdAsNewUser.id === existingUser.id) {
                // this means that the accounts we want to link are already linked.
                return {
                    status: "OK",
                    wereAccountsAlreadyLinked: true,
                };
            } else {
                return {
                    status: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR",
                    description: "New user is already linked to another account or is a primary user.",
                };
            }
        }

        // now we check about the email verification of the new user. If it's verified, we proceed
        // to try and link the accounts, and if not, we send email verification error ONLY if the email
        // or phone number of the new account is different compared to the existing account.
        if (usersArrayThatHaveSameAccountInfoAsNewUser.find((u) => u.id === existingUser!.id) === undefined) {
            // this means that the existing user does not share anything in common with the new user
            // in terms of account info. So we check for email verification status..

            if (
                !userObjThatHasSameAccountInfoAndRecipeIdAsNewUser.loginMethods[0].verified &&
                shouldDoAccountLinking.shouldRequireVerification
            ) {
                // we stop the flow and ask the user to verify this email first.
                // the recipe ID is the userObjThatHasSameAccountInfoAndRecipeIdAsNewUser.id
                // cause above we checked that userObjThatHasSameAccountInfoAndRecipeIdAsNewUser.isPrimaryUser is false.

                // before returning the response, we save the fact that these two
                // accounts need to be linked, so that after email verification, the
                // linking is done correctly.

                let toLinkResult = await this.recipeInterfaceImpl.storeIntoAccountToLinkTable({
                    recipeUserId: userObjThatHasSameAccountInfoAndRecipeIdAsNewUser.loginMethods[0].recipeUserId,
                    primaryUserId: existingUser.id,
                    userContext,
                });
                if (toLinkResult.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR") {
                    if (toLinkResult.primaryUserId === existingUser.id) {
                        // this is some sort of a race condition issue, so we just ignore it
                        // since we already linked to the session's account anyway...
                        return {
                            status: "OK",
                            wereAccountsAlreadyLinked: true,
                        };
                    } else {
                        return {
                            status: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR",
                            description: "New user is already linked to another account or is a primary user.",
                        };
                    }
                } else if (toLinkResult.status === "INPUT_USER_ID_IS_NOT_A_PRIMARY_USER_ERROR") {
                    // this can happen due to a race condition wherein
                    // by the time the code comes here, the input primary user is no more a
                    // primary user. So we can do recursion and then linkAccountWithUserFromSession
                    // will try and make the session user a primary user again
                    return await this.linkAccountWithUserFromSession({
                        session,
                        newUser,
                        createRecipeUserFunc,
                        verifyCredentialsFunc,
                        userContext,
                    });
                }
                return {
                    status: "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR",
                    primaryUserId: existingUser.id,
                    recipeUserId: userObjThatHasSameAccountInfoAndRecipeIdAsNewUser.loginMethods[0].recipeUserId,
                };
            }
        }

        const linkAccountResponse = await this.recipeInterfaceImpl.linkAccounts({
            recipeUserId: userObjThatHasSameAccountInfoAndRecipeIdAsNewUser.loginMethods[0].recipeUserId,
            primaryUserId: existingUser.id,
            userContext,
        });

        if (linkAccountResponse.status === "OK") {
            return {
                status: "OK",
                wereAccountsAlreadyLinked: linkAccountResponse.accountsAlreadyLinked,
            };
        } else if (linkAccountResponse.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR") {
            // this means that the the new user is already linked to some other primary user ID,
            // so we can't link it to the existing user.
            return {
                status: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR",
                description: "New user is already linked to another account or is a primary user.",
            };
        } else if (linkAccountResponse.status === "INPUT_USER_IS_NOT_A_PRIMARY_USER") {
            // this can happen due to some race condition where in the existing user, was a primary user
            // and then by the time it comes here, it is somehow not a primary user anymore. So we just do
            // recursion cause it will try and make the input user a primary user again
            return await this.linkAccountWithUserFromSession({
                session,
                newUser,
                createRecipeUserFunc,
                verifyCredentialsFunc,
                userContext,
            });
        } else {
            // status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
            // this means that the account info of the newUser already belongs to some other primary user ID.
            // So we cannot link it to existing user.
            ProcessState.getInstance().addState(
                PROCESS_STATE.ACCOUNT_LINKING_NOT_ALLOWED_ERROR_END_OF_linkAccountWithUserFromSession_FUNCTION
            );
            return {
                status: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR",
                description: "Not allowed because it will lead to two primary user id having same account info.",
            };
        }
    };

    isEmailChangeAllowed = async (input: {
        recipeUserId: RecipeUserId;
        newEmail: string;
        isVerified: boolean;
        userContext: any;
    }): Promise<boolean> => {
        /**
         * The purpose of this function is to check that if a recipe user ID's email
         * can be changed or not. There are two conditions for when it can't be changed:
         * - If the recipe user is a primary user, then we need to check that the new email
         * doesn't belong to any other primary user. If it does, we disallow the change
         * since multiple primary user's can't have the same account info.
         *
         * - If the recipe user is NOT a primary user, and if isVerified is false, then
         * we check if there exists a primary user with the same email, and if it does
         * we disallow the email change cause if this email is changed, and an email
         * verification email is sent, then the primary user may end up clicking
         * on the link by mistake, causing account linking to happen which can result
         * in account take over if this recipe user is malicious.
         */

        let user = await this.recipeInterfaceImpl.getUser({
            userId: input.recipeUserId.getAsString(),
            userContext: input.userContext,
        });

        if (user === undefined) {
            throw new Error("Passed in recipe user id does not exist");
        }

        let existingUsersWithNewEmail = await this.recipeInterfaceImpl.listUsersByAccountInfo({
            accountInfo: {
                email: input.newEmail,
            },
            doUnionOfAccountInfo: false,
            userContext: input.userContext,
        });

        let primaryUserForNewEmail = existingUsersWithNewEmail.filter((u) => u.isPrimaryUser);
        if (primaryUserForNewEmail.length > 1) {
            throw new Error("You found a bug. Please report it on github.com/supertokens/supertokens-node");
        }

        if (user.isPrimaryUser) {
            // this is condition one from the above comment.
            if (primaryUserForNewEmail.length === 1 && primaryUserForNewEmail[0].id !== user.id) {
                logDebugMessage(
                    "isEmailChangeAllowed: returning false cause email change will lead to two primary users having same email"
                );
                return false;
            }
            logDebugMessage(
                "isEmailChangeAllowed: returning true cause input recipeUserId is primary and new email doesn't belong to any other primary user"
            );
            return true;
        } else {
            if (input.isVerified) {
                logDebugMessage(
                    "isEmailChangeAllowed: returning true cause input recipeUserId is not a primary and new email is verified"
                );
                return true;
            }

            if (user.loginMethods[0].email === input.newEmail) {
                logDebugMessage(
                    "isEmailChangeAllowed: returning true cause input recipeUserId is not a primary and new email is same as the older one"
                );
                return true;
            }

            if (primaryUserForNewEmail.length === 1) {
                let shouldDoAccountLinking = await this.config.shouldDoAutomaticAccountLinking(
                    user.loginMethods[0],
                    primaryUserForNewEmail[0],
                    undefined,
                    input.userContext
                );

                if (!shouldDoAccountLinking.shouldAutomaticallyLink) {
                    logDebugMessage(
                        "isEmailChangeAllowed: returning true cause input recipeUserId is not a primary there exists a primary user exists with the new email, but the dev does not have account linking enabled."
                    );
                    return true;
                }

                if (!shouldDoAccountLinking.shouldRequireVerification) {
                    logDebugMessage(
                        "isEmailChangeAllowed: returning true cause input recipeUserId is not a primary there exists a primary user exists with the new email, but the dev does not require email verification."
                    );
                    return true;
                }

                logDebugMessage(
                    "isEmailChangeAllowed: returning false cause input recipeUserId is not a primary there exists a primary user exists with the new email."
                );
                return false;
            }

            logDebugMessage(
                "isEmailChangeAllowed: returning true cause input recipeUserId is not a primary no primary user exists with the new email"
            );
            return true;
        }
    };

    verifyEmailForRecipeUserIfLinkedAccountsAreVerified = async (input: {
        recipeUserId: RecipeUserId;
        userContext: any;
    }) => {
        try {
            EmailVerificationRecipe.getInstanceOrThrowError();
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

        let user = await this.recipeInterfaceImpl.getUser({
            userId: input.recipeUserId.getAsString(),
            userContext: input.userContext,
        });

        if (user === undefined) {
            throw new Error("Passed in recipe user id does not exist");
        }

        if (user.isPrimaryUser) {
            let recipeUserEmail: string | undefined = undefined;
            let isAlreadyVerified = false;
            user.loginMethods.forEach((lm) => {
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
                user.loginMethods.forEach((lm) => {
                    if (lm.hasSameEmailAs(recipeUserEmail) && lm.verified) {
                        shouldVerifyEmail = true;
                    }
                });

                if (shouldVerifyEmail) {
                    let resp = await EmailVerificationRecipe.getInstanceOrThrowError().recipeInterfaceImpl.createEmailVerificationToken(
                        {
                            recipeUserId: input.recipeUserId,
                            email: recipeUserEmail,
                            userContext: input.userContext,
                        }
                    );
                    if (resp.status === "OK") {
                        // we purposely pass in false below cause we don't want account
                        // linking to happen
                        await EmailVerificationRecipe.getInstanceOrThrowError().recipeInterfaceImpl.verifyEmailUsingToken(
                            {
                                token: resp.token,
                                attemptAccountLinking: false,
                                userContext: input.userContext,
                            }
                        );
                    }
                }
            }
        }
    };
}
