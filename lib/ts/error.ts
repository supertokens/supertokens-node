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

export default class SuperTokensError {
    private static errMagic = "ndskajfasndlfkj435234krjdsa";
    static GENERAL_ERROR: "GENERAL_ERROR" = "GENERAL_ERROR";
    static BAD_INPUT_ERROR: "BAD_INPUT_ERROR" = "BAD_INPUT_ERROR";

    public type: string;
    public message: string;
    public payload: any;
    public rId: string;
    private errMagic = SuperTokensError.errMagic;

    constructor(
        options:
            | {
                  rId: string;
                  message: string;
                  payload?: any;
                  type: string;
              }
            | {
                  rId: string;
                  payload: Error;
                  type: "GENERAL_ERROR";
              }
            | {
                  rId: string;
                  message: string;
                  type: "BAD_INPUT_ERROR";
                  payload: undefined;
              }
    ) {
        this.type = options.type;
        this.message = options.type === "GENERAL_ERROR" ? options.payload.message : (options as any).message;
        this.payload = options.payload;
        this.rId = options.rId;
    }

    static isErrorFromSuperTokens(obj: any): obj is SuperTokensError {
        return obj.errMagic === SuperTokensError.errMagic;
    }
}
