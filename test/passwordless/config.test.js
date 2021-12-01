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
const { printPath, setupST, startST, killAllST, cleanST, setKeyValueInConfig } = require("../utils");
let STExpress = require("../../");
let Session = require("../../recipe/session");
let Passwordless = require("../../recipe/passwordless");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let SuperTokens = require("../../lib/build/supertokens").default;

/*
TODO: We actually want to test all possible config inputs and make sure they work as expected

- contactMethod: PHONE
    - minimal input works
    - if passed validatePhoneNumber, it gets called when the createCode API is called
        - If you return undefined from the function, the API works.
        - If you return a string from the function, the API throws a GENERIC ERROR
    - if passed createAndSendCustomTextMessage, it gets called with the right inputs:
        - flowType: USER_INPUT_CODE -> userInputCode !== undefined && urlWithLinkCode == undefined
        - flowType: MAGIC_LINK -> userInputCode === undefined && urlWithLinkCode !== undefined
        - flowType: USER_INPUT_CODE_AND_MAGIC_LINK -> userInputCode !== undefined && urlWithLinkCode !== undefined
        - if you throw an error from this function, that is ignored by the API
        - check all other inputs to this function are as expected
- contactMethod: EMAIL
    - minimal input works
    - if passed validateEmailAddress, it gets called when the createCode API is called
        - If you return undefined from the function, the API works.
        - If you return a string from the function, the API throws a GENERIC ERROR
    - if passed createAndSendCustomEmail, it gets called with the right inputs:
        - flowType: USER_INPUT_CODE -> userInputCode !== undefined && urlWithLinkCode == undefined
        - flowType: MAGIC_LINK -> userInputCode === undefined && urlWithLinkCode !== undefined
        - flowType: USER_INPUT_CODE_AND_MAGIC_LINK -> userInputCode !== undefined && urlWithLinkCode !== undefined
        - if you throw an error from this function, that is ignored by the API
        - check all other inputs to this function are as expected
- Missing compulsory configs throws as error:
    - flowType is necessary, contactMethod is necessary
- Passing getLinkDomainAndPath should call that, and the resulting magic link (from API call and from Passwordless.createMagicLink function call) should use the custom link returned from the function
- Passing getCustomUserInputCode:
    - Check that it is called when the createCode and resendCode APIs are called
        - Check that the result returned from this are actually what the user input code is
    - Check that is you return the same code everytime from this function and call resendCode API, you get USER_INPUT_CODE_ALREADY_USED_ERROR output from the API
- Check basic override usage
*/

describe(`apisFunctinos: ${printPath("[test/passwordless/apis.test.js]")}`, function () {
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
