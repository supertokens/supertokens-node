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
import * as JsonWebToken from "jsonwebtoken";
import { NormalisedAppinfo } from "../../../types";

import { RecipeInterface as JWTRecipeInterface } from "../../jwt/types";
import { SessionContainerInterface } from "../types";
import { ACCESS_TOKEN_PAYLOAD_JWT_PROPERTY_NAME_KEY, JWT_RESERVED_KEY_USE_ERROR_MESSAGE } from "./constants";

export default class SessionClassWithJWT implements SessionContainerInterface {
    private jwtRecipeImplementation: JWTRecipeInterface;
    private originalSessionClass: SessionContainerInterface;
    private appInfo: NormalisedAppinfo;

    constructor(
        originalSessionClass: SessionContainerInterface,
        jwtRecipeImplementation: JWTRecipeInterface,
        appInfo: NormalisedAppinfo
    ) {
        this.jwtRecipeImplementation = jwtRecipeImplementation;
        this.originalSessionClass = originalSessionClass;
        this.appInfo = appInfo;
    }
    revokeSession = (): Promise<void> => {
        return this.originalSessionClass.revokeSession();
    };
    getSessionData = (): Promise<any> => {
        return this.originalSessionClass.getSessionData();
    };
    updateSessionData = (newSessionData: any): Promise<any> => {
        return this.originalSessionClass.updateSessionData(newSessionData);
    };
    getUserId = (): string => {
        return this.originalSessionClass.getUserId();
    };
    getAccessTokenPayload = () => {
        return this.originalSessionClass.getAccessTokenPayload();
    };
    getHandle = (): string => {
        return this.originalSessionClass.getHandle();
    };
    getAccessToken = (): string => {
        return this.originalSessionClass.getAccessToken();
    };
    getTimeCreated = (): Promise<number> => {
        return this.originalSessionClass.getTimeCreated();
    };
    getExpiry = (): Promise<number> => {
        return this.originalSessionClass.getExpiry();
    };

    updateAccessTokenPayload = async (newAccessTokenPayload: any): Promise<void> => {
        // Refer to comments in session/with-jwt/recipeImplementation - createNewSession, for a brief note on retriving the JWT
        if (newAccessTokenPayload[ACCESS_TOKEN_PAYLOAD_JWT_PROPERTY_NAME_KEY] !== undefined) {
            throw new Error(JWT_RESERVED_KEY_USE_ERROR_MESSAGE);
        }

        let accessTokenPayload = this.getAccessTokenPayload();
        let jwtPropertyName = accessTokenPayload[ACCESS_TOKEN_PAYLOAD_JWT_PROPERTY_NAME_KEY];

        if (jwtPropertyName === undefined || accessTokenPayload[jwtPropertyName] === undefined) {
            return this.originalSessionClass.updateAccessTokenPayload(newAccessTokenPayload);
        }

        let existingJWT = accessTokenPayload[jwtPropertyName];

        let currentTimeInSeconds = Date.now() / 1000;
        let decodedPayload = JsonWebToken.decode(existingJWT, { json: true });

        // JsonWebToken.decode possibly returns null
        if (decodedPayload === null) {
            throw new Error("Error reading JWT from session");
        }

        let existingJWTValidity = decodedPayload.exp - currentTimeInSeconds;

        newAccessTokenPayload = {
            sub: this.getUserId(),
            iss: this.appInfo.apiDomain.getAsStringDangerous(),
            ...newAccessTokenPayload,
        };

        let newJWTResponse = await this.jwtRecipeImplementation.createJWT({
            payload: newAccessTokenPayload,
            validitySeconds: existingJWTValidity,
        });

        if (newJWTResponse.status === "UNSUPPORTED_ALGORITHM_ERROR") {
            // Should never come here
            throw new Error("JWT Signing algorithm not supported");
        }

        newAccessTokenPayload = {
            ...newAccessTokenPayload,
            [jwtPropertyName]: newJWTResponse.jwt,
            [ACCESS_TOKEN_PAYLOAD_JWT_PROPERTY_NAME_KEY]: jwtPropertyName,
        };

        return await this.originalSessionClass.updateAccessTokenPayload(newAccessTokenPayload);
    };
}
