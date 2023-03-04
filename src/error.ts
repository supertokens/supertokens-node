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

export default class SuperTokensError extends Error {
    private static errMagic = "ndskajfasndlfkj435234krjdsa";
    static BAD_INPUT_ERROR: "BAD_INPUT_ERROR" = "BAD_INPUT_ERROR";

    public type: string;
    public payload: any;

    // this variable is used to identify which
    // recipe initiated this error. If no recipe
    // initiated it, it will be undefined, else it
    // will be the "actual" rid of that recipe. By actual,
    // I mean that it will not be influenced by the
    // parent's RID.
    public fromRecipe: string | undefined;
    // @ts-ignore
    private errMagic: string;

    constructor(
        options:
            | {
                  message: string;
                  payload?: any;
                  type: string;
              }
            | {
                  message: string;
                  type: "BAD_INPUT_ERROR";
                  payload: undefined;
              }
    ) {
        super(options.message);
        this.type = options.type;
        this.payload = options.payload;
        this.errMagic = SuperTokensError.errMagic;
    }

    static isErrorFromSuperTokens(obj: any): obj is SuperTokensError {
        return obj.errMagic === SuperTokensError.errMagic;
    }
}
