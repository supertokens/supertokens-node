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
let assert = require("assert");

const implementations = {
    emailpassword: require("../lib/build/recipe/emailpassword/emaildelivery/services/smtp/serviceImplementation"),
    emailverification: require("../lib/build/recipe/emailverification/emaildelivery/services/smtp/serviceImplementation"),
    passwordless: require("../lib/build/recipe/passwordless/emaildelivery/services/smtp/serviceImplementation"),
    webauthn: require("../lib/build/recipe/webauthn/emaildelivery/services/smtp/serviceImplementation"),
};

describe(`SMTP email delivery: ${printPath("[test/smtp.test.js]")}`, function () {
    for (const [recipe, { getServiceImplementation }] of Object.entries(implementations)) {
        describe(recipe, function () {
            let sent;
            let impl;

            beforeEach(function () {
                sent = [];
                const transporter = {
                    sendMail: async (mail) => {
                        sent.push(mail);
                    },
                };
                impl = getServiceImplementation(transporter, { name: "App", email: "app@example.com" });
            });

            const base = { toEmail: "user@example.com", subject: "Hello", userContext: {} };

            it("sends only html when no plain text body is given", async function () {
                await impl.sendRawEmail({ ...base, body: "<p>hi</p>", isHtml: true });
                assert.strictEqual(sent.length, 1);
                assert.strictEqual(sent[0].html, "<p>hi</p>");
                assert.strictEqual(sent[0].text, undefined);
            });

            it("sends both html and text when a plain text body is given", async function () {
                await impl.sendRawEmail({ ...base, body: "<p>hi</p>", isHtml: true, plainTextBody: "hi" });
                assert.strictEqual(sent.length, 1);
                assert.strictEqual(sent[0].html, "<p>hi</p>");
                assert.strictEqual(sent[0].text, "hi");
            });

            it("sends only text when the body is not html", async function () {
                await impl.sendRawEmail({ ...base, body: "hi", isHtml: false, plainTextBody: "ignored" });
                assert.strictEqual(sent.length, 1);
                assert.strictEqual(sent[0].text, "hi");
                assert.strictEqual(sent[0].html, undefined);
            });
        });
    }
});
