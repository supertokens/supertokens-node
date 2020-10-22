import { Querier } from "./querier";
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

export default abstract class RecipeModule {
    protected recipeId: string;

    constructor(recipeId: string) {
        this.recipeId = recipeId;
    }

    getRecipeId = (): string => {
        return this.recipeId;
    };

    getQuerier = (): Querier => {
        return Querier.getInstanceOrThrowError(this.getRecipeId());
    };

    isErrorFromThisRecipe = (err: any): err is STError => {
        return STError.isErrorFromSuperTokens(err) && err.rId === this.getRecipeId();
    };
}
