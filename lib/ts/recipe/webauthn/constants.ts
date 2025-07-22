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

export const REGISTER_OPTIONS_API = "/webauthn/options/register";

export const SIGNIN_OPTIONS_API = "/webauthn/options/signin";

export const SIGN_UP_API = "/webauthn/signup";

export const SIGN_IN_API = "/webauthn/signin";

export const GENERATE_RECOVER_ACCOUNT_TOKEN_API = "/user/webauthn/reset/token";

export const RECOVER_ACCOUNT_API = "/user/webauthn/reset";

export const SIGNUP_EMAIL_EXISTS_API = "/webauthn/email/exists";

export const LIST_CREDENTIALS_API = "/webauthn/credential";

export const REGISTER_CREDENTIAL_API = "/webauthn/credential";

export const REMOVE_CREDENTIAL_API = "/webauthn/credential/remove";

// 60 seconds (60 * 1000ms)
export const DEFAULT_REGISTER_OPTIONS_TIMEOUT = 60000;
export const DEFAULT_REGISTER_OPTIONS_ATTESTATION = "none";
export const DEFAULT_REGISTER_OPTIONS_RESIDENT_KEY = "required";
export const DEFAULT_REGISTER_OPTIONS_USER_VERIFICATION = "preferred";
export const DEFAULT_REGISTER_OPTIONS_USER_PRESENCE = true;
// -8 = EdDSA, -7 = ES256, -257 = RS256
export const DEFAULT_REGISTER_OPTIONS_SUPPORTED_ALGORITHM_IDS = [-8, -7, -257];

// 60 seconds (60 * 1000ms)
export const DEFAULT_SIGNIN_OPTIONS_TIMEOUT = 60000;
export const DEFAULT_SIGNIN_OPTIONS_USER_VERIFICATION = "preferred";
export const DEFAULT_SIGNIN_OPTIONS_USER_PRESENCE = true;
