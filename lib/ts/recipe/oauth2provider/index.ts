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

import { getUserContext } from "../../utils";
import Recipe from "./recipe";
import {
    APIInterface,
    RecipeInterface,
    APIOptions,
    CreateOAuth2ClientInput,
    UpdateOAuth2ClientInput,
    DeleteOAuth2ClientInput,
    GetOAuth2ClientsInput,
} from "./types";

export default class Wrapper {
    static init = Recipe.init;

    static async getOAuth2Clients(input: GetOAuth2ClientsInput, userContext?: Record<string, any>) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getOAuth2Clients(
            input,
            getUserContext(userContext)
        );
    }
    static async createOAuth2Client(input: CreateOAuth2ClientInput, userContext?: Record<string, any>) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.createOAuth2Client(
            input,
            getUserContext(userContext)
        );
    }
    static async updateOAuth2Client(input: UpdateOAuth2ClientInput, userContext?: Record<string, any>) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.updateOAuth2Client(
            input,
            getUserContext(userContext)
        );
    }
    static async deleteOAuth2Client(input: DeleteOAuth2ClientInput, userContext?: Record<string, any>) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.deleteOAuth2Client(
            input,
            getUserContext(userContext)
        );
    }

    static validateOAuth2AccessToken(
        token: string,
        requirements?: {
            clientId?: string;
            scopes?: string[];
            audience?: string;
        },
        checkDatabase?: boolean,
        userContext?: Record<string, any>
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.validateOAuth2AccessToken({
            token,
            requirements,
            checkDatabase,
            userContext: getUserContext(userContext),
        });
    }

    static validateOAuth2IdToken(
        token: string,
        requirements?: {
            clientId?: string;
            scopes?: string[];
            audience?: string;
        },
        userContext?: Record<string, any>
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.validateOAuth2IdToken({
            token,
            requirements,
            userContext: getUserContext(userContext),
        });
    }

    // TODO: revokeToken

    static createTokenForClientCredentials(
        clientId: string,
        clientSecret: string,
        scope?: string[],
        audience?: string,
        userContext?: Record<string, any>
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.tokenExchange({
            body: {
                grant_type: "client_credentials",
                client_id: clientId,
                client_secret: clientSecret,
                scope: scope?.join(" "),
                audience: audience,
            },
            userContext: getUserContext(userContext),
        });
    }
}

export let init = Wrapper.init;

export let getOAuth2Clients = Wrapper.getOAuth2Clients;

export let createOAuth2Client = Wrapper.createOAuth2Client;

export let updateOAuth2Client = Wrapper.updateOAuth2Client;

export let deleteOAuth2Client = Wrapper.deleteOAuth2Client;

export let validateOAuth2AccessToken = Wrapper.validateOAuth2AccessToken;

export let validateOAuth2IdToken = Wrapper.validateOAuth2IdToken;

export let createTokenForClientCredentials = Wrapper.createTokenForClientCredentials;

export type { APIInterface, APIOptions, RecipeInterface };
