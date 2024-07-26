"use strict";
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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const normalisedURLPath_1 = __importDefault(require("./normalisedURLPath"));
const constants_1 = require("./recipe/multitenancy/constants");
class RecipeModule {
    constructor(recipeId, appInfo) {
        this.getRecipeId = () => {
            return this.recipeId;
        };
        this.getAppInfo = () => {
            return this.appInfo;
        };
        this.returnAPIIdIfCanHandleRequest = async (path, method, userContext) => {
            let apisHandled = this.getAPIsHandled();
            const basePathStr = this.appInfo.apiBasePath.getAsStringDangerous();
            const pathStr = path.getAsStringDangerous();
            const regex = new RegExp(`^${basePathStr}(?:/([a-zA-Z0-9-]+))?(/.*)$`);
            const match = pathStr.match(regex);
            let tenantId = constants_1.DEFAULT_TENANT_ID;
            let remainingPath = undefined;
            if (match) {
                tenantId = match[1];
                remainingPath = new normalisedURLPath_1.default(match[2]);
            }
            // Multitenancy recipe is an always initialized recipe and needs to be imported this way
            // so that there is no circular dependency. Otherwise there would be cyclic dependency
            // between `supertokens.ts` -> `recipeModule.ts` -> `multitenancy/recipe.ts`
            let MultitenancyRecipe = require("./recipe/multitenancy/recipe").default;
            const mtRecipe = MultitenancyRecipe.getInstanceOrThrowError();
            for (let i = 0; i < apisHandled.length; i++) {
                let currAPI = apisHandled[i];
                if (!currAPI.disabled && currAPI.method === method) {
                    if (this.appInfo.apiBasePath.appendPath(currAPI.pathWithoutApiBasePath).equals(path)) {
                        const finalTenantId = await mtRecipe.recipeInterfaceImpl.getTenantId({
                            tenantIdFromFrontend: constants_1.DEFAULT_TENANT_ID,
                            userContext,
                        });
                        return { id: currAPI.id, tenantId: finalTenantId, exactMatch: true };
                    } else if (
                        remainingPath !== undefined &&
                        this.appInfo.apiBasePath
                            .appendPath(currAPI.pathWithoutApiBasePath)
                            .equals(this.appInfo.apiBasePath.appendPath(remainingPath))
                    ) {
                        const finalTenantId = await mtRecipe.recipeInterfaceImpl.getTenantId({
                            tenantIdFromFrontend: tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId,
                            userContext,
                        });
                        return { id: currAPI.id, tenantId: finalTenantId, exactMatch: false };
                    }
                }
            }
            return undefined;
        };
        this.recipeId = recipeId;
        this.appInfo = appInfo;
    }
}
exports.default = RecipeModule;
