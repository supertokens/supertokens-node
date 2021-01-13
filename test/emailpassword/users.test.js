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
const { printPath, setupST, startST, stopST, killAllST, cleanST, resetAll } = require("../utils");

/*
TODO:
- getUsersOldestFirst(), 
   - test with different input params, and make sure the results are obtained in ASC order
- getUsersNewestFirst(), 
   - test with different input params, and make sure the results are obtained in DESC order
- getUserCount():
   - call this function with no user in db and verify it returns 0
   - add few users in db and verify that the count returned equals to the no. of users added
*/
describe(`usersTest: ${printPath("[test/emailpassword/users.test.js]")}`, function () {
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
