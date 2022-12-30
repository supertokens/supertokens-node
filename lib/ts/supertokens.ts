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

import { TypeInput, NormalisedAppinfo, HTTPMethod, SuperTokensInfo } from "./types";
import axios from "axios";
import {
    normaliseInputAppInfoOrThrowError,
    maxVersion,
    normaliseHttpMethod,
    sendNon200ResponseWithMessage,
} from "./utils";
import { Querier } from "./querier";
import RecipeModule from "./recipeModule";
import { HEADER_RID, HEADER_FDI } from "./constants";
import NormalisedURLDomain from "./normalisedURLDomain";
import NormalisedURLPath from "./normalisedURLPath";
import { BaseRequest, BaseResponse } from "./framework";
import { TypeFramework } from "./framework/types";
import STError from "./error";
import { logDebugMessage } from "./logger";
import { PostSuperTokensInitCallbacks } from "./postSuperTokensInitCallbacks";
import { AccountInfo, AccountInfoWithRecipeId, User } from "./types";

export default class SuperTokens {
    private static instance: SuperTokens | undefined;

    framework: TypeFramework;

    appInfo: NormalisedAppinfo;

    isInServerlessEnv: boolean;

    recipeModules: RecipeModule[];

    supertokens: undefined | SuperTokensInfo;

    constructor(config: TypeInput) {
        logDebugMessage("Started SuperTokens with debug logging (supertokens.init called)");
        logDebugMessage("appInfo: " + JSON.stringify(config.appInfo));

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
            config.supertokens?.apiKey
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

        this.recipeModules = config.recipeList.map((func) => {
            return func(this.appInfo, this.isInServerlessEnv);
        });

        let telemetry = config.telemetry === undefined ? process.env.TEST_MODE !== "testing" : config.telemetry;

        if (telemetry) {
            if (this.isInServerlessEnv) {
                // see https://github.com/supertokens/supertokens-node/issues/127
                let randomNum = Math.random() * 10;
                if (randomNum > 7) {
                    this.sendTelemetry();
                }
            } else {
                this.sendTelemetry();
            }
        }
    }

    sendTelemetry = async () => {
        try {
            let querier = Querier.getNewInstanceOrThrowError(undefined);
            let response = await querier.sendGetRequest(new NormalisedURLPath("/telemetry"), {});
            let telemetryId: string | undefined;
            if (response.exists) {
                telemetryId = response.telemetryId;
            }
            await axios({
                method: "POST",
                url: "https://api.supertokens.com/0/st/telemetry",
                data: {
                    appName: this.appInfo.appName,
                    websiteDomain: this.appInfo.websiteDomain.getAsStringDangerous(),
                    telemetryId,
                },
                headers: {
                    "api-version": 2,
                },
            });
        } catch (ignored) {}
    };

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
        request: BaseRequest,
        response: BaseResponse,
        path: NormalisedURLPath,
        method: HTTPMethod
    ) => {
        return await matchedRecipe.handleAPIRequest(id, request, response, path, method);
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

    getUserCount = async (includeRecipeIds?: string[]): Promise<number> => {
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
        let response = await querier.sendGetRequest(new NormalisedURLPath("/users/count"), {
            includeRecipeIds: includeRecipeIdsStr,
        });
        return Number(response.count);
    };

    getUsers = async (input: {
        timeJoinedOrder: "ASC" | "DESC";
        limit?: number;
        paginationToken?: string;
        includeRecipeIds?: string[];
    }): Promise<{
        users: User[];
        nextPaginationToken?: string;
    }> => {
        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.7") === "2.7") {
            throw new Error(
                "Please use core version >= 3.5 to call this function. Otherwise, you can call <YourRecipe>.getUsersOldestFirst() or <YourRecipe>.getUsersNewestFirst() instead (for example, EmailPassword.getUsersOldestFirst())"
            );
        }
        let includeRecipeIdsStr = undefined;
        if (input.includeRecipeIds !== undefined) {
            includeRecipeIdsStr = input.includeRecipeIds.join(",");
        }
        let response = await querier.sendGetRequest(new NormalisedURLPath("/users"), {
            includeRecipeIds: includeRecipeIdsStr,
            timeJoinedOrder: input.timeJoinedOrder,
            limit: input.limit,
            paginationToken: input.paginationToken,
        });
        return {
            users: response.users,
            nextPaginationToken: response.nextPaginationToken,
        };
    };

    deleteUser = async (input: { userId: string; removeAllLinkedAccounts: boolean }): Promise<{ status: "OK" }> => {
        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let cdiVersion = await querier.getAPIVersion();
        if (maxVersion("2.10", cdiVersion) === cdiVersion) {
            // delete user is only available >= CDI 2.10
            await querier.sendPostRequest(new NormalisedURLPath("/user/remove"), {
                userId: input.userId,
            });

            return {
                status: "OK",
            };
        } else {
            throw new global.Error("Please upgrade the SuperTokens core to >= 3.7.0");
        }
    };

    createUserIdMapping = async function (input: {
        superTokensUserId: string;
        externalUserId: string;
        externalUserIdInfo?: string;
        force?: boolean;
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
            return await querier.sendPostRequest(new NormalisedURLPath("/recipe/userid/map"), {
                superTokensUserId: input.superTokensUserId,
                externalUserId: input.externalUserId,
                externalUserIdInfo: input.externalUserIdInfo,
                force: input.force,
            });
        } else {
            throw new global.Error("Please upgrade the SuperTokens core to >= 3.15.0");
        }
    };

    getUserIdMapping = async function (input: {
        userId: string;
        userIdType?: "SUPERTOKENS" | "EXTERNAL" | "ANY";
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
            let response = await querier.sendGetRequest(new NormalisedURLPath("/recipe/userid/map"), {
                userId: input.userId,
                userIdType: input.userIdType,
            });
            return response;
        } else {
            throw new global.Error("Please upgrade the SuperTokens core to >= 3.15.0");
        }
    };

    deleteUserIdMapping = async function (input: {
        userId: string;
        userIdType?: "SUPERTOKENS" | "EXTERNAL" | "ANY";
        force?: boolean;
    }): Promise<{
        status: "OK";
        didMappingExist: boolean;
    }> {
        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let cdiVersion = await querier.getAPIVersion();
        if (maxVersion("2.15", cdiVersion) === cdiVersion) {
            return await querier.sendPostRequest(new NormalisedURLPath("/recipe/userid/map/remove"), {
                userId: input.userId,
                userIdType: input.userIdType,
                force: input.force,
            });
        } else {
            throw new global.Error("Please upgrade the SuperTokens core to >= 3.15.0");
        }
    };

    updateOrDeleteUserIdMappingInfo = async function (input: {
        userId: string;
        userIdType?: "SUPERTOKENS" | "EXTERNAL" | "ANY";
        externalUserIdInfo?: string;
    }): Promise<{
        status: "OK" | "UNKNOWN_MAPPING_ERROR";
    }> {
        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let cdiVersion = await querier.getAPIVersion();
        if (maxVersion("2.15", cdiVersion) === cdiVersion) {
            return await querier.sendPutRequest(new NormalisedURLPath("/recipe/userid/external-user-id-info"), {
                userId: input.userId,
                userIdType: input.userIdType,
                externalUserIdInfo: input.externalUserIdInfo,
            });
        } else {
            throw new global.Error("Please upgrade the SuperTokens core to >= 3.15.0");
        }
    };

    middleware = async (request: BaseRequest, response: BaseResponse): Promise<boolean> => {
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

        let requestRID = request.getHeaderValue(HEADER_RID);
        logDebugMessage("middleware: requestRID is: " + requestRID);
        if (requestRID === "anti-csrf") {
            // see https://github.com/supertokens/supertokens-node/issues/202
            requestRID = undefined;
        }
        if (requestRID !== undefined) {
            let matchedRecipe: RecipeModule | undefined = undefined;

            // we loop through all recipe modules to find the one with the matching rId
            for (let i = 0; i < this.recipeModules.length; i++) {
                logDebugMessage("middleware: Checking recipe ID for match: " + this.recipeModules[i].getRecipeId());
                if (this.recipeModules[i].getRecipeId() === requestRID) {
                    matchedRecipe = this.recipeModules[i];
                    break;
                }
            }

            if (matchedRecipe === undefined) {
                logDebugMessage("middleware: Not handling because no recipe matched");
                // we could not find one, so we skip
                return false;
            }
            logDebugMessage("middleware: Matched with recipe ID: " + matchedRecipe.getRecipeId());

            let id = matchedRecipe.returnAPIIdIfCanHandleRequest(path, method);
            if (id === undefined) {
                logDebugMessage(
                    "middleware: Not handling because recipe doesn't handle request path or method. Request path: " +
                        path.getAsStringDangerous() +
                        ", request method: " +
                        method
                );
                // the matched recipe doesn't handle this path and http method
                return false;
            }

            logDebugMessage("middleware: Request being handled by recipe. ID is: " + id);

            // give task to the matched recipe
            let requestHandled = await matchedRecipe.handleAPIRequest(id, request, response, path, method);
            if (!requestHandled) {
                logDebugMessage("middleware: Not handled because API returned requestHandled as false");
                return false;
            }
            logDebugMessage("middleware: Ended");
            return true;
        } else {
            // we loop through all recipe modules to find the one with the matching path and method
            for (let i = 0; i < this.recipeModules.length; i++) {
                logDebugMessage("middleware: Checking recipe ID for match: " + this.recipeModules[i].getRecipeId());
                let id = this.recipeModules[i].returnAPIIdIfCanHandleRequest(path, method);
                if (id !== undefined) {
                    logDebugMessage("middleware: Request being handled by recipe. ID is: " + id);
                    let requestHandled = await this.recipeModules[i].handleAPIRequest(
                        id,
                        request,
                        response,
                        path,
                        method
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
    };

    errorHandler = async (err: any, request: BaseRequest, response: BaseResponse) => {
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
                    return await this.recipeModules[i].handleError(err, request, response);
                }
            }
        }
        throw err;
    };

    getUser = async (_input: { userId: string }): Promise<User | undefined> => {
        // TODO
        return;
    };

    listUsersByAccountInfo = async (_input: { info: AccountInfo }): Promise<User[] | undefined> => {
        /**
         * if input is only email:
         * let emailPasswordUser = emailpassword.getUserByEmail(email);
         *
         * let thirdpartyUsers = thirdparty.getUsersByEmail(email);
         *
         * let passwordlessUser = passwordless.getUserByEmail(email);
         *
         * let recipeUsers = [];
         *
         * if (emailPasswordUser !== undefined) {
         *      recipeUsers.push(emailPasswordUser);
         * }
         *
         * recipeUsers.push(...thirdpartyUsers);
         *
         * if (passwordlessUser !== undefined) {
         *      recipeUsers.push(passwordlessUser);
         * }
         *
         * let recipeUserIds = recipeUsers.map(r => r.id);
         *
         * let primaryUserIdMapping: {recipeUserId: primaryUserId} = getPrimaryUserIdsforRecipeUserIds(recipeUserIds);
         *
         * let result: {id: User | User[]} = {};
         *
         * for (let i = 0; i < recipeUsers.length; i++) {
         *      if (primaryUserIdMapping[recipeUsers[i].id] === undefined) {
         *          result[recipeUsers[i].id] = recipeUsers[i];
         *      } else {
         *          let pUserId = primaryUserIdMapping[recipeUsers[i].id];
         *          if (result[pUserId] === undefined) {
         *              result[pUserId] = [];
         *          }
         *          result[pUserId].push(recipeUsers[i]);
         *      }
         * }
         *
         *
         */
        return;
    };

    getUserByAccountInfoAndRecipeId = async (_input: { info: AccountInfoWithRecipeId }): Promise<User | undefined> => {
        // TODO
        return;
    };
}
