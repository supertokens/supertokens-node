/* Copyright (c) 2020, VRAI Labs and/or its affiliates. All rights reserved.
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
const { printPath, setupST, startST, stopST, killAllST, cleanST, extractInfoFromResponse } = require("./utils");
let ST = require("../lib/build/session");
let STExpress = require("../index");
let assert = require("assert");
const nock = require("nock");
let { version } = require("../lib/build/version");
const express = require("express");
const request = require("supertest");
let { HandshakeInfo } = require("../lib/build/handshakeInfo");
let { ProcessState } = require("../lib/build/processState");
let { CookieConfig } = require("../lib/build/cookieAndHeaders");
let { resetAll } = require("./utils");

describe(`configTest: ${printPath("[test/config.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("various sameSite values", async function () {
        await startST();

        {
            STExpress.init({
                hosts: "http://localhost:8080",
                cookieSameSite: " Lax ",
            });

            assert(CookieConfig.getInstanceOrThrowError().cookieSameSite === "lax");

            resetAll();
        }

        {
            STExpress.init({
                hosts: "http://localhost:8080",
                cookieSameSite: "None ",
            });

            assert(CookieConfig.getInstanceOrThrowError().cookieSameSite === "none");

            resetAll();
        }

        {
            STExpress.init({
                hosts: "http://localhost:8080",
                cookieSameSite: " STRICT",
            });

            assert(CookieConfig.getInstanceOrThrowError().cookieSameSite === "strict");

            resetAll();
        }

        {
            try {
                STExpress.init({
                    hosts: "http://localhost:8080",
                    cookieSameSite: "random",
                });
            } catch (err) {
                if (
                    !ST.Error.isErrorFromAuth(err) ||
                    err.errType !== ST.Error.GENERAL_ERROR ||
                    err.err.message !== 'cookie same site must be one of "strict", "lax", or "none"'
                ) {
                    throw error;
                }
            }

            resetAll();
        }

        {
            try {
                STExpress.init({
                    hosts: "http://localhost:8080",
                    cookieSameSite: " ",
                });
            } catch (err) {
                if (
                    !ST.Error.isErrorFromAuth(err) ||
                    err.errType !== ST.Error.GENERAL_ERROR ||
                    err.err.message !== 'cookie same site must be one of "strict", "lax", or "none"'
                ) {
                    throw error;
                }
            }

            resetAll();
        }

        {
            STExpress.init({
                hosts: "http://localhost:8080",
                cookieSameSite: "lax",
            });

            assert(CookieConfig.getInstanceOrThrowError().cookieSameSite === "lax");

            resetAll();
        }

        {
            STExpress.init({
                hosts: "http://localhost:8080",
                cookieSameSite: "none",
            });

            assert(CookieConfig.getInstanceOrThrowError().cookieSameSite === "none");

            resetAll();
        }

        {
            STExpress.init({
                hosts: "http://localhost:8080",
                cookieSameSite: "strict",
            });

            assert(CookieConfig.getInstanceOrThrowError().cookieSameSite === "strict");

            resetAll();
        }

        {
            STExpress.init({
                hosts: "http://localhost:8080",
            });

            assert(CookieConfig.getInstanceOrThrowError().cookieSameSite === "lax");

            resetAll();
        }
    });
});
