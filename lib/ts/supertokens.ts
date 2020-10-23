/* Copyright (c) 2020, VRAI Labs and/or its affiliates. All rights reserved.
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

import STError from "./error";
import { TypeInput, NormalisedAppinfo } from "./types";
import { normaliseInputAppInfoOrThrowError, normaliseURLDomainOrThrowError } from "./utils";
import { Querier } from "./querier";
import RecipeModule from "./recipeModule";

export default class SuperTokens {
    private static instance: SuperTokens | undefined;

    appInfo: NormalisedAppinfo;

    recipeModules: RecipeModule[];

    constructor(config: TypeInput) {
        try {
            this.appInfo = normaliseInputAppInfoOrThrowError(config.appInfo);

            Querier.init(
                config.supertokens.connectionURI.split(";").map((h) => normaliseURLDomainOrThrowError(h)),
                config.supertokens.apiKey
            );

            if (config.recipeList === undefined || config.recipeList.length === 0) {
                throw new Error("Please provide at least one recipe to the supertokens.init function call");
            }

            this.recipeModules = config.recipeList.map((func) => {
                return func(this.appInfo);
            });
        } catch (err) {
            if (STError.isErrorFromSuperTokens(err)) {
                throw err;
            }
            throw new STError({
                type: STError.GENERAL_ERROR,
                rId: "",
                payload: err,
            });
        }
    }

    static init(config: TypeInput) {
        if (SuperTokens.instance === undefined) {
            SuperTokens.instance = new SuperTokens(config);
        } else {
            throw new STError({
                type: STError.GENERAL_ERROR,
                rId: "",
                payload: new Error("SuperTokens has already been initialised. Please check your code for bugs."),
            });
        }
    }

    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new STError({
                type: STError.GENERAL_ERROR,
                rId: "",
                message: "calling testing function in non testing env",
            });
        }
        Querier.reset();
        SuperTokens.instance = undefined;
    }

    static middleware() {
        // TODO:
    }

    static errorHandler() {
        // TODO:
    }
}
