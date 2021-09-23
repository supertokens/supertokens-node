"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
const crypto = require("crypto");
const HEADERS = new Set([
    Buffer.from(
        JSON.stringify({
            alg: "RS256",
            typ: "JWT",
            version: "1",
        })
    ).toString("base64"),
    Buffer.from(
        JSON.stringify({
            alg: "RS256",
            typ: "JWT",
            version: "2",
        })
    ).toString("base64"),
]);
function verifyJWTAndGetPayload(jwt, jwtSigningPublicKey) {
    const splittedInput = jwt.split(".");
    if (splittedInput.length !== 3) {
        throw new Error("Invalid JWT");
    }
    // checking header
    if (!HEADERS.has(splittedInput[0])) {
        throw new Error("JWT header mismatch");
    }
    let payload = splittedInput[1];
    let verifier = crypto.createVerify("sha256");
    // convert the jwtSigningPublicKey into .pem format
    verifier.update(splittedInput[0] + "." + payload);
    if (
        !verifier.verify(
            "-----BEGIN PUBLIC KEY-----\n" + jwtSigningPublicKey + "\n-----END PUBLIC KEY-----",
            splittedInput[2],
            "base64"
        )
    ) {
        throw new Error("JWT verification failed");
    }
    // sending payload
    payload = Buffer.from(payload, "base64").toString();
    return JSON.parse(payload);
}
exports.verifyJWTAndGetPayload = verifyJWTAndGetPayload;
function getPayloadWithoutVerifiying(jwt) {
    const splittedInput = jwt.split(".");
    if (splittedInput.length !== 3) {
        throw new Error("Invalid JWT");
    }
    let payload = splittedInput[1];
    payload = Buffer.from(payload, "base64").toString();
    return JSON.parse(payload);
}
exports.getPayloadWithoutVerifiying = getPayloadWithoutVerifiying;
