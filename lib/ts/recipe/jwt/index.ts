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

import Recipe from "./recipe";
import { APIInterface, RecipeInterface, APIOptions, JsonWebKey } from "./types";

export default class Wrapper {
    static init = Recipe.init;

    static async createJWT(payload: any, validity?: number) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.createJWT({
            payload,
            validity,
        });
    }

    static async getJWKS() {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getJWKS();
    }
}

export let init = Wrapper.init;
export let createJWT = Wrapper.createJWT;
export let getJWKS = Wrapper.getJWKS;

export type { APIInterface, APIOptions, RecipeInterface, JsonWebKey };
