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
import * as assert from "assert";

import { RecipeInterface as OpenIdRecipeInterface } from "../../openid/types";
import { SessionContainerInterface } from "../types";
import { ACCESS_TOKEN_PAYLOAD_JWT_PROPERTY_NAME_KEY } from "./constants";
import { addJWTToAccessTokenPayload } from "./utils";

export default class SessionClassWithJWT implements SessionContainerInterface {
    private openIdRecipeImplementation: OpenIdRecipeInterface;
    private originalSessionClass: SessionContainerInterface;

    constructor(originalSessionClass: SessionContainerInterface, openIdRecipeImplementation: OpenIdRecipeInterface) {
        this.openIdRecipeImplementation = openIdRecipeImplementation;
        this.originalSessionClass = originalSessionClass;
    }
    revokeSession = (userContext?: any): Promise<void> => {
        return this.originalSessionClass.revokeSession(userContext);
    };
    getSessionData = (userContext?: any): Promise<any> => {
        return this.originalSessionClass.getSessionData(userContext);
    };
    updateSessionData = (newSessionData: any, userContext?: any): Promise<any> => {
        return this.originalSessionClass.updateSessionData(newSessionData, userContext);
    };
    getUserId = (userContext?: any): string => {
        return this.originalSessionClass.getUserId(userContext);
    };
    getAccessTokenPayload = (userContext?: any) => {
        return this.originalSessionClass.getAccessTokenPayload(userContext);
    };
    getHandle = (userContext?: any): string => {
        return this.originalSessionClass.getHandle(userContext);
    };
    getAccessToken = (userContext?: any): string => {
        return this.originalSessionClass.getAccessToken(userContext);
    };
    getTimeCreated = (userContext?: any): Promise<number> => {
        return this.originalSessionClass.getTimeCreated(userContext);
    };
    getExpiry = (userContext?: any): Promise<number> => {
        return this.originalSessionClass.getExpiry(userContext);
    };

    updateAccessTokenPayload = async (newAccessTokenPayload: any, userContext?: any): Promise<void> => {
        newAccessTokenPayload =
            newAccessTokenPayload === null || newAccessTokenPayload === undefined ? {} : newAccessTokenPayload;
        let accessTokenPayload = this.getAccessTokenPayload(userContext);
        let jwtPropertyName = accessTokenPayload[ACCESS_TOKEN_PAYLOAD_JWT_PROPERTY_NAME_KEY];

        if (jwtPropertyName === undefined) {
            return this.originalSessionClass.updateAccessTokenPayload(newAccessTokenPayload, userContext);
        }

        let existingJWT = accessTokenPayload[jwtPropertyName];
        assert.notStrictEqual(existingJWT, undefined);

        let currentTimeInSeconds = Date.now() / 1000;
        let decodedPayload = JsonWebToken.decode(existingJWT, { json: true });

        // JsonWebToken.decode possibly returns null
        if (decodedPayload === null) {
            throw new Error("Error reading JWT from session");
        }

        let jwtExpiry = decodedPayload.exp - currentTimeInSeconds;

        if (jwtExpiry <= 0) {
            // it can come here if someone calls this function well after
            // the access token and the jwt payload have expired (which can happen if an API takes a VERY long time). In this case, we still want the jwt payload to update, but the resulting JWT should
            // not be alive for too long (since it's expired already). So we set it to
            // 1 second lifetime.
            jwtExpiry = 1;
        }

        newAccessTokenPayload = await addJWTToAccessTokenPayload({
            accessTokenPayload: newAccessTokenPayload,
            jwtExpiry,
            userId: this.getUserId(),
            jwtPropertyName,
            openIdRecipeImplementation: this.openIdRecipeImplementation,
            userContext,
        });

        return await this.originalSessionClass.updateAccessTokenPayload(newAccessTokenPayload, userContext);
    };
}
