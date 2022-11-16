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

import error from "../../error";
import { BaseRequest, BaseResponse } from "../../framework";
import normalisedURLPath from "../../normalisedURLPath";
import RecipeModule from "../../recipeModule";
import SuperTokens from "../..";
import { APIHandled, HTTPMethod } from "../../types";
import { SessionContainer } from "../session";
import { User, RecipeInterface, AccountInfoAndEmailWithRecipeId } from "./types";

export default class AccountLinkingRecipe extends RecipeModule {
    recipeInterfaceImpl: RecipeInterface;

    getAPIsHandled(): APIHandled[] {
        throw new Error("Method not implemented.");
    }
    handleAPIRequest(id: string, req: BaseRequest, response: BaseResponse, path: normalisedURLPath, method: HTTPMethod): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
    handleError(error: error, request: BaseRequest, response: BaseResponse): Promise<void> {
        throw new Error("Method not implemented.");
    }
    
    getAllCORSHeaders(): string[] {
        throw new Error("Method not implemented.");
    }
    isErrorFromThisRecipe(err: any): err is error {
        throw new Error("Method not implemented.");
    }
    isSignUpAllowed = async (
        identifyinInfo: AccountInfoAndEmailWithRecipeId
    ): Promise<boolean> => {
        let user: User | undefined = await SuperTokens.getUserByAccountInfo(identifyinInfo);
        if (user === undefined || !user.isPrimaryUser) {
            return true;
        }
        let shouldRequireVerification = false; // TOOD: call shouldRequireVerification from config
        if (!shouldRequireVerification) {
            return true;
        }
        // /**
        //  * for each linked recipes, get all the verified identifying info
        //  * 
        //  * if the input identifyingInfo is found in the above generated list
        //  * of verified identifyingInfos, return true else false.
        //  */
        return true;
    }
    createPrimaryUserIdOrLinkAccountPostSignUp = async (
        identifyinInfo: AccountInfoAndEmailWithRecipeId,
        shouldRequireVerification: boolean
    ) => {
        // TODO
    }
    accountLinkPostSignInViaSession = async (
        session: SessionContainer,
        identifyinInfo: AccountInfoAndEmailWithRecipeId
    ): Promise<{
        createRecipeUser: true
    } | ({
        createRecipeUser: false,
    } & ({
        accountsLinked: true
    } | {
        accountsLinked: false,
        reason: string // TODO
    }))> => {
        // let userId = session.getUserId();
        return {
            createRecipeUser: true
        };
    }
}