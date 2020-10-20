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
import { AuthError, generateError } from "./error";
import { Querier } from "./querier";

export class HandshakeInfo {
    static instance: HandshakeInfo | undefined;

    public jwtSigningPublicKey: string;
    public enableAntiCsrf: boolean;
    public accessTokenBlacklistingEnabled: boolean;
    public jwtSigningPublicKeyExpiryTime: number;
    public accessTokenVaildity: number;
    public refreshTokenVaildity: number;

    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw generateError(AuthError.GENERAL_ERROR, new Error("calling testing function in non testing env"));
        }
        HandshakeInfo.instance = undefined;
    }

    // @throws GENERAL_ERROR
    static async getInstance(): Promise<HandshakeInfo> {
        if (HandshakeInfo.instance == undefined) {
            let response = await Querier.getInstance().sendPostRequest("/handshake", {});
            HandshakeInfo.instance = new HandshakeInfo(
                response.jwtSigningPublicKey,
                response.enableAntiCsrf,
                response.accessTokenBlacklistingEnabled,
                response.jwtSigningPublicKeyExpiryTime,
                response.accessTokenVaildity,
                response.refreshTokenVaildity
            );
        }
        return HandshakeInfo.instance;
    }

    constructor(
        jwtSigningPublicKey: string,
        enableAntiCsrf: boolean,
        accessTokenBlacklistingEnabled: boolean,
        jwtSigningPublicKeyExpiryTime: number,
        accessTokenVaildity: number,
        refreshTokenVaildity: number
    ) {
        this.jwtSigningPublicKey = jwtSigningPublicKey;
        this.enableAntiCsrf = enableAntiCsrf;
        this.accessTokenBlacklistingEnabled = accessTokenBlacklistingEnabled;
        this.jwtSigningPublicKeyExpiryTime = jwtSigningPublicKeyExpiryTime;
        this.accessTokenVaildity = accessTokenVaildity;
        this.refreshTokenVaildity = refreshTokenVaildity;
    }

    updateJwtSigningPublicKeyInfo = (newKey: string, newExpiry: number) => {
        this.jwtSigningPublicKey = newKey;
        this.jwtSigningPublicKeyExpiryTime = newExpiry;
    };
}
