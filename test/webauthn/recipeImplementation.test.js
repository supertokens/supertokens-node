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
const { printPath, setupST, startST, killAllST, cleanST, stopST } = require("../utils");
let assert = require("assert");

const request = require("supertest");
const express = require("express");

let STExpress = require("../..");
let Session = require("../../recipe/session");
let WebAuthn = require("../../recipe/webauthn");
let { ProcessState } = require("../../lib/build/processState");
let SuperTokens = require("../../lib/build/supertokens").default;
let { middleware, errorHandler } = require("../../framework/express");
let { isCDIVersionCompatible } = require("../utils");
const { readFile } = require("fs/promises");
const nock = require("nock");

require("./wasm_exec");

describe(`recipeImplementationFunctions: ${printPath("[test/webauthn/recipeImplementation.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("[getGeneratedOptions]", function () {
        it("test it returns all the required fields", async function () {
            const connectionURI = await startST();

            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [WebAuthn.init()],
            });

            // run test if current CDI version >= 2.11
            // todo update this to crrect version
            if (!(await isCDIVersionCompatible("2.11"))) return;

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            // passing valid field
            let registerOptionsResponse = await new Promise((resolve, reject) =>
                request(app)
                    .post("/auth/webauthn/options/register")
                    .send({
                        email: "test@example.com",
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            console.log(err);
                            reject(err);
                        } else {
                            resolve(JSON.parse(res.text));
                        }
                    })
            );

            console.log("test registerOptions with default values", registerOptionsResponse);

            assert(registerOptionsResponse.status === "OK");

            const generatedOptions = await SuperTokens.getInstanceOrThrowError().recipeModules[0].recipeInterfaceImpl.getGeneratedOptions(
                {
                    webauthnGeneratedOptionsId: registerOptionsResponse.webauthnGeneratedOptionsId,
                    userContext: {},
                }
            );
            console.log("generatedOptions", generatedOptions);

            assert(generatedOptions.status === "OK");

            assert(generatedOptions.origin === "https://supertokens.io");
            assert(generatedOptions.email === "test@example.com");
            assert(generatedOptions.relyingPartyId === "api.supertokens.io");
            assert(generatedOptions.relyingPartyName === "SuperTokens");
            assert(typeof generatedOptions.webauthnGeneratedOptionsId === "string");
            assert(typeof generatedOptions.challenge === "string");
            assert(typeof generatedOptions.createdAt === "number");
            assert(typeof generatedOptions.expiresAt === "number");
            assert(typeof generatedOptions.timeout === "number");
        });
    });
});

const log = ({ ...args }) => {
    Object.keys(args).forEach((key) => {
        console.log();
        console.log("------------------------------------------------");
        console.log(`${key}`);
        console.log("------------------------------------------------");
        console.log(JSON.stringify(args[key], null, 2));
        console.log("================================================");
        console.log();
    });
};
