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
import { TypeAuthError } from "./types";

const ERROR_MAGIC = "ndskajfasndlfkj435234krjdsa";

export function generateError(errType: number, err: any): any {
    if (AuthError.isErrorFromAuth(err)) {
        return err;
    }
    return {
        errMagic: ERROR_MAGIC,
        errType,
        err
    };
}

export class AuthError {
    static GENERAL_ERROR = 1000;
    static UNAUTHORISED = 2000;
    static TRY_REFRESH_TOKEN = 3000;
    static TOKEN_THEFT_DETECTED = 4000;

    static isErrorFromAuth = (err: any): err is TypeAuthError => {
        return err.errMagic === ERROR_MAGIC;
    };
}
