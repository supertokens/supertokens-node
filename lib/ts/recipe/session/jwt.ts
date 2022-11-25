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
import * as crypto from "crypto";

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

export type ParsedJWTInfo = {
    rawTokenString: string;
    header: string;
    payload: any;
    signature: string;
};

export function parseJWTWithoutSignatureVerification(jwt: string): ParsedJWTInfo {
    const splittedInput = jwt.split(".");
    if (splittedInput.length !== 3) {
        throw new Error("Invalid JWT");
    }

    // checking header
    if (!HEADERS.has(splittedInput[0])) {
        throw new Error("JWT header mismatch");
    }

    return {
        rawTokenString: jwt,
        header: splittedInput[0],
        // Ideally we would only parse this after the signature verification is done.
        // We do this at the start, since we want to check if a token can be a supertokens access token or not
        payload: JSON.parse(Buffer.from(splittedInput[1], "base64").toString()),
        signature: splittedInput[2],
    };
}

export function verifyJWT(
    { header, payload, signature }: ParsedJWTInfo,
    jwtSigningPublicKey: string
): { [key: string]: any } {
    let verifier = crypto.createVerify("sha256");
    // convert the jwtSigningPublicKey into .pem format

    verifier.update(header + "." + payload);
    if (
        !verifier.verify(
            "-----BEGIN PUBLIC KEY-----\n" + jwtSigningPublicKey + "\n-----END PUBLIC KEY-----",
            signature,
            "base64"
        )
    ) {
        throw new Error("JWT verification failed");
    }

    return JSON.parse(payload);
}
