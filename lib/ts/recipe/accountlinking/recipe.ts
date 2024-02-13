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
import type { APIHandled, HTTPMethod, NormalisedAppinfo, RecipeListFunction, User, UserContext } from "../../types";
import type { TypeNormalisedInput, RecipeInterface, TypeInput, AccountInfoWithRecipeId } from "./types";
import { validateAndNormaliseUserInput } from "./utils";
import OverrideableBuilder from "supertokens-js-override";
import RecipeImplementation from "./recipeImplementation";
import { Querier } from "../../querier";
import SuperTokensError from "../../error";
import supertokens from "../../supertokens";
import RecipeUserId from "../../recipeUserId";
import { ProcessState, PROCESS_STATE } from "../../processState";
import { logDebugMessage } from "../../logger";
import EmailVerificationRecipe from "../emailverification/recipe";
import { LoginMethod } from "../../user";
import { SessionContainerInterface } from "../session/types";
import { getUser } from "../..";
import SessionError from "../session/error";
import { EmailVerificationClaim } from "../emailverification";
import { AuthUtils } from "../../authUtils";

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
        _tenantId: string,
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
    }

    // this function returns the user ID for which the session will be created.
    createPrimaryUserIdOrLinkByAccountInfoOrLinkToSessionIfProvided = async ({
        tenantId,
        inputUser,
        recipeUserId,
        session,
        userContext,
    }: {
        tenantId: string;
        inputUser: User;
        recipeUserId: RecipeUserId;
        session: SessionContainerInterface | undefined;
        userContext: UserContext;
    }): Promise<
        | { status: "OK"; user: User }
        | {
              status: "LINKING_TO_SESSION_USER_FAILED";
              reason:
                  | "EMAIL_VERIFICATION_REQUIRED"
                  | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          }
        | {
              status: "NON_PRIMARY_SESSION_USER";
              reason: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          }
    > => {
        logDebugMessage("createPrimaryUserIdOrLinkAccounts called");
        const retry = () => {
            logDebugMessage("createPrimaryUserIdOrLinkAccounts retrying....");
            return this.createPrimaryUserIdOrLinkByAccountInfoOrLinkToSessionIfProvided({
                tenantId,
                inputUser: inputUser,
                session,
                recipeUserId,
                userContext,
            });
        };

        // If we got here, we have a session and a primary session user
        // We can not assume the inputUser is non-primary, since we'll only check that seeing if the app wants to link to the session user or not.
        const authLoginMethod = inputUser.loginMethods.find(
            (lm) => lm.recipeUserId.getAsString() === recipeUserId.getAsString()
        );
        if (!authLoginMethod) {
            throw new Error(
                "This should never happen: the recipeUserId and user is inconsistent in createPrimaryUserIdOrLinkByAccountInfo params"
            );
        }

        const authTypeRes = await AuthUtils.checkAuthTypeAndLinkingStatus(
            session,
            authLoginMethod,
            inputUser,
            tenantId,
            userContext
        );

        if (authTypeRes.status !== "OK") {
            return authTypeRes;
        }

        if (authTypeRes.isFirstFactor) {
            logDebugMessage(
                "createPrimaryUserIdOrLinkAccounts trying to link by account info because this is a first factor auth"
            );
            // We try and list all users that can be linked to the input user based on the account info
            // later we can use these when trying to link or when checking if linking to the session user is possible.
            const linkRes = await this.tryLinkingByAccountInfo({
                inputUser: inputUser,
                session,
                tenantId,
                userContext,
            });
            if (linkRes.status === "OK") {
                return { status: "OK", user: linkRes.user };
            }
            if (linkRes.status === "NO_LINK") {
                return { status: "OK", user: inputUser };
            }
            return retry();
        }

        if (authTypeRes.inputUserAlreadyLinkedToSessionUser) {
            return {
                status: "OK",
                user: authTypeRes.sessionUser,
            };
        }

        logDebugMessage("createPrimaryUserIdOrLinkAccounts trying to link by session info");
        const sessionLinkingRes = await this.tryLinkingBySession({
            sessionUser: authTypeRes.sessionUser,
            inputUser,
            authLoginMethod,
            sessionUserLinkingRequiresVerification: authTypeRes.sessionUserLinkingRequiresVerification,
            userContext,
        });
        if (sessionLinkingRes.status === "SESSION_USER_NOT_PRIMARY") {
            // This means that although we made the session user primary above, some race condition undid that (e.g.: calling unlink concurrently with this func)
            // We can retry in this case, since we start by trying to make it into a primary user and throwing if we can't
            return retry();
        } else if (sessionLinkingRes.status === "LINKING_TO_SESSION_USER_FAILED") {
            return sessionLinkingRes;
        } else {
            // If we get here the status is either OK or LINKING_TO_SESSION_USER_FAILED in which case we return an error response LINKING_TO_SESSION_USER_FAILED
            // means that although the app wants to link to the session user but something, is blocking the link (i.e.: other primary users existing),
            // which is something we want to show a support code for.
            return sessionLinkingRes;
        }
    };

    getUsersThatCanBeLinkedToRecipeUser = async ({
        tenantId,
        user,
        userContext,
    }: {
        tenantId: string;
        user: User;
        userContext: UserContext;
    }): Promise<{ primaryUser: User | undefined; oldestUser: User | undefined }> => {
        // first we check if this user itself is a primary user or not. If it is, we return that.
        if (user.isPrimaryUser) {
            return { primaryUser: user, oldestUser: user };
        }

        // finally, we try and find a primary user based on
        // the email / phone number / third party ID.
        let users = await this.recipeInterfaceImpl.listUsersByAccountInfo({
            tenantId,
            accountInfo: user.loginMethods[0],
            doUnionOfAccountInfo: true,
            userContext,
        });

        logDebugMessage(`getUsersThatCanBeLinkedToRecipeUser found ${users.length} matching users`);
        let pUsers = users.filter((u) => u.isPrimaryUser);
        logDebugMessage(`getUsersThatCanBeLinkedToRecipeUser found ${pUsers.length} matching primary users`);
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
        const primaryUser = pUsers.length === 0 ? undefined : pUsers[0];
        const oldestUser =
            users.length === 0
                ? undefined
                : users.reduce((min, curr) => (min.timeJoined < curr.timeJoined ? min : curr));
        return { primaryUser, oldestUser };
    };

    getPrimarySessionUser = async function (
        session: SessionContainerInterface,
        tenantId: string,
        userContext: UserContext
    ): Promise<
        | { status: "OK"; sessionUser: User }
        | { status: "SHOULD_AUTOMATICALLY_LINK_FALSE" }
        | { status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR" }
    > {
        logDebugMessage(`getPrimarySessionUser called`);
        const sessionUser = await getUser(session.getUserId(), userContext);
        if (sessionUser === undefined) {
            throw new SessionError({
                type: SessionError.UNAUTHORISED,
                message: "Session user not found",
            });
        }

        if (sessionUser.isPrimaryUser) {
            logDebugMessage(`getPrimarySessionUser session user already primary`);
            // if the session user was already primary we can just return it
            return { status: "OK", sessionUser };
        } else {
            // if the session user is not primary we try and make it one
            logDebugMessage(`getPrimarySessionUser not session user yet`);
            // We could check here if the session user can even become a primary user, but that'd only mean one extra core call
            // without any added benefits, since the core already checks all pre-conditions

            // We do this check here instead of using the shouldBecomePrimaryUser util, because
            // here we handle the shouldRequireVerification case differently
            const shouldDoAccountLinking = await this.config.shouldDoAutomaticAccountLinking(
                sessionUser.loginMethods[0],
                undefined,
                session,
                tenantId,
                userContext
            );
            logDebugMessage(`getPrimarySessionUser shouldDoAccountLinking: ${JSON.stringify(shouldDoAccountLinking)}`);

            if (shouldDoAccountLinking.shouldAutomaticallyLink) {
                if (shouldDoAccountLinking.shouldRequireVerification && !sessionUser.loginMethods[0].verified) {
                    // We force-update the claim value if it is not set or different from what we just fetched from the DB
                    if ((await session.getClaimValue(EmailVerificationClaim, userContext)) !== false) {
                        logDebugMessage(`getPrimarySessionUser updating emailverification status in session`);
                        // This will let the frontend know if the value has been updated in the background
                        await session.setClaimValue(EmailVerificationClaim, false, userContext);
                    }
                    logDebugMessage(`getPrimarySessionUser throwing validation error`);
                    // Then run the validation expecting it to fail. We run assertClaims instead of throwing the error locally
                    // to make sure the error shape in the response will match what we'd return normally
                    await session.assertClaims([EmailVerificationClaim.validators.isVerified()], userContext);
                    throw new Error(
                        "This should never happen: email verification claim validator passed after setting value to false"
                    );
                }
                const makeSessionUserPrimaryRes = await this.recipeInterfaceImpl.createPrimaryUser({
                    recipeUserId: sessionUser.loginMethods[0].recipeUserId,
                    userContext,
                });
                logDebugMessage(
                    `getPrimarySessionUser makeSessionUserPrimaryRes returned ${makeSessionUserPrimaryRes.status}`
                );
                if (makeSessionUserPrimaryRes.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR") {
                    // This means that the session user got primary since we loaded the session user info above
                    // but this status means that the user id has also changed, so the session should be invalid
                    throw new SessionError({
                        type: SessionError.UNAUTHORISED,
                        message: "Session user not found",
                    });
                } else if (makeSessionUserPrimaryRes.status === "OK") {
                    return { status: "OK", sessionUser: makeSessionUserPrimaryRes.user };
                } else {
                    // All other statuses signify that we can't make the session user primary
                    // Which means we can't continue
                    return makeSessionUserPrimaryRes;
                }
            } else {
                // This means that the app doesn't want to make the session user primary
                return { status: "SHOULD_AUTOMATICALLY_LINK_FALSE" };
            }
        }
    };

    isSignInAllowed = async ({
        user,
        tenantId,
        session,
        userContext,
    }: {
        user: User;
        session: SessionContainerInterface | undefined;
        tenantId: string;
        userContext: UserContext;
    }): Promise<boolean> => {
        ProcessState.getInstance().addState(PROCESS_STATE.IS_SIGN_IN_ALLOWED_CALLED);

        if (user.isPrimaryUser || user.loginMethods[0].verified) {
            return true;
        }

        return this.isSignInUpAllowedHelper({
            accountInfo: user.loginMethods[0],
            isVerified: user.loginMethods[0].verified,
            session,
            tenantId,
            isSignIn: true,
            userContext,
        });
    };

    isSignUpAllowed = async ({
        newUser,
        isVerified,
        session,
        tenantId,
        userContext,
    }: {
        newUser: AccountInfoWithRecipeId;
        isVerified: boolean;
        session: SessionContainerInterface | undefined;
        tenantId: string;
        userContext: UserContext;
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
            session,
            tenantId,
            userContext,
            isSignIn: false,
        });
    };

    isSignInUpAllowedHelper = async ({
        accountInfo,
        isVerified,
        session,
        tenantId,
        isSignIn,
        userContext,
    }: {
        accountInfo: AccountInfoWithRecipeId | LoginMethod;
        isVerified: boolean;
        session: SessionContainerInterface | undefined;
        tenantId: string;
        isSignIn: boolean;
        userContext: UserContext;
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
            tenantId,
            accountInfo,
            doUnionOfAccountInfo: true,
            userContext,
        });
        if (users.length === 0) {
            logDebugMessage("isSignInUpAllowedHelper returning true because no user with given account info");
            // this is a brand new email / phone number, so we allow sign up.
            return true;
        }

        if (users.length === 1 && isSignIn) {
            logDebugMessage(
                "isSignInUpAllowedHelper returning true because this is sign in and there is only a single user with the given account info"
            );
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
                session,
                tenantId,
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
                session,
                tenantId,
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
                //"isSignInUpAllowedHelper returning false because new user's email is not verified, and primary user with the same email was found."
            );
            return false;
        }
    };

    isEmailChangeAllowed = async (input: {
        user?: User;
        newEmail: string;
        isVerified: boolean;
        session: SessionContainerInterface | undefined;
        userContext: UserContext;
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

        let user = input.user;

        if (user === undefined) {
            throw new Error("Passed in recipe user id does not exist");
        }

        for (const tenantId of user.tenantIds) {
            let existingUsersWithNewEmail = await this.recipeInterfaceImpl.listUsersByAccountInfo({
                tenantId: user.tenantIds[0],
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
                    `isEmailChangeAllowed: can change on ${tenantId} cause input user is primary and new email doesn't belong to any other primary user`
                );
                continue;
            } else {
                if (input.isVerified) {
                    logDebugMessage(
                        `isEmailChangeAllowed: can change on ${tenantId} cause input user is not a primary and new email is verified`
                    );
                    continue;
                }

                if (user.loginMethods[0].email === input.newEmail) {
                    logDebugMessage(
                        `isEmailChangeAllowed: can change on ${tenantId} cause input user is not a primary and new email is same as the older one`
                    );
                    continue;
                }

                if (primaryUserForNewEmail.length === 1) {
                    let shouldDoAccountLinking = await this.config.shouldDoAutomaticAccountLinking(
                        user.loginMethods[0],
                        primaryUserForNewEmail[0],
                        input.session,
                        tenantId,
                        input.userContext
                    );

                    if (!shouldDoAccountLinking.shouldAutomaticallyLink) {
                        logDebugMessage(
                            `isEmailChangeAllowed: can change on ${tenantId} cause input user is not a primary there exists a primary user exists with the new email, but the dev does not have account linking enabled.`
                        );
                        continue;
                    }

                    if (!shouldDoAccountLinking.shouldRequireVerification) {
                        logDebugMessage(
                            `isEmailChangeAllowed: can change on ${tenantId} cause input user is not a primary there exists a primary user exists with the new email, but the dev does not require email verification.`
                        );
                        continue;
                    }

                    logDebugMessage(
                        "isEmailChangeAllowed: returning false cause input user is not a primary there exists a primary user exists with the new email."
                    );
                    return false;
                }

                logDebugMessage(
                    `isEmailChangeAllowed: can change on ${tenantId} cause input user is not a primary no primary user exists with the new email`
                );
                continue;
            }
        }
        logDebugMessage(
            "isEmailChangeAllowed: returning true cause email change can happen on all tenants the user is part of"
        );
        return true;
    };

    verifyEmailForRecipeUserIfLinkedAccountsAreVerified = async (input: {
        user: User;
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
        if (input.user.isPrimaryUser) {
            let recipeUserEmail: string | undefined = undefined;
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
                    let resp = await EmailVerificationRecipe.getInstanceOrThrowError().recipeInterfaceImpl.createEmailVerificationToken(
                        {
                            // While the token we create here is tenant specific, the verification status is not
                            // So we can use any tenantId the user is associated with here as long as we use the
                            // same in the verifyEmailUsingToken call
                            tenantId: input.user.tenantIds[0],
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
                                // See comment about tenantId in the createEmailVerificationToken params
                                tenantId: input.user.tenantIds[0],
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

    private async shouldBecomePrimaryUser(
        user: User,
        tenantId: string,
        session: SessionContainerInterface | undefined,
        userContext: UserContext
    ) {
        const shouldDoAccountLinking = await this.config.shouldDoAutomaticAccountLinking(
            user.loginMethods[0],
            undefined,
            session,
            tenantId,
            userContext
        );

        if (!shouldDoAccountLinking.shouldAutomaticallyLink) {
            logDebugMessage("shouldBecomePrimaryUser returning false because shouldAutomaticallyLink is false");
            return false;
        }

        if (shouldDoAccountLinking.shouldRequireVerification && !user.loginMethods[0].verified) {
            logDebugMessage(
                "shouldBecomePrimaryUser returning false because shouldRequireVerification is true but the login method is not verified"
            );
            return false;
        }

        logDebugMessage("shouldBecomePrimaryUser returning true");

        return true;
    }

    private async tryLinkingBySession({
        sessionUserLinkingRequiresVerification,
        authLoginMethod,
        inputUser,
        sessionUser,
        userContext,
    }: {
        inputUser: User;
        sessionUserLinkingRequiresVerification: boolean;
        sessionUser: User;
        authLoginMethod: LoginMethod;
        userContext: UserContext;
    }): Promise<
        | { status: "OK"; user: User }
        | {
              status: "LINKING_TO_SESSION_USER_FAILED";
              reason:
                  | "EMAIL_VERIFICATION_REQUIRED"
                  | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          }
        | {
              status: "SESSION_USER_NOT_PRIMARY";
              reason: "INPUT_USER_IS_NOT_A_PRIMARY_USER";
          }
    > {
        logDebugMessage("tryLinkingBySession called");
        // If the input user has another user (and it's not the session user) it could be linked to based on account info then we can't link it to the session user.
        // However, we do not need to check this as the linkAccounts check will fail anyway and we do not want the extra core call in case it succeeds

        // If the session user has already verified the current email address/phone number and wants to add another account with it
        // then we don't want to ask them to verify it again.
        // This is different from linking based on account info, but the presence of a session shows that the user has access to both accounts,
        // and intends to link these two accounts.
        const sessionUserHasVerifiedAccountInfo = sessionUser.loginMethods.some(
            (lm) =>
                (lm.hasSameEmailAs(authLoginMethod.email) || lm.hasSamePhoneNumberAs(authLoginMethod.phoneNumber)) &&
                lm.verified
        );

        const canLinkBasedOnVerification =
            !sessionUserLinkingRequiresVerification || authLoginMethod.verified || sessionUserHasVerifiedAccountInfo;

        if (!canLinkBasedOnVerification) {
            return { status: "LINKING_TO_SESSION_USER_FAILED", reason: "EMAIL_VERIFICATION_REQUIRED" };
        }

        // If we get here, it means that the session and the input user can be linked, so we try it.
        // Note that this function will not call shouldDoAutomaticAccountLinking and check the verification status before linking
        // it'll mark the freshly linked recipe user as verified if the email address was verified in the session user.
        let linkAccountsResult = await this.recipeInterfaceImpl.linkAccounts({
            recipeUserId: inputUser.loginMethods[0].recipeUserId,
            primaryUserId: sessionUser.id,
            userContext,
        });

        if (linkAccountsResult.status === "OK") {
            logDebugMessage("tryLinkingBySession successfully linked input user to session user");
            return { status: "OK", user: linkAccountsResult.user };
        } else if (linkAccountsResult.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR") {
            // this can happen because of a race condition wherein the recipe user ID get's linked to
            // some other primary user whilst the linking is going on.
            logDebugMessage(
                "tryLinkingBySession linking to session user failed because of a race condition - input user linked to another user"
            );
            return { status: "LINKING_TO_SESSION_USER_FAILED", reason: linkAccountsResult.status };
        } else if (linkAccountsResult.status === "INPUT_USER_IS_NOT_A_PRIMARY_USER") {
            logDebugMessage(
                "tryLinkingBySession linking to session user failed because of a race condition - INPUT_USER_IS_NOT_A_PRIMARY_USER, retrying"
            );
            // This can be possible during a race condition wherein the primary user we created above
            // is somehow no more a primary user. This can happen if  the unlink function was called in parallel
            // on that user. We can just retry, as that will try and make it a primary user again.
            return { status: "SESSION_USER_NOT_PRIMARY", reason: linkAccountsResult.status };
        } else {
            logDebugMessage(
                "tryLinkingBySession linking to session user failed because of a race condition - input user has another primary user it can be linked to"
            );
            // Status can only be "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
            // It can come here if the recipe user ID can't be linked to the primary user ID because the email / phone number is associated with
            // some other primary user ID.
            // This can happen due to a race condition in which the email has changed from one primary user to another during this function call,
            // or if another primary user was created with the same email as the input user while this function is running
            return { status: "LINKING_TO_SESSION_USER_FAILED", reason: linkAccountsResult.status };
        }
    }

    async tryLinkingByAccountInfo({
        inputUser,
        session,
        tenantId,
        userContext,
    }: {
        tenantId: string;
        inputUser: User;
        session: SessionContainerInterface | undefined;
        userContext: UserContext;
    }): Promise<
        | { status: "OK"; user: User }
        | { status: "BOTH_USERS_PRIMARY" | "NO_LINK" | "INPUT_USER_IS_NOT_A_PRIMARY_USER" }
        | {
              status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR";
              primaryUserId: string;
          }
        | {
              status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              user: User;
          }
        | {
              status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              primaryUserId: string;
              description: string;
          }
    > {
        const usersToLink = await this.getUsersThatCanBeLinkedToRecipeUser({
            tenantId,
            user: inputUser,
            userContext,
        });
        const primaryUserThatCanBeLinkedToTheInputUser = usersToLink.primaryUser;
        const oldestUserThatCanBeLinkedToTheInputUser = usersToLink.oldestUser;
        if (primaryUserThatCanBeLinkedToTheInputUser !== undefined) {
            if (!this.isLinked(primaryUserThatCanBeLinkedToTheInputUser, inputUser)) {
                // If we got a primary user that can be linked to the input user and they are is not linked, we try to link them.
                // The input user in this case cannot be linked to anything else, otherwise multiple primary users would have the same email
                return await this.tryLinkAccounts(
                    primaryUserThatCanBeLinkedToTheInputUser,
                    inputUser,
                    session,
                    tenantId,
                    userContext
                );
            }
            // If they are already linked, this is a no-op
            return { status: "OK", user: inputUser };
        }

        // If there is no primary user we could link to, but we there is another account we can link this to
        // then we try and link it (respecting shouldDoAutomaticAccountLinking)
        if (
            oldestUserThatCanBeLinkedToTheInputUser !== undefined &&
            oldestUserThatCanBeLinkedToTheInputUser.id !== inputUser.id
        ) {
            // This function will try and make one of the accounts primary if neither of them are
            const linkRes = await this.tryLinkAccounts(
                oldestUserThatCanBeLinkedToTheInputUser,
                inputUser,
                session,
                tenantId,
                userContext
            );

            // If the user choose not to link it to the oldest user, we can fall back to trying to make the current user primary
            if (linkRes.status !== "NO_LINK") {
                // If we get here it means that the linking process either succeeded or failed for a reason that doesn't implies we should
                // error out or retry the whole process. Those are handled by the caller of this function, so we return these statuses.
                return linkRes;
            }
        }
        // In this case we have no other account we can link to, so we check if the current user should become a primary user
        if (await this.shouldBecomePrimaryUser(inputUser, tenantId, session, userContext)) {
            let createPrimaryUserResult = await this.recipeInterfaceImpl.createPrimaryUser({
                recipeUserId: inputUser.loginMethods[0].recipeUserId,
                userContext,
            });

            // If the status is "OK", we can return it directly (it contains the updated user)
            // if the status is "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR" or "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR"
            // meaning that the recipe user ID is already linked to another primary  user id (race condition), or that some other
            // primary user ID exists with the same email / phone number (again, race condition).
            // In this case we call a retry in createPrimaryUserIdOrLinkByAccountInfo
            return createPrimaryUserResult;
        } else {
            // If not we return it unchanged
            return { status: "OK", user: inputUser };
        }
    }

    private async tryLinkAccounts(
        user1: User,
        user2: User,
        session: SessionContainerInterface | undefined,
        tenantId: string,
        userContext: UserContext
    ): Promise<
        | { status: "OK"; user: User }
        | { status: "BOTH_USERS_PRIMARY" | "NO_LINK" | "INPUT_USER_IS_NOT_A_PRIMARY_USER" }
        | {
              status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR";
              primaryUserId: string;
          }
        | {
              status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              primaryUserId: string;
              description: string;
          }
        | {
              status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              user: User;
          }
    > {
        let primaryUser: User;
        let targetUser: User;
        // We first try and check which one is a primary user
        if (user1.isPrimaryUser) {
            // If both of the are primary, then they cannot be linked
            // This is a condition that should be checked before calling this helper, but it could be some kind of race-condition
            if (user2.isPrimaryUser) {
                return { status: "BOTH_USERS_PRIMARY" };
            }
            primaryUser = user1;
            targetUser = user2;
        } else if (user2.isPrimaryUser) {
            // If we got here we know not both of them are primary
            // so we can just use user2 as primary
            primaryUser = user2;
            targetUser = user1;
        } else {
            // We select the older user
            const olderUser = user1.timeJoined >= user2.timeJoined ? user2 : user1;
            const newerUser = olderUser === user1 ? user2 : user1;
            // Try and make it primary first
            let shouldMakeOlderUserPrimary = await this.shouldBecomePrimaryUser(
                olderUser,
                tenantId,
                session,
                userContext
            );
            if (shouldMakeOlderUserPrimary) {
                const createPrimaryUserResult = await this.recipeInterfaceImpl.createPrimaryUser({
                    recipeUserId: olderUser.loginMethods[0].recipeUserId,
                    userContext,
                });
                if (createPrimaryUserResult.status !== "OK") {
                    return createPrimaryUserResult;
                }
                primaryUser = createPrimaryUserResult.user;
                targetUser = newerUser;
            } else {
                // if the older one shouldn't become primary, we try the newer one
                const shouldMakeNewerUserPrimary = await this.shouldBecomePrimaryUser(
                    newerUser,
                    tenantId,
                    session,
                    userContext
                );
                if (shouldMakeNewerUserPrimary) {
                    const createPrimaryUserResult = await this.recipeInterfaceImpl.createPrimaryUser({
                        recipeUserId: newerUser.loginMethods[0].recipeUserId,
                        userContext,
                    });
                    if (createPrimaryUserResult.status !== "OK") {
                        return createPrimaryUserResult;
                    }
                    primaryUser = createPrimaryUserResult.user;
                    targetUser = olderUser;
                } else {
                    // At this point we can't link these users together because,
                    // neither of them are primary, and we can't make any of them primary.
                    // This can be because of shoulDoAutomaticAccountLinking/email verification status.
                    return { status: "NO_LINK" };
                }
            }
        }
        // we can use the 0 index cause targetUser is not a primary user.
        let shouldDoAccountLinking = await this.config.shouldDoAutomaticAccountLinking(
            targetUser.loginMethods[0],
            primaryUser,
            session,
            tenantId,
            userContext
        );

        // We already checked if factor setup is allowed by this point, but maybe we should check again?
        if (!shouldDoAccountLinking.shouldAutomaticallyLink) {
            logDebugMessage("tryLinkAccounts: not linking because shouldAutomaticallyLink is false");
            return { status: "NO_LINK" };
        }

        let sessionUserHasVerifiedAccountInfo =
            session !== undefined &&
            primaryUser.id == session.getUserId(userContext) &&
            primaryUser.loginMethods.some(
                (lm) =>
                    targetUser.loginMethods[0].email === lm.email &&
                    targetUser.loginMethods[0].phoneNumber === lm.phoneNumber &&
                    lm.verified
            );

        if (
            shouldDoAccountLinking.shouldRequireVerification &&
            !targetUser.loginMethods[0].verified &&
            !sessionUserHasVerifiedAccountInfo
        ) {
            logDebugMessage(
                "tryLinkAccounts: not linking because shouldRequireVerification is true but the login method is not verified"
            );
            return { status: "NO_LINK" };
        }

        logDebugMessage("tryLinkAccounts linking");
        let linkAccountsResult = await this.recipeInterfaceImpl.linkAccounts({
            recipeUserId: targetUser.loginMethods[0].recipeUserId,
            primaryUserId: primaryUser.id,
            userContext,
        });

        if (linkAccountsResult.status === "OK") {
            logDebugMessage("tryLinkAccounts successfully linked");
            return { status: "OK", user: linkAccountsResult.user };
        } else if (linkAccountsResult.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR") {
            // this can happen cause of a race condition
            // wherein the recipe user ID get's linked to
            // some other primary user whilst this function is running.
            logDebugMessage("tryLinkAccounts already linked to another user");
            return {
                status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR",
                user: linkAccountsResult.user,
            };
        } else if (linkAccountsResult.status === "INPUT_USER_IS_NOT_A_PRIMARY_USER") {
            logDebugMessage("tryLinkAccounts linking failed because of a race condition");
            // this can be possible during a race condition wherein the primary user
            // that we fetched somehow is no more a primary user. This can happen if
            // the unlink function was called in parallel on that user. So we can just retry
            return linkAccountsResult;
        } else {
            logDebugMessage("tryLinkAccounts linking failed because of a race condition");
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
            return linkAccountsResult;
        }
    }

    isLinked(primaryUser: User, otherUser: User) {
        return otherUser.isPrimaryUser
            ? primaryUser.id === otherUser.id
            : primaryUser.loginMethods.some(
                  (lm) => lm.recipeUserId.getAsString() === otherUser.loginMethods[0].recipeUserId.getAsString()
              );
    }
}
