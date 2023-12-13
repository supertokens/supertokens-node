const { printPath, setupST, startSTWithMultitenancy, killAllST, cleanST } = require("../utils");
let assert = require("assert");
const express = require("express");
let { ProcessState } = require("../../lib/build/processState");
let SuperTokens = require("../../");
let { middleware, errorHandler } = require("../../framework/express");
let MultiFactorAuth = require("../../lib/build/recipe/multifactorauth");
let MultiFactorAuthRecipe = require("../../lib/build/recipe/multifactorauth/recipe").default;
let UserMetadata = require("../../lib/build/recipe/usermetadata");
let Session = require("../../lib/build/recipe/session");
let Totp = require("../../lib/build/recipe/totp");
let EmailPassword = require("../../lib/build/recipe/emailpassword");
let Passwordless = require("../../lib/build/recipe/passwordless");
let ThirdParty = require("../../lib/build/recipe/thirdparty");
let Multitenancy = require("../../lib/build/recipe/multitenancy");
let AccountLinking = require("../../lib/build/recipe/accountlinking");
const OTPAuth = require("otpauth");

describe(`mfa-api: ${printPath("[test/mfa/mfa.api.test.js]")}`, function () {
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
