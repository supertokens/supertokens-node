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

    static async createNewOrUpdateEmailOfRecipeUser(
        thirdPartyId: string,
        thirdPartyUserId: string,
        email: string,
        userContext: any = {}
    ) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.createNewOrUpdateEmailOfRecipeUser({
            thirdPartyId,
            thirdPartyUserId,
            email,
            userContext,
        });
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

export let createNewOrUpdateEmailOfRecipeUser = Wrapper.createNewOrUpdateEmailOfRecipeUser;

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
