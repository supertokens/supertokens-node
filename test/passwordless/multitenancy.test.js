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
const { printPath, setupST, startSTWithMultitenancy, stopST, killAllST, cleanST, resetAll } = require("../utils");
let SuperTokens = require("../../");
let Session = require("../../recipe/session");
let SessionRecipe = require("../../lib/build/recipe/session/recipe").default;
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let { normaliseURLPathOrThrowError } = require("../../lib/build/normalisedURLPath");
let { normaliseURLDomainOrThrowError } = require("../../lib/build/normalisedURLDomain");
let { normaliseSessionScopeOrThrowError } = require("../../lib/build/recipe/session/utils");
const { Querier } = require("../../lib/build/querier");
let Passwordless = require("../../recipe/passwordless");
let utils = require("../../lib/build/recipe/emailpassword/utils");
let { middleware, errorHandler } = require("../../framework/express");
let Multitenancy = require("../../recipe/multitenancy");

describe(`multitenancy: ${printPath("[test/passwordless/multitenancy.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("test recipe functions", async function () {
        const connectionURI = await startSTWithMultitenancy();
        SuperTokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                Passwordless.init({
                    contactMethod: "EMAIL_OR_PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                }),
            ],
        });

        await Multitenancy.createOrUpdateTenant("t1", { passwordlessEnabled: true });
        await Multitenancy.createOrUpdateTenant("t2", { passwordlessEnabled: true });
        await Multitenancy.createOrUpdateTenant("t3", { passwordlessEnabled: true });

        let code1 = await Passwordless.createCode({
            email: "test@example.com",
            tenantId: "t1",
            userInputCode: "123456",
        });
        let code2 = await Passwordless.createCode({
            email: "test@example.com",
            tenantId: "t2",
            userInputCode: "456789",
        });
        let code3 = await Passwordless.createCode({
            email: "test@example.com",
            tenantId: "t3",
            userInputCode: "789123",
        });

        let user1 = await Passwordless.consumeCode({
            preAuthSessionId: code1.preAuthSessionId,
            deviceId: code1.deviceId,
            userInputCode: "123456",
            tenantId: "t1",
        });
        let user2 = await Passwordless.consumeCode({
            preAuthSessionId: code2.preAuthSessionId,
            deviceId: code2.deviceId,
            userInputCode: "456789",
            tenantId: "t2",
        });
        let user3 = await Passwordless.consumeCode({
            preAuthSessionId: code3.preAuthSessionId,
            deviceId: code3.deviceId,
            userInputCode: "789123",
            tenantId: "t3",
        });

        assert(user1.user.id !== user2.user.id);
        assert(user1.user.id !== user3.user.id);
        assert(user2.user.id !== user3.user.id);

        assert.deepEqual(user1.user.loginMethods[0].tenantIds, ["t1"]);
        assert.deepEqual(user2.user.loginMethods[0].tenantIds, ["t2"]);
        assert.deepEqual(user3.user.loginMethods[0].tenantIds, ["t3"]);

        // get user by id
        let gUser1 = await SuperTokens.getUser(user1.user.id);
        let gUser2 = await SuperTokens.getUser(user2.user.id);
        let gUser3 = await SuperTokens.getUser(user3.user.id);

        assert.deepEqual(gUser1.toJson(), user1.user.toJson());
        assert.deepEqual(gUser2.toJson(), user2.user.toJson());
        assert.deepEqual(gUser3.toJson(), user3.user.toJson());
    });
});
