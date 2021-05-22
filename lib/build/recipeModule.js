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
Object.defineProperty(exports, "__esModule", { value: true });
const querier_1 = require("./querier");
class RecipeModule {
    constructor(recipeId, appInfo, isInServerlessEnv, rIdToCore) {
        this.getRecipeId = () => {
            return this.recipeId;
        };
        this.getAppInfo = () => {
            return this.appInfo;
        };
        this.checkIfInServerlessEnv = () => {
            return this.isInServerlessEnv;
        };
        this.getQuerier = () => {
            if (this.querier === undefined) {
                this.querier = querier_1.Querier.getInstanceOrThrowError(this.isInServerlessEnv, this.rIdToCore);
            }
            return this.querier;
        };
        this.returnAPIIdIfCanHandleRequest = (path, method) => {
            let apisHandled = this.getAPIsHandled();
            for (let i = 0; i < apisHandled.length; i++) {
                let currAPI = apisHandled[i];
                if (
                    !currAPI.disabled &&
                    currAPI.method === method &&
                    this.appInfo.apiBasePath.appendPath(currAPI.pathWithoutApiBasePath).equals(path)
                ) {
                    return currAPI.id;
                }
            }
            return undefined;
        };
        this.recipeId = recipeId;
        this.appInfo = appInfo;
        this.isInServerlessEnv = isInServerlessEnv;
        // we use the recipeID of this recipe if rIdToCore is not overriding it..
        this.rIdToCore = rIdToCore === undefined ? recipeId : rIdToCore;
    }
}
exports.default = RecipeModule;
//# sourceMappingURL=recipeModule.js.map
