/* Copyright (c) 2024, VRAI Labs and/or its affiliates. All rights reserved.
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

// import { getUserContext } from "../../utils";
import SuperTokensError from "../../error";
import Recipe from "./recipe";
import { RecipeInterface, APIOptions, APIInterface } from "./types";
import { getUserContext } from "../../utils";

export default class Wrapper {
    static init = Recipe.init;

    static Error = SuperTokensError;

    static createOrUpdateClient(input: {
        tenantId: string;
        clientId?: string;
        clientSecret?: string;
        redirectURIs: string[];
        defaultRedirectURI: string;
        metadataXML: string;
        allowIDPInitiatedLogin?: boolean;
        enableRequestSigning?: boolean;
        userContext?: Record<string, any>;
    }) {
        Recipe.getInstanceOrThrowError().recipeInterfaceImpl.createOrUpdateClient({
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }

    static listClients(input: { tenantId: string; userContext?: Record<string, any> }) {
        Recipe.getInstanceOrThrowError().recipeInterfaceImpl.listClients({
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }

    static removeClient(input: { tenantId: string; clientId: string; userContext?: Record<string, any> }) {
        Recipe.getInstanceOrThrowError().recipeInterfaceImpl.removeClient({
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }

    static createLoginRequest(input: {
        tenantId: string;
        clientId: string;
        redirectURI: string;
        state?: string;
        acsURL: string;
        userContext?: Record<string, any>;
    }) {
        Recipe.getInstanceOrThrowError().recipeInterfaceImpl.createLoginRequest({
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }

    static verifySAMLResponse(input: {
        tenantId: string;
        samlResponse: string;
        relayState: string | undefined;
        userContext?: Record<string, any>;
    }) {
        Recipe.getInstanceOrThrowError().recipeInterfaceImpl.verifySAMLResponse({
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }

    static getUserInfo(input: {
        tenantId: string;
        accessToken: string;
        clientId: string;
        userContext?: Record<string, any>;
    }) {
        Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUserInfo({
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }
}

export let init = Wrapper.init;
export let Error = Wrapper.Error;
export let createOrUpdateClient = Wrapper.createOrUpdateClient;
export let listClients = Wrapper.listClients;
export let removeClient = Wrapper.removeClient;
export let createLoginRequest = Wrapper.createLoginRequest;
export let verifySAMLResponse = Wrapper.verifySAMLResponse;
export let getUserInfo = Wrapper.getUserInfo;

export type { RecipeInterface, APIOptions, APIInterface };
