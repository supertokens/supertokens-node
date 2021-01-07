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

const { printPath, setupST, startST, stopST, killAllST, cleanST, resetAll, signUPRequest } = require("../utils");
let STExpress = require("../..");
let Session = require("../../recipe/session");
let SessionRecipe = require("../../lib/build/recipe/session/sessionRecipe").default;
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let { normaliseURLPathOrThrowError } = require("../../lib/build/normalisedURLPath");
let { normaliseURLDomainOrThrowError } = require("../../lib/build/normalisedURLDomain");
let { normaliseSessionScopeOrThrowError } = require("../../lib/build/recipe/session/utils");
const { Querier } = require("../../lib/build/querier");
let EmailPassword = require("../../recipe/emailpassword");
let EmailPasswordRecipe = require("../../lib/build/recipe/emailpassword/recipe").default;
let generatePasswordResetToken = require("../../lib/build/recipe/emailpassword/api/generatePasswordResetToken").default;
let passwordReset = require("../../lib/build/recipe/emailpassword/api/passwordReset").default;
const express = require("express");
const request = require("supertest");

/**
 * TODO: (later) in emailVerificationFunctions.ts:
 *        - (later) check that getEmailVerificationURL works fine
 *        - (later) check that createAndSendCustomEmail works fine
 * TODO: generate token API:
 *        - Call the API with valid input, email not verified
 *        - Call the API with valid input, email verified and test error
 *        - Call the API with no session and see the output (should be 401)
 *        - Call the API with an expired access token and see that try refresh token is returned
 *        - Provide your own email callback and make sure that is called
 * TODO: email verify API:
 *        POST:
 *          - Call the API with valid input
 *          - Call the API with an invalid token and see the error
 *          - token is not of type string from input
 *        GET:
 *          - Call the API with valid input
 *          - Call the API with no session and see the error
 *          - Call the API with an expired access token and see that try refresh token is returned
 */

describe(`emailverify: ${printPath("[test/emailpassword/emailverify.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });
});
