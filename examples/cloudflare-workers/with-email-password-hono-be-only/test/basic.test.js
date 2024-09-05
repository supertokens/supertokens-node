/* Copyright (c) 2024, VRAI Labs and/or its affiliates. All rights reserved.
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

/*
 * Imports
 */

const assert = require("assert");

// Run the tests in a DOM environment.
require("jsdom-global")();

const APP_URL = process.env.APP_URL || "http://localhost:8787";

describe("Auth API Tests", () => {
    const signupBody = {
        formFields: [
            {
                id: "email",
                value: "test@test.com",
            },
            {
                id: "password",
                value: "testpw1234",
            },
        ],
    };

    it("should sign up successfully and return status 200 with OK status", async () => {
        const response = await fetch(`${APP_URL}/auth/signup`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(signupBody),
        });

        const data = await response.json();

        assert.strictEqual(response.status, 200, "Expected status code to be 200");
        assert.strictEqual(data.status, "FIELD_ERROR", "Expected status to be FIELD_ERROR");
        assert.strictEqual(data.formFields.length, 1, "Expected formFields length to be 1");
    });

    it("should sign in successfully and return status 200 with OK status", async () => {
        const response = await fetch(`${APP_URL}/auth/signin`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(signupBody),
        });

        const data = await response.json();

        assert.strictEqual(response.status, 200, "Expected status code to be 200");
        assert.strictEqual(data.status, "OK", "Expected status to be OK");

        // Assert that session is working by getting the sessioninfo
        const accessToken = response.headers.get("St-Access-Token");
        assert(accessToken, "Expected access token to be present in headers");

        // Use the access token to get session info
        const sessionResponse = await fetch(`${APP_URL}/sessioninfo`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
        });

        const sessionData = await sessionResponse.json();

        // Check that session info is retrieved successfully
        assert.strictEqual(sessionResponse.status, 200, "Expected session info status code to be 200");
        assert(sessionData, "Expected session data to be present");
    });
});
