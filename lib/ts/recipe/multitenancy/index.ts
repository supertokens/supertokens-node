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
import { RecipeInterface, APIOptions, APIInterface } from "./types";
import { ProviderConfig } from "../thirdparty/types";
import { AllowedDomainsClaim } from "./allowedDomainsClaim";
import RecipeUserId from "../../recipeUserId";

export default class Wrapper {
    static init = Recipe.init;

    static async createOrUpdateTenant(
        tenantId: string,
        config?: {
            emailPasswordEnabled?: boolean;
            passwordlessEnabled?: boolean;
            thirdPartyEnabled?: boolean;
            coreConfig?: { [key: string]: any };
        },
        userContext?: any
    ): Promise<{
        status: "OK";
        createdNew: boolean;
    }> {
        const recipeInstance = Recipe.getInstanceOrThrowError();
        return recipeInstance.recipeInterfaceImpl.createOrUpdateTenant({
            tenantId,
            config,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static async deleteTenant(
        tenantId: string,
        userContext?: any
    ): Promise<{
        status: "OK";
        didExist: boolean;
    }> {
        const recipeInstance = Recipe.getInstanceOrThrowError();
        return recipeInstance.recipeInterfaceImpl.deleteTenant({
            tenantId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static async getTenant(
        tenantId: string,
        userContext?: any
    ): Promise<
        | {
              status: "OK";
              emailPassword: {
                  enabled: boolean;
              };
              passwordless: {
                  enabled: boolean;
              };
              thirdParty: {
                  enabled: boolean;
                  providers: ProviderConfig[];
              };
              coreConfig: { [key: string]: any };
          }
        | undefined
    > {
        const recipeInstance = Recipe.getInstanceOrThrowError();
        return recipeInstance.recipeInterfaceImpl.getTenant({
            tenantId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static async listAllTenants(
        userContext?: any
    ): Promise<{
        status: "OK";
        tenants: {
            tenantId: string;
            emailPassword: {
                enabled: boolean;
            };
            passwordless: {
                enabled: boolean;
            };
            thirdParty: {
                enabled: boolean;
                providers: ProviderConfig[];
            };
            coreConfig: { [key: string]: any };
        }[];
    }> {
        const recipeInstance = Recipe.getInstanceOrThrowError();
        return recipeInstance.recipeInterfaceImpl.listAllTenants({
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static async createOrUpdateThirdPartyConfig(
        tenantId: string,
        config: ProviderConfig,
        skipValidation?: boolean,
        userContext?: any
    ): Promise<{
        status: "OK";
        createdNew: boolean;
    }> {
        const recipeInstance = Recipe.getInstanceOrThrowError();
        return recipeInstance.recipeInterfaceImpl.createOrUpdateThirdPartyConfig({
            tenantId,
            config,
            skipValidation,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static async deleteThirdPartyConfig(
        tenantId: string,
        thirdPartyId: string,
        userContext?: any
    ): Promise<{
        status: "OK";
        didConfigExist: boolean;
    }> {
        const recipeInstance = Recipe.getInstanceOrThrowError();
        return recipeInstance.recipeInterfaceImpl.deleteThirdPartyConfig({
            tenantId,
            thirdPartyId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static async associateUserToTenant(
        tenantId: string,
        recipeUserId: RecipeUserId,
        userContext?: any
    ): Promise<
        | {
              status: "OK";
              wasAlreadyAssociated: boolean;
          }
        | {
              status:
                  | "UNKNOWN_USER_ID_ERROR"
                  | "EMAIL_ALREADY_EXISTS_ERROR"
                  | "PHONE_NUMBER_ALREADY_EXISTS_ERROR"
                  | "THIRD_PARTY_USER_ALREADY_EXISTS_ERROR";
          }
        | {
              status: "ASSOCIATION_NOT_ALLOWED_ERROR";
              reason: string;
          }
    > {
        const recipeInstance = Recipe.getInstanceOrThrowError();
        return recipeInstance.recipeInterfaceImpl.associateUserToTenant({
            tenantId,
            recipeUserId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static async disassociateUserFromTenant(
        tenantId: string,
        recipeUserId: RecipeUserId,
        userContext?: any
    ): Promise<{
        status: "OK";
        wasAssociated: boolean;
    }> {
        const recipeInstance = Recipe.getInstanceOrThrowError();
        return recipeInstance.recipeInterfaceImpl.disassociateUserFromTenant({
            tenantId,
            recipeUserId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }
}

export let init = Wrapper.init;

export let createOrUpdateTenant = Wrapper.createOrUpdateTenant;
export let deleteTenant = Wrapper.deleteTenant;
export let getTenant = Wrapper.getTenant;
export let listAllTenants = Wrapper.listAllTenants;

export let createOrUpdateThirdPartyConfig = Wrapper.createOrUpdateThirdPartyConfig;
export let deleteThirdPartyConfig = Wrapper.deleteThirdPartyConfig;

export let associateUserToTenant = Wrapper.associateUserToTenant;
export let disassociateUserFromTenant = Wrapper.disassociateUserFromTenant;

export { AllowedDomainsClaim };
export type { RecipeInterface, APIOptions, APIInterface };
