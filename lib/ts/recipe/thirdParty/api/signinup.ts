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

import Recipe from "../recipe";
import { Request, Response, NextFunction } from "express";
import { getRedirectionURI } from "../utils";
import STError from "../error";
import { send200Response } from "../../../utils";
import * as axios from "axios";
import * as qs from "querystring";
import { UserInfo } from "../types";
import Session from "../../session";

export default async function signInUpAPI(recipeInstance: Recipe, req: Request, res: Response, next: NextFunction) {
    let bodyParams = req.body;
    let thirdPartyId = bodyParams.thirdPartyId;
    let code = bodyParams.code;

    if (thirdPartyId === undefined || typeof thirdPartyId !== "string") {
        throw new STError(
            {
                type: STError.BAD_INPUT_ERROR,
                message: "Please provide the thirdPartyId in request body",
            },
            recipeInstance.getRecipeId()
        );
    }

    if (code === undefined || typeof code !== "string") {
        throw new STError(
            {
                type: STError.BAD_INPUT_ERROR,
                message: "Please provide the code in request body",
            },
            recipeInstance.getRecipeId()
        );
    }

    let provider = recipeInstance.providers.find((p) => p.id === thirdPartyId);
    if (provider === undefined) {
        throw new STError(
            {
                type: STError.BAD_INPUT_ERROR,
                message: "This provider is yet not supported",
            },
            recipeInstance.getRecipeId()
        );
    }

    let redirectURI = getRedirectionURI(recipeInstance, provider.id);
    let providerInfo = provider.get(redirectURI, code);
    let userInfo: UserInfo;
    try {
        let accessTokenAPIResponse = await axios.default({
            method: "post",
            url: providerInfo.accessTokenAPI.url,
            data: qs.stringify(providerInfo.accessTokenAPI.params),
            headers: {
                "content-type": "application/x-www-form-urlencoded",
            },
        });
        userInfo = await providerInfo.getProfileInfo(accessTokenAPIResponse.data);
    } catch (err) {
        throw new STError(
            {
                type: "GENERAL_ERROR",
                payload: err,
            },
            recipeInstance.getRecipeId()
        );
    }

    let emailInfo = userInfo.email;
    if (emailInfo === undefined) {
        throw new STError(
            {
                type: "NO_EMAIL_GIVEN_BY_PROVIDER",
                message: `sign in/up successful but provider ${provider.id} returned no email info for the user.`,
            },
            recipeInstance.getRecipeId()
        );
    }
    let user = await recipeInstance.signInUp(provider.id, userInfo.id, emailInfo);

    await Session.createNewSession(res, user.user.id);
    return send200Response(res, {
        status: "OK",
        ...user,
    });
}
