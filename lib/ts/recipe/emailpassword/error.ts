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

import STError from "../../error";

export default class SessionError extends STError {
    static EMAIL_ALREADY_EXISTS_ERROR: "EMAIL_ALREADY_EXISTS_ERROR" = "EMAIL_ALREADY_EXISTS_ERROR";
    static GENERAL_ERROR: "GENERAL_ERROR" = "GENERAL_ERROR";
    static BAD_INPUT_ERROR: "BAD_INPUT_ERROR" = "BAD_INPUT_ERROR";

    constructor(
        options:
            | {
                  type: "EMAIL_ALREADY_EXISTS_ERROR";
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
        recipeId: string
    ) {
        super({
            ...options,
            rId: recipeId,
        });
    }
}
