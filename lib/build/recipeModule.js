"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const querier_1 = require("./querier");
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
const error_1 = require("./error");
class RecipeModule {
    constructor(recipeId) {
        this.getRecipeId = () => {
            return this.recipeId;
        };
        this.getQuerier = () => {
            return querier_1.Querier.getInstanceOrThrowError(this.getRecipeId());
        };
        this.isErrorFromThisRecipe = (err) => {
            return error_1.default.isErrorFromSuperTokens(err) && err.rId === this.getRecipeId();
        };
        this.recipeId = recipeId;
    }
}
exports.default = RecipeModule;
//# sourceMappingURL=recipeModule.js.map
