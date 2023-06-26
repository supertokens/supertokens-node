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

import MfaRecipe from "./recipe";
import SuperTokensError from "./error";
import { SessionContainer } from "../session";
import { checkAllowedAsFirstFactor as checkAllowedAsFirstFactorUtil } from "./utils";

export default class Wrapper {
    static init = MfaRecipe.init;

    static Error = SuperTokensError;

    static async enableFactorForUser(session: SessionContainer, factorId: string, userContext?: any) {
        return await MfaRecipe.getInstanceOrThrowError().recipeInterfaceImpl.enableFactorForUser({
            tenantId: "public", // TODO: Pass a variable
            userId: session.getUserId(),
            factorId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static async disableFactorForUser(session: SessionContainer, factorId: string, userContext?: any) {
        return await MfaRecipe.getInstanceOrThrowError().recipeInterfaceImpl.disableFactorForUser({
            tenantId: "public", // TODO: Pass a variable
            userId: session.getUserId(),
            factorId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static async getAllFactorsEnabledForUser(session: SessionContainer, userContext?: any) {
        return await MfaRecipe.getInstanceOrThrowError().recipeInterfaceImpl.getAllFactorsEnabledForUser({
            tenantId: "public", // TODO: Pass a variable
            userId: session.getUserId(),
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static async isFactorAlreadySetup(session: SessionContainer, factorId: string, userContext?: any) {
        return await MfaRecipe.getInstanceOrThrowError().recipeInterfaceImpl.isFactorAlreadySetup({
            session,
            factorId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static async completeFactorInSession(session: SessionContainer, factorId: string, userContext?: any) {
        return await MfaRecipe.getInstanceOrThrowError().recipeInterfaceImpl.completeFactorInSession({
            session,
            factorId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }
}

export let init = Wrapper.init;
export let Error = Wrapper.Error;

export let enableFactorForUser = Wrapper.enableFactorForUser;
export let disableFactorForUser = Wrapper.disableFactorForUser;
export let getAllFactorsEnabledForUser = Wrapper.getAllFactorsEnabledForUser;
export let isFactorAlreadySetup = Wrapper.isFactorAlreadySetup;

export let completeFactorInSession = Wrapper.completeFactorInSession;
export let checkAllowedAsFirstFactor = checkAllowedAsFirstFactorUtil;
