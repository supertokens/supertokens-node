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

import { TypeInput, NormalisedAppinfo, HTTPMethod, SuperTokensInfo, UserContext } from "./types";
import {
    normaliseInputAppInfoOrThrowError,
    maxVersion,
    normaliseHttpMethod,
    sendNon200ResponseWithMessage,
    getRidFromHeader,
} from "./utils";
import { Querier } from "./querier";
import RecipeModule from "./recipeModule";
import { HEADER_RID, HEADER_FDI } from "./constants";
import NormalisedURLDomain from "./normalisedURLDomain";
import NormalisedURLPath from "./normalisedURLPath";
import type { BaseRequest, BaseResponse } from "./framework";
import type { TypeFramework } from "./framework/types";
import STError from "./error";
import { enableDebugLogs, logDebugMessage } from "./logger";
import { PostSuperTokensInitCallbacks } from "./postSuperTokensInitCallbacks";
import { DEFAULT_TENANT_ID } from "./recipe/multitenancy/constants";

export default class SuperTokens {
    private static instance: SuperTokens | undefined;

    framework: TypeFramework;

    appInfo: NormalisedAppinfo;

    isInServerlessEnv: boolean;

    recipeModules: RecipeModule[];

    supertokens: undefined | SuperTokensInfo;

    telemetryEnabled: boolean;

    constructor(config: TypeInput) {
        if (config.debug === true) {
            enableDebugLogs();
        }

        logDebugMessage("Started SuperTokens with debug logging (supertokens.init called)");
        const originToPrint =
            config.appInfo.origin === undefined
                ? undefined
                : typeof config.appInfo.origin === "string"
                ? config.appInfo.origin
                : "function";
        logDebugMessage(
            "appInfo: " +
                JSON.stringify({
                    ...config.appInfo,
                    origin: originToPrint,
                })
        );

        this.framework = config.framework !== undefined ? config.framework : "express";
        logDebugMessage("framework: " + this.framework);
        this.appInfo = normaliseInputAppInfoOrThrowError(config.appInfo);
        this.supertokens = config.supertokens;

        Querier.init(
            config.supertokens?.connectionURI
                .split(";")
                .filter((h) => h !== "")
                .map((h) => {
                    return {
                        domain: new NormalisedURLDomain(h.trim()),
                        basePath: new NormalisedURLPath(h.trim()),
                    };
                }),
            config.supertokens?.apiKey,
            config.supertokens?.networkInterceptor,
            config.supertokens?.disableCoreCallCache
        );
        if (config.recipeList === undefined || config.recipeList.length === 0) {
            throw new Error("Please provide at least one recipe to the supertokens.init function call");
        }

        // @ts-ignore
        if (config.recipeList.includes(undefined)) {
            // related to issue #270. If user makes mistake by adding empty items in the recipeList, this will catch the mistake and throw relevant error
            throw new Error("Please remove empty items from recipeList");
        }

        this.isInServerlessEnv = config.isInServerlessEnv === undefined ? false : config.isInServerlessEnv;

        let multitenancyFound = false;
        let totpFound = false;
        let userMetadataFound = false;
        let multiFactorAuthFound = false;

        // Multitenancy recipe is an always initialized recipe and needs to be imported this way
        // so that there is no circular dependency. Otherwise there would be cyclic dependency
        // between `supertokens.ts` -> `recipeModule.ts` -> `multitenancy/recipe.ts`
        let MultitenancyRecipe = require("./recipe/multitenancy/recipe").default;
        let UserMetadataRecipe = require("./recipe/usermetadata/recipe").default;
        let MultiFactorAuthRecipe = require("./recipe/multifactorauth/recipe").default;
        let TotpRecipe = require("./recipe/totp/recipe").default;

        this.recipeModules = config.recipeList.map((func) => {
            const recipeModule = func(this.appInfo, this.isInServerlessEnv);
            if (recipeModule.getRecipeId() === MultitenancyRecipe.RECIPE_ID) {
                multitenancyFound = true;
            } else if (recipeModule.getRecipeId() === UserMetadataRecipe.RECIPE_ID) {
                userMetadataFound = true;
            } else if (recipeModule.getRecipeId() === MultiFactorAuthRecipe.RECIPE_ID) {
                multiFactorAuthFound = true;
            } else if (recipeModule.getRecipeId() === TotpRecipe.RECIPE_ID) {
                totpFound = true;
            }
            return recipeModule;
        });

        if (!multitenancyFound) {
            this.recipeModules.push(MultitenancyRecipe.init()(this.appInfo, this.isInServerlessEnv));
        }
        if (totpFound && !multiFactorAuthFound) {
            throw new Error("Please initialize the MultiFactorAuth recipe to use TOTP.");
        }
        if (!userMetadataFound) {
            // Initializing the user metadata recipe shouldn't cause any issues/side effects and it doesn't expose any APIs,
            // so we can just always initialize it
            this.recipeModules.push(UserMetadataRecipe.init()(this.appInfo, this.isInServerlessEnv));
        }
        // While for many usecases account linking recipe also has to be initialized for MFA to function well,
        // the app doesn't have to do that if they only use TOTP (which shouldn't be that uncommon)
        // To let those cases function without initializing account linking we do not check it here, but when
        // the authentication endpoints are called.

        this.telemetryEnabled = config.telemetry === undefined ? process.env.TEST_MODE !== "testing" : config.telemetry;
    }

    static init(config: TypeInput) {
        if (SuperTokens.instance === undefined) {
            SuperTokens.instance = new SuperTokens(config);
            PostSuperTokensInitCallbacks.runPostInitCallbacks();
        }
    }

    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new Error("calling testing function in non testing env");
        }
        Querier.reset();
        SuperTokens.instance = undefined;
    }

    static getInstanceOrThrowError(): SuperTokens {
        if (SuperTokens.instance !== undefined) {
            return SuperTokens.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the SuperTokens.init function?");
    }

    handleAPI = async (
        matchedRecipe: RecipeModule,
        id: string,
        tenantId: string,
        request: BaseRequest,
        response: BaseResponse,
        path: NormalisedURLPath,
        method: HTTPMethod,
        userContext: UserContext
    ) => {
        return await matchedRecipe.handleAPIRequest(id, tenantId, request, response, path, method, userContext);
    };

    getAllCORSHeaders = (): string[] => {
        let headerSet = new Set<string>();
        headerSet.add(HEADER_RID);
        headerSet.add(HEADER_FDI);
        this.recipeModules.forEach((recipe) => {
            let headers = recipe.getAllCORSHeaders();
            headers.forEach((h) => {
                headerSet.add(h);
            });
        });
        return Array.from(headerSet);
    };

    getUserCount = async (
        includeRecipeIds: string[] | undefined,
        tenantId: string | undefined,
        userContext: UserContext
    ): Promise<number> => {
        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.7") === "2.7") {
            throw new Error(
                "Please use core version >= 3.5 to call this function. Otherwise, you can call <YourRecipe>.getUserCount() instead (for example, EmailPassword.getUserCount())"
            );
        }
        let includeRecipeIdsStr = undefined;
        if (includeRecipeIds !== undefined) {
            includeRecipeIdsStr = includeRecipeIds.join(",");
        }

        let response = await querier.sendGetRequest(
            new NormalisedURLPath(`/${tenantId === undefined ? DEFAULT_TENANT_ID : tenantId}/users/count`),
            {
                includeRecipeIds: includeRecipeIdsStr,
                includeAllTenants: tenantId === undefined,
            },
            userContext
        );
        return Number(response.count);
    };

    createUserIdMapping = async function (input: {
        superTokensUserId: string;
        externalUserId: string;
        externalUserIdInfo?: string;
        force?: boolean;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK" | "UNKNOWN_SUPERTOKENS_USER_ID_ERROR";
          }
        | {
              status: "USER_ID_MAPPING_ALREADY_EXISTS_ERROR";
              doesSuperTokensUserIdExist: boolean;
              doesExternalUserIdExist: boolean;
          }
    > {
        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let cdiVersion = await querier.getAPIVersion();
        if (maxVersion("2.15", cdiVersion) === cdiVersion) {
            // create userId mapping is only available >= CDI 2.15
            return await querier.sendPostRequest(
                new NormalisedURLPath("/recipe/userid/map"),
                {
                    superTokensUserId: input.superTokensUserId,
                    externalUserId: input.externalUserId,
                    externalUserIdInfo: input.externalUserIdInfo,
                    force: input.force,
                },
                input.userContext
            );
        } else {
            throw new global.Error("Please upgrade the SuperTokens core to >= 3.15.0");
        }
    };

    getUserIdMapping = async function (input: {
        userId: string;
        userIdType?: "SUPERTOKENS" | "EXTERNAL" | "ANY";
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              superTokensUserId: string;
              externalUserId: string;
              externalUserIdInfo: string | undefined;
          }
        | {
              status: "UNKNOWN_MAPPING_ERROR";
          }
    > {
        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let cdiVersion = await querier.getAPIVersion();
        if (maxVersion("2.15", cdiVersion) === cdiVersion) {
            // create userId mapping is only available >= CDI 2.15
            let response = await querier.sendGetRequest(
                new NormalisedURLPath("/recipe/userid/map"),
                {
                    userId: input.userId,
                    userIdType: input.userIdType,
                },
                input.userContext
            );
            return response;
        } else {
            throw new global.Error("Please upgrade the SuperTokens core to >= 3.15.0");
        }
    };

    deleteUserIdMapping = async function (input: {
        userId: string;
        userIdType?: "SUPERTOKENS" | "EXTERNAL" | "ANY";
        force?: boolean;
        userContext: UserContext;
    }): Promise<{
        status: "OK";
        didMappingExist: boolean;
    }> {
        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let cdiVersion = await querier.getAPIVersion();
        if (maxVersion("2.15", cdiVersion) === cdiVersion) {
            return await querier.sendPostRequest(
                new NormalisedURLPath("/recipe/userid/map/remove"),
                {
                    userId: input.userId,
                    userIdType: input.userIdType,
                    force: input.force,
                },
                input.userContext
            );
        } else {
            throw new global.Error("Please upgrade the SuperTokens core to >= 3.15.0");
        }
    };

    updateOrDeleteUserIdMappingInfo = async function (input: {
        userId: string;
        userIdType?: "SUPERTOKENS" | "EXTERNAL" | "ANY";
        externalUserIdInfo?: string;
        userContext: UserContext;
    }): Promise<{
        status: "OK" | "UNKNOWN_MAPPING_ERROR";
    }> {
        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let cdiVersion = await querier.getAPIVersion();
        if (maxVersion("2.15", cdiVersion) === cdiVersion) {
            return await querier.sendPutRequest(
                new NormalisedURLPath("/recipe/userid/external-user-id-info"),
                {
                    userId: input.userId,
                    userIdType: input.userIdType,
                    externalUserIdInfo: input.externalUserIdInfo,
                },
                input.userContext
            );
        } else {
            throw new global.Error("Please upgrade the SuperTokens core to >= 3.15.0");
        }
    };

    middleware = async (request: BaseRequest, response: BaseResponse, userContext: UserContext): Promise<boolean> => {
        logDebugMessage("middleware: Started");
        let path = this.appInfo.apiGatewayPath.appendPath(new NormalisedURLPath(request.getOriginalURL()));
        let method: HTTPMethod = normaliseHttpMethod(request.getMethod());

        // if the prefix of the URL doesn't match the base path, we skip
        if (!path.startsWith(this.appInfo.apiBasePath)) {
            logDebugMessage(
                "middleware: Not handling because request path did not start with config path. Request path: " +
                    path.getAsStringDangerous()
            );
            return false;
        }

        let requestRID = getRidFromHeader(request);
        logDebugMessage("middleware: requestRID is: " + requestRID);
        if (requestRID === "anti-csrf") {
            // see https://github.com/supertokens/supertokens-node/issues/202
            requestRID = undefined;
        }

        async function handleWithoutRid(recipeModules: RecipeModule[]) {
            for (let i = 0; i < recipeModules.length; i++) {
                logDebugMessage(
                    "middleware: Checking recipe ID for match: " +
                        recipeModules[i].getRecipeId() +
                        " with path: " +
                        path.getAsStringDangerous() +
                        " and method: " +
                        method
                );
                let idResult = await recipeModules[i].returnAPIIdIfCanHandleRequest(path, method, userContext);
                if (idResult !== undefined) {
                    logDebugMessage("middleware: Request being handled by recipe. ID is: " + idResult.id);
                    let requestHandled = await recipeModules[i].handleAPIRequest(
                        idResult.id,
                        idResult.tenantId,
                        request,
                        response,
                        path,
                        method,
                        userContext
                    );
                    if (!requestHandled) {
                        logDebugMessage("middleware: Not handled because API returned requestHandled as false");
                        return false;
                    }
                    logDebugMessage("middleware: Ended");
                    return true;
                }
            }
            logDebugMessage("middleware: Not handling because no recipe matched");
            return false;
        }

        if (requestRID !== undefined) {
            // We have the below matching based on RID header cause
            // we still support older FDIs (< 1.20). In the newer FDIs,
            // the API paths across all recipes are unique.
            let matchedRecipe: RecipeModule[] = [];

            // we loop through all recipe modules to find the one with the matching rId
            for (let i = 0; i < this.recipeModules.length; i++) {
                logDebugMessage("middleware: Checking recipe ID for match: " + this.recipeModules[i].getRecipeId());
                if (this.recipeModules[i].getRecipeId() === requestRID) {
                    matchedRecipe.push(this.recipeModules[i]);
                } else if (requestRID === "thirdpartyemailpassword") {
                    if (
                        this.recipeModules[i].getRecipeId() === "thirdparty" ||
                        this.recipeModules[i].getRecipeId() === "emailpassword"
                    ) {
                        matchedRecipe.push(this.recipeModules[i]);
                    }
                } else if (requestRID === "thirdpartypasswordless") {
                    if (
                        this.recipeModules[i].getRecipeId() === "thirdparty" ||
                        this.recipeModules[i].getRecipeId() === "passwordless"
                    ) {
                        matchedRecipe.push(this.recipeModules[i]);
                    }
                }
            }

            if (matchedRecipe.length === 0) {
                logDebugMessage("middleware: Not handling based on rid match. Trying without rid.");
                return handleWithoutRid(this.recipeModules);
            }
            for (let i = 0; i < matchedRecipe.length; i++) {
                logDebugMessage("middleware: Matched with recipe IDs: " + matchedRecipe[i].getRecipeId());
            }
            let idResult:
                | {
                      id: string;
                      tenantId: string;
                  }
                | undefined = undefined;

            let finalMatchedRecipe: RecipeModule | undefined = undefined;
            for (let i = 0; i < matchedRecipe.length; i++) {
                // Here we assume that if there are multiple recipes that have matched, then
                // the path and methods of the APIs exposed via those recipes is unique.
                let currIdResult = await matchedRecipe[i].returnAPIIdIfCanHandleRequest(path, method, userContext);
                if (currIdResult !== undefined) {
                    if (idResult !== undefined) {
                        throw new Error(
                            "Two recipes have matched the same API path and method! This is a bug in the SDK. Please contact support."
                        );
                    } else {
                        finalMatchedRecipe = matchedRecipe[i];
                        idResult = currIdResult;
                    }
                }
            }
            if (idResult === undefined || finalMatchedRecipe === undefined) {
                return handleWithoutRid(this.recipeModules);
            }

            logDebugMessage("middleware: Request being handled by recipe. ID is: " + idResult.id);

            // give task to the matched recipe
            let requestHandled = await finalMatchedRecipe.handleAPIRequest(
                idResult.id,
                idResult.tenantId,
                request,
                response,
                path,
                method,
                userContext
            );
            if (!requestHandled) {
                logDebugMessage("middleware: Not handled because API returned requestHandled as false");
                return false;
            }
            logDebugMessage("middleware: Ended");
            return true;
        } else {
            return handleWithoutRid(this.recipeModules);
        }
    };

    errorHandler = async (err: any, request: BaseRequest, response: BaseResponse, userContext: UserContext) => {
        logDebugMessage("errorHandler: Started");
        if (STError.isErrorFromSuperTokens(err)) {
            logDebugMessage("errorHandler: Error is from SuperTokens recipe. Message: " + err.message);
            if (err.type === STError.BAD_INPUT_ERROR) {
                logDebugMessage("errorHandler: Sending 400 status code response");
                return sendNon200ResponseWithMessage(response, err.message, 400);
            }

            for (let i = 0; i < this.recipeModules.length; i++) {
                logDebugMessage("errorHandler: Checking recipe for match: " + this.recipeModules[i].getRecipeId());
                if (this.recipeModules[i].isErrorFromThisRecipe(err)) {
                    logDebugMessage("errorHandler: Matched with recipeID: " + this.recipeModules[i].getRecipeId());
                    return await this.recipeModules[i].handleError(err, request, response, userContext);
                }
            }
        }
        throw err;
    };

    getRequestFromUserContext = (userContext: UserContext | undefined): BaseRequest | undefined => {
        if (userContext === undefined) {
            return undefined;
        }

        if (typeof userContext !== "object") {
            return undefined;
        }

        if (userContext._default === undefined) {
            return undefined;
        }

        if (userContext._default.request === undefined) {
            return undefined;
        }

        return userContext._default.request;
    };
}
