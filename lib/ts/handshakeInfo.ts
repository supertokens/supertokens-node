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
    public cookieDomain: string;
    public cookieSecure: boolean;
    public accessTokenPath: string;
    public refreshTokenPath: string;
    public enableAntiCsrf: boolean;
    public accessTokenBlacklistingEnabled: boolean;
    public jwtSigningPublicKeyExpiryTime: number;
    public cookieSameSite: "none" | "lax" | "strict";
    public idRefreshTokenPath: string;

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
                response.cookieDomain,
                response.cookieSecure,
                response.accessTokenPath,
                response.refreshTokenPath,
                response.enableAntiCsrf,
                response.accessTokenBlacklistingEnabled,
                response.jwtSigningPublicKeyExpiryTime,
                response.cookieSameSite,
                response.idRefreshTokenPath
            );
        }
        return HandshakeInfo.instance;
    }

    constructor(
        jwtSigningPublicKey: string,
        cookieDomain: string,
        cookieSecure: boolean,
        accessTokenPath: string,
        refreshTokenPath: string,
        enableAntiCsrf: boolean,
        accessTokenBlacklistingEnabled: boolean,
        jwtSigningPublicKeyExpiryTime: number,
        cookieSameSite: "none" | "lax" | "strict",
        idRefreshTokenPath: string
    ) {
        this.jwtSigningPublicKey = jwtSigningPublicKey;
        this.cookieDomain = cookieDomain;
        this.cookieSecure = cookieSecure;
        this.accessTokenPath = accessTokenPath;
        this.refreshTokenPath = refreshTokenPath;
        this.enableAntiCsrf = enableAntiCsrf;
        this.accessTokenBlacklistingEnabled = accessTokenBlacklistingEnabled;
        this.jwtSigningPublicKeyExpiryTime = jwtSigningPublicKeyExpiryTime;
        this.cookieSameSite = cookieSameSite;
        this.idRefreshTokenPath = idRefreshTokenPath;
    }

    updateJwtSigningPublicKeyInfo = (newKey: string, newExpiry: number) => {
        this.jwtSigningPublicKey = newKey;
        this.jwtSigningPublicKeyExpiryTime = newExpiry;
    };
}
