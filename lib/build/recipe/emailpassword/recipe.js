"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const recipeModule_1 = require("../../recipeModule");
class Recipe extends recipeModule_1.default {
    constructor(recipeId, appInfo, config) {
        super(recipeId, appInfo);
        // TODO: init function
        // TODO: getInstanceOrThrowError
        // TODO: reset
        // abstract instance functions below...............
        this.getAPIsHandled = () => {
            // TODO:
            return [];
        };
        this.handleAPIRequest = (id, req, res, next) => {
            // TODO:
        };
        this.handleError = (err, request, response, next) => {
            // TODO:
        };
        this.getAllCORSHeaders = () => {
            // TODO:
            return [];
        };
        // TODO: load config
    }
}
exports.default = Recipe;
Recipe.instance = undefined;
Recipe.RECIPE_ID = "email-password";
//# sourceMappingURL=recipe.js.map
