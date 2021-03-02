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

import STError from "../../error";
import RecipeModule from "../../recipeModule";

export default class ThirdPartyError extends STError {
    static UNKNOWN_USER_ID_ERROR: "UNKNOWN_USER_ID_ERROR" = "UNKNOWN_USER_ID_ERROR";
    static NO_EMAIL_GIVEN_BY_PROVIDER: "NO_EMAIL_GIVEN_BY_PROVIDER" = "NO_EMAIL_GIVEN_BY_PROVIDER";

    constructor(
        options:
            | {
                  type: "UNKNOWN_USER_ID_ERROR";
                  message: string;
              }
            | {
                  type: "NO_EMAIL_GIVEN_BY_PROVIDER";
                  message: string;
              }
            | {
                  type: "BAD_INPUT_ERROR";
                  message: string;
              }
            | {
                  type: "GENERAL_ERROR";
                  payload: Error;
              },
        recipe: RecipeModule | undefined
    ) {
        super({
            ...options,
            recipe,
        });
    }
}
