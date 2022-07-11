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
const { printPath } = require("./utils");
const { humaniseMilliseconds } = require("../lib/build/utils");
const assert = require("assert");

describe(`Humanise: ${printPath("[test/humanise.test.js]")}`, function () {
    it("test humanise milliseconds", function () {
        assert("1 second" === humaniseMilliseconds(1000));
        assert("59 seconds" === humaniseMilliseconds(59000));
        assert("1 minute" === humaniseMilliseconds(60000));
        assert("1 minute" === humaniseMilliseconds(119000));
        assert("2 minutes" === humaniseMilliseconds(120000));
        assert("1 hour" === humaniseMilliseconds(3600000));
        assert("1 hour" === humaniseMilliseconds(3660000));
        assert("1.1 hours" === humaniseMilliseconds(3960000));
        assert("2 hours" === humaniseMilliseconds(7260000));
        assert("5 hours" === humaniseMilliseconds(18000000));
    });
});
