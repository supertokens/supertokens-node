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

import Recipe from "./recipe";
import SuperTokensError from "./error";
import * as thirdPartyProviders from "./providers";
import { RecipeInterface, APIInterface, APIOptions, TypeProvider } from "./types";
import RecipeUserId from "../../recipeUserId";
import { SessionContainerInterface } from "../session/types";
import { linkAccountsWithUserFromSession } from "../accountlinking";

export default class Wrapper {
    static init = Recipe.init;

    static Error = SuperTokensError;

    static async signInUp(
        thirdPartyId: string,
        thirdPartyUserId: string,
        email: string,
        isVerified: boolean,
        userContext: any = {}
    ) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.signInUp({
            thirdPartyId,
            thirdPartyUserId,
            email,
            isVerified,
            userContext,
        });
    }

    /**
     * This function is similar to linkAccounts, but it specifically
     * works for when trying to link accounts with a user that you are already logged
     * into. This can be used to implement, for example, connecting social accounts to your *
     * existing email password account.
     *
     * This function also creates a new recipe user for the newUser if required.
     */
    static async linkThirdPartyAccountWithUserFromSession(input: {
        session: SessionContainerInterface;
        thirdPartyId: string;
        thirdPartyUserId: string;
        email: string;
        isVerified: boolean;
        userContext?: any;
    }): Promise<
        | {
              status: "OK";
              wereAccountsAlreadyLinked: boolean;
          }
        | {
              status: "SIGN_IN_NOT_ALLOWED";
              reason: string;
          }
        | {
              status: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR";
              description: string;
          }
        | {
              status: "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR";
              primaryUserId: string;
              recipeUserId: RecipeUserId;
              email: string;
          }
    > {
        const recipeInstance = Recipe.getInstanceOrThrowError();
        const createRecipeUserFunc = async (userContext: any): Promise<void> => {
            await recipeInstance.recipeInterfaceImpl.createNewOrUpdateEmailOfRecipeUser({
                thirdPartyId: input.thirdPartyId,
                thirdPartyUserId: input.thirdPartyUserId,
                email: input.email,
                isVerified: input.isVerified,
                userContext,
            });

            // we ignore response of the above cause linkAccountsWithUserFromSession
            // will recurse and call the verifyCredentialsFunc which will take into
            // account the status code.
        };

        const verifyCredentialsFunc = async (
            userContext: any
        ): Promise<
            | { status: "OK" }
            | {
                  status: "CUSTOM_RESPONSE";
                  resp: {
                      status: "SIGN_IN_NOT_ALLOWED";
                      reason: string;
                  };
              }
        > => {
            let resp = await recipeInstance.recipeInterfaceImpl.createNewOrUpdateEmailOfRecipeUser({
                thirdPartyId: input.thirdPartyId,
                thirdPartyUserId: input.thirdPartyUserId,
                email: input.email,
                isVerified: input.isVerified,
                userContext,
            });
            if (resp.status === "OK") {
                return {
                    status: "OK",
                };
            }

            // this can come here for two reasons:
            //
            // - if the input user is a primary user and the info is already linked
            // to the session user. This is because if the input user info was
            // linked to another user, then the linkAccountsWithUserFromSession function
            // would return early with a ACCOUNT_LINKING_NOT_ALLOWED_ERROR error.
            //
            // - If the input user is not a primary user, and their email has changed
            // in a way that it's unverified AND another primary user has that email
            // then we prevent login since it may lead to the email verification email
            // being clicked by the actual user by mistake, thereby linking
            // this account (which could be owned by an attacker - leading
            // to an account takeover case).
            return {
                status: "CUSTOM_RESPONSE",
                resp: {
                    status: "SIGN_IN_NOT_ALLOWED",
                    reason: resp.reason,
                },
            };
        };

        let response = await linkAccountsWithUserFromSession({
            session: input.session,
            newUser: {
                recipeId: "thirdparty",
                email: input.email,
                thirdParty: {
                    id: input.thirdPartyId,
                    userId: input.thirdPartyUserId,
                },
            },
            createRecipeUserFunc,
            verifyCredentialsFunc,
            userContext: input.userContext === undefined ? {} : input.userContext,
        });
        if (response.status === "CUSTOM_RESPONSE") {
            return response.resp;
        }
        if (response.status === "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR") {
            return {
                status: "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR",
                primaryUserId: response.primaryUserId,
                recipeUserId: response.recipeUserId,
                email: input.email,
            };
        }
        return response;
    }

    static Google = thirdPartyProviders.Google;

    static Github = thirdPartyProviders.Github;

    static Facebook = thirdPartyProviders.Facebook;

    static Apple = thirdPartyProviders.Apple;

    static Discord = thirdPartyProviders.Discord;

    static GoogleWorkspaces = thirdPartyProviders.GoogleWorkspaces;

    static Bitbucket = thirdPartyProviders.Bitbucket;

    static GitLab = thirdPartyProviders.GitLab;

    // static Okta = thirdPartyProviders.Okta;

    // static ActiveDirectory = thirdPartyProviders.ActiveDirectory;
}

export let init = Wrapper.init;

export let Error = Wrapper.Error;

export let signInUp = Wrapper.signInUp;

export let linkThirdPartyAccountWithUserFromSession = Wrapper.linkThirdPartyAccountWithUserFromSession;

export let Google = Wrapper.Google;

export let Github = Wrapper.Github;

export let Facebook = Wrapper.Facebook;

export let Apple = Wrapper.Apple;

export let Discord = Wrapper.Discord;

export let GoogleWorkspaces = Wrapper.GoogleWorkspaces;

export let Bitbucket = Wrapper.Bitbucket;

export let GitLab = Wrapper.GitLab;

// export let Okta = Wrapper.Okta;

// export let ActiveDirectory = Wrapper.ActiveDirectory;

export type { RecipeInterface, APIInterface, APIOptions, TypeProvider };
