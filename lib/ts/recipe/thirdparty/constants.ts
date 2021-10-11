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

export const AUTHORISATION_API = "/authorisationurl";

export const SIGN_IN_UP_API = "/signinup";

// If Third Party login is used with one of the following development keys, then the dev authorization url and the redirect url will be used.
// When adding additional client ids make sure that the google client id is set first for test purposes.
export const DEV_OAUTH_CLIENT_IDS = [
    "585279403523-7mubfl1r7i0fbvj9l0sahbh2g35o1i0s.apps.googleusercontent.com",
    "41ee9a6ccad6d6f47303",
    "553394762651618",
];

export const DEV_OAUTH_AUTHORIZATION_URL = "https://supertokens.io/dev/oauth/redirect-to-provider";
export const DEV_OAUTH_REDIRECT_URL = "https://supertokens.io/dev/oauth/redirect-to-app";
