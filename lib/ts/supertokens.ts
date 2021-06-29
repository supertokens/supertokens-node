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

import { TypeInput, NormalisedAppinfo, HTTPMethod, InputSchema } from "./types";
import axios from "axios";
import {
    normaliseInputAppInfoOrThrowError,
    validateTheStructureOfUserInput,
    removeServerlessCache,
    maxVersion,
} from "./utils";
import { Querier } from "./querier";
import RecipeModule from "./recipeModule";
import { HEADER_RID, HEADER_FDI } from "./constants";
import NormalisedURLDomain from "./normalisedURLDomain";
import NormalisedURLPath from "./normalisedURLPath";
import { BaseRequest, BaseResponse } from "./wrappers";

export default class SuperTokens {
    private static instance: SuperTokens | undefined;

    appInfo: NormalisedAppinfo;

    isInServerlessEnv: boolean;

    recipeModules: RecipeModule[];

    constructor(config: TypeInput) {
        validateTheStructureOfUserInput(config, InputSchema, "init function");

        this.appInfo = normaliseInputAppInfoOrThrowError(config.appInfo);

        Querier.init(
            config.supertokens?.connectionURI
                .split(";")
                .filter((h) => h !== "")
                .map((h) => new NormalisedURLDomain(h.trim())),
            config.supertokens?.apiKey
        );

        if (config.recipeList === undefined || config.recipeList.length === 0) {
            throw new Error("Please provide at least one recipe to the supertokens.init function call");
        }

        this.isInServerlessEnv = config.isInServerlessEnv === undefined ? false : config.isInServerlessEnv;

        if (!this.isInServerlessEnv) {
            /**
             * remove the files from the temp file-system.
             * for users using this lib in a serverless execution environment,
             * if the users updates/changes the core version they are using,
             * handshake info and api version that are stored in the temp files
             * might also be required to be updated. User can enforce this by stetting
             * this boolean to false, which would remove the files from the temporary
             * directory. The user can then again set it to true which would store the
             * updated handshake info and apiversion in the temp files
             */
            removeServerlessCache();
        }

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
            let querier = Querier.getNewInstanceOrThrowError(this.isInServerlessEnv, undefined);
            let response = await querier.sendGetRequest(new NormalisedURLPath("/telemetry"), {});
            let telemetryId: string | undefined;
            if (response.exists) {
                telemetryId = response.telemetryId;
            }
            await axios({
                method: "POST",
                url: "https://api.supertokens.io/0/st/telemetry",
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
        let querier = Querier.getNewInstanceOrThrowError(this.isInServerlessEnv, undefined);
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
        users: { recipeId: string; user: any }[];
        nextPaginationToken?: string;
    }> => {
        let querier = Querier.getNewInstanceOrThrowError(this.isInServerlessEnv, undefined);
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
}
