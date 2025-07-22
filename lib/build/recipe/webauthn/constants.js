"use strict";
/* Copyright (c) 2025, VRAI Labs and/or its affiliates. All rights reserved.
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
exports.DEFAULT_SIGNIN_OPTIONS_USER_PRESENCE =
    exports.DEFAULT_SIGNIN_OPTIONS_USER_VERIFICATION =
    exports.DEFAULT_SIGNIN_OPTIONS_TIMEOUT =
    exports.DEFAULT_REGISTER_OPTIONS_SUPPORTED_ALGORITHM_IDS =
    exports.DEFAULT_REGISTER_OPTIONS_USER_PRESENCE =
    exports.DEFAULT_REGISTER_OPTIONS_USER_VERIFICATION =
    exports.DEFAULT_REGISTER_OPTIONS_RESIDENT_KEY =
    exports.DEFAULT_REGISTER_OPTIONS_ATTESTATION =
    exports.DEFAULT_REGISTER_OPTIONS_TIMEOUT =
    exports.REMOVE_CREDENTIAL_API =
    exports.REGISTER_CREDENTIAL_API =
    exports.LIST_CREDENTIALS_API =
    exports.SIGNUP_EMAIL_EXISTS_API =
    exports.RECOVER_ACCOUNT_API =
    exports.GENERATE_RECOVER_ACCOUNT_TOKEN_API =
    exports.SIGN_IN_API =
    exports.SIGN_UP_API =
    exports.SIGNIN_OPTIONS_API =
    exports.REGISTER_OPTIONS_API =
        void 0;
exports.REGISTER_OPTIONS_API = "/webauthn/options/register";
exports.SIGNIN_OPTIONS_API = "/webauthn/options/signin";
exports.SIGN_UP_API = "/webauthn/signup";
exports.SIGN_IN_API = "/webauthn/signin";
exports.GENERATE_RECOVER_ACCOUNT_TOKEN_API = "/user/webauthn/reset/token";
exports.RECOVER_ACCOUNT_API = "/user/webauthn/reset";
exports.SIGNUP_EMAIL_EXISTS_API = "/webauthn/email/exists";
exports.LIST_CREDENTIALS_API = "/webauthn/credential/list";
exports.REGISTER_CREDENTIAL_API = "/webauthn/credential";
exports.REMOVE_CREDENTIAL_API = "/webauthn/credential/remove";
// 60 seconds (60 * 1000ms)
exports.DEFAULT_REGISTER_OPTIONS_TIMEOUT = 60000;
exports.DEFAULT_REGISTER_OPTIONS_ATTESTATION = "none";
exports.DEFAULT_REGISTER_OPTIONS_RESIDENT_KEY = "required";
exports.DEFAULT_REGISTER_OPTIONS_USER_VERIFICATION = "preferred";
exports.DEFAULT_REGISTER_OPTIONS_USER_PRESENCE = true;
// -8 = EdDSA, -7 = ES256, -257 = RS256
exports.DEFAULT_REGISTER_OPTIONS_SUPPORTED_ALGORITHM_IDS = [-8, -7, -257];
// 60 seconds (60 * 1000ms)
exports.DEFAULT_SIGNIN_OPTIONS_TIMEOUT = 60000;
exports.DEFAULT_SIGNIN_OPTIONS_USER_VERIFICATION = "preferred";
exports.DEFAULT_SIGNIN_OPTIONS_USER_PRESENCE = true;
