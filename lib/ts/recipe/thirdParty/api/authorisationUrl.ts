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
import { send200Response } from "../../../utils";
import STError from "../error";
import { getRedirectionURI } from "../utils";
import { URLSearchParams } from "url";
import { TypeProviderGetResponse } from "../types";

export default async function authorisationUrlAPI(
    recipeInstance: Recipe,
    req: Request,
    res: Response,
    next: NextFunction
) {
    let queryParams = req.query;
    let thirdPartyId = queryParams.thirdPartyId;

    if (thirdPartyId === undefined || typeof thirdPartyId !== "string") {
        throw new STError(
            {
                type: STError.BAD_INPUT_ERROR,
                message: "Please provide the thirdPartyId as a GET param",
            },
            recipeInstance.getRecipeId()
        );
    }

    let provider = recipeInstance.providers.find((p) => p.id === thirdPartyId);
    if (provider === undefined) {
        throw new STError(
            {
                type: STError.BAD_INPUT_ERROR,
                message:
                    "The third party provider " +
                    thirdPartyId +
                    " seems to not be configured on the backend. Please check your frontend and backend configs.",
            },
            recipeInstance.getRecipeId()
        );
    }

    let redirectURI = getRedirectionURI(recipeInstance, provider.id);
    let providerInfo: TypeProviderGetResponse;
    try {
        providerInfo = provider.get(redirectURI, undefined);
    } catch (err) {
        throw new STError(
            {
                type: "GENERAL_ERROR",
                payload: err,
            },
            recipeInstance.getRecipeId()
        );
    }
    let paramsString = new URLSearchParams(providerInfo.authorisationRedirect.params).toString();

    let url = `${redirectURI}?${paramsString}`;

    return send200Response(res, {
        status: "OK",
        url,
    });
}
