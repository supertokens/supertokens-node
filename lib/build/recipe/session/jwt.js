"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseJWTWithoutSignatureVerification = parseJWTWithoutSignatureVerification;
const logger_1 = require("../../logger");
const utils_1 = require("../../utils");
const HEADERS = new Set([
    (0, utils_1.encodeBase64)(
        JSON.stringify({
            alg: "RS256",
            typ: "JWT",
            version: "1",
        })
    ),
    (0, utils_1.encodeBase64)(
        JSON.stringify({
            alg: "RS256",
            typ: "JWT",
            version: "2",
        })
    ),
]);
function parseJWTWithoutSignatureVerification(jwt) {
    const splittedInput = jwt.split(".");
    if (splittedInput.length !== 3) {
        throw new Error("Invalid JWT");
    }
    const latestVersion = 3;
    // V1&V2 is functionally identical, plus all legacy tokens should be V2 now.
    let version = 2;
    let kid = undefined;
    // V2 or older tokens did not save the key id;
    // checking header
    if (!HEADERS.has(splittedInput[0])) {
        const parsedHeader = JSON.parse((0, utils_1.decodeBase64)(splittedInput[0]));
        if (parsedHeader.version !== undefined) {
            // We have to ensure version is a string, otherwise Number.parseInt can have unexpected results
            if (typeof parsedHeader.version !== "string") {
                throw new Error("JWT header mismatch");
            }
            version = Number.parseInt(parsedHeader.version);
            (0, logger_1.logDebugMessage)("parseJWTWithoutSignatureVerification: version from header: " + version);
        } else {
            (0, logger_1.logDebugMessage)(
                "parseJWTWithoutSignatureVerification: assuming latest version (3) because version header is missing"
            );
            version = latestVersion;
        }
        kid = parsedHeader.kid;
        // Number.isInteger returns false for Number.NaN (if it fails to parse the version)
        if (parsedHeader.typ !== "JWT" || !Number.isInteger(version) || version < 3 || kid === undefined) {
            throw new Error("JWT header mismatch");
        }
    }
    return {
        version,
        kid,
        rawTokenString: jwt,
        rawPayload: splittedInput[1],
        header: splittedInput[0],
        // Ideally we would only parse this after the signature verification is done.
        // We do this at the start, since we want to check if a token can be a supertokens access token or not
        payload: JSON.parse((0, utils_1.decodeBase64)(splittedInput[1])),
        signature: splittedInput[2],
    };
}
