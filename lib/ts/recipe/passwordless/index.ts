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
import SuperTokensError from "./error";
import { RecipeInterface, User, APIOptions, APIInterface } from "./types";

/* TODO: Apart from the recipe functions, we should also add:
- Sign up user function
- Create magicLink function for email / phoneNumber */

// For Express
export default class Wrapper {
    static init = Recipe.init;

    static Error = SuperTokensError;

    // TODO:
}

export let init = Wrapper.init;

export let Error = Wrapper.Error;

export type { RecipeInterface, User, APIOptions, APIInterface };
