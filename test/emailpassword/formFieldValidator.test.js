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

let { defaultPasswordValidator, defaultEmailValidator } = require("../../lib/build/recipe/emailpassword/utils");
let assert = require("assert");
const { printPath } = require("../utils");
let { middleware, errorHandler } = require("../../framework/express");

describe(`formFieldValidator: ${printPath("[test/emailpassword/formFieldValidator.test.js]")}`, function () {
    it("checking email validator", async function () {
        assert((await defaultEmailValidator("test@supertokens.io")) === undefined);
        assert((await defaultEmailValidator("nsdafa@gmail.com")) === undefined);
        assert((await defaultEmailValidator("fewf3r_fdkj@gmaildsfa.co.uk")) === undefined);
        assert((await defaultEmailValidator("dafk.adfa@gmail.com")) === undefined);
        assert((await defaultEmailValidator("skjlblc3f3@fnldsks.co")) === undefined);
        assert((await defaultEmailValidator("sdkjfnas34@gmail.com.c")) === "Email is invalid");
        assert((await defaultEmailValidator("d@c")) === "Email is invalid");
        assert((await defaultEmailValidator("fasd")) === "Email is invalid");
        assert((await defaultEmailValidator("dfa@@@abc.com")) === "Email is invalid");
        assert((await defaultEmailValidator("")) === "Email is invalid");
    });

    it("checking password validator", async function () {
        assert((await defaultPasswordValidator("dsknfkf38H")) === undefined);
        assert((await defaultPasswordValidator("lasdkf*787~sdfskj")) === undefined);
        assert((await defaultPasswordValidator("L0493434505")) === undefined);
        assert((await defaultPasswordValidator("3453342422L")) === undefined);
        assert((await defaultPasswordValidator("1sdfsdfsdfsd")) === undefined);
        assert((await defaultPasswordValidator("dksjnlvsnl2")) === undefined);
        assert((await defaultPasswordValidator("abcgftr8")) === undefined);
        assert((await defaultPasswordValidator("abc!@#$%^&*()gftr8")) === undefined);
        assert((await defaultPasswordValidator("    dskj3")) === undefined);
        assert((await defaultPasswordValidator("    dsk  3")) === undefined);
        assert((await defaultPasswordValidator("  d3    ")) === undefined);

        assert(
            (await defaultPasswordValidator("asd")) ===
                "Password must contain at least 8 characters, including a number"
        );
        assert(
            (await defaultPasswordValidator(
                "asdfdefrg4asdfdefrg4asdfdefrg4asdfdefrg4asdfdefrg4asdfdefrg4asdfdefrg4asdfdefrg4asdfdefrg4asdfdefrg4"
            )) === "Password's length must be lesser than 100 characters"
        );
        assert((await defaultPasswordValidator("ascdvsdfvsIUOO")) === "Password must contain at least one number");
        assert((await defaultPasswordValidator("234235234523")) === "Password must contain at least one alphabet");
    });
});
