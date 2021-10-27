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
import { RecipeInterface } from "../";
import { RecipeInterface as JWTRecipeInterface } from "../../jwt/types";
import { SessionContainerInterface, VerifySessionOptions, SessionInformation } from "../types";

const EXPIRY_OFFSET_SECONDS = 30;

export default class RecipeImplementation implements RecipeInterface {
    originalImplementation: RecipeInterface;
    jwtRecipeImplementation: JWTRecipeInterface;

    constructor(originalImplementation: RecipeInterface, jwtRecipeImplementation: JWTRecipeInterface) {
        this.originalImplementation = originalImplementation;
        this.jwtRecipeImplementation = jwtRecipeImplementation;
    }

    createNewSession = async function ({
        res,
        userId,
        accessTokenPayload,
        sessionData,
    }: {
        res: any;
        userId: string;
        accessTokenPayload?: any;
        sessionData?: any;
    }): Promise<SessionContainerInterface> {
        let accessTokenValidityInSeconds = (await this.getAccessTokenLifeTimeMS()) / 1000;
        let jwtResponse = await this.jwtRecipeImplementation.createJWT({
            payload: accessTokenPayload,
            validitySeconds: accessTokenValidityInSeconds + EXPIRY_OFFSET_SECONDS,
        });

        if (jwtResponse.status === "UNSUPPORTED_ALGORITHM_ERROR") {
            // Should never come here
            throw new Error("JWT Signing algorithm not supported");
        }

        accessTokenPayload = {
            ...accessTokenPayload,
            jwt: jwtResponse.jwt,
        };

        return await this.originalImplementation.createNewSession.bind(this)({
            res,
            userId,
            accessTokenPayload,
            sessionData,
        });
    };

    getSession = async function ({
        req,
        res,
        options,
    }: {
        req: any;
        res: any;
        options?: VerifySessionOptions | undefined;
    }): Promise<SessionContainerInterface | undefined> {
        return await this.originalImplementation.getSession.bind(this)({ req, res, options });
    };

    refreshSession = async function ({ req, res }: { req: any; res: any }): Promise<SessionContainerInterface> {
        let accessTokenValidityInSeconds = (await this.getAccessTokenLifeTimeMS()) / 1000;

        // Refresh session first because this will create a new access token
        let newSession = await this.originalImplementation.refreshSession.bind(this)({ req, res });
        let accessTokenPayload = newSession.getAccessTokenPayload();

        // Remove the old jwt
        delete accessTokenPayload.jwt;

        let jwtResponse = await this.jwtRecipeImplementation.createJWT({
            payload: accessTokenPayload,
            validitySeconds: accessTokenValidityInSeconds + EXPIRY_OFFSET_SECONDS,
        });

        if (jwtResponse.status === "UNSUPPORTED_ALGORITHM_ERROR") {
            // Should never come here
            throw new Error("JWT Signing algorithm not supported");
        }

        accessTokenPayload = {
            ...accessTokenPayload,
            jwt: jwtResponse.jwt,
        };

        await newSession.updateAccessTokenPayload(accessTokenPayload);
        return newSession;
    };

    getSessionInformation = async function ({ sessionHandle }: { sessionHandle: string }): Promise<SessionInformation> {
        return await this.originalImplementation.getSessionInformation.bind(this)({ sessionHandle });
    };

    revokeAllSessionsForUser = async function ({ userId }: { userId: string }): Promise<string[]> {
        return await this.originalImplementation.revokeAllSessionsForUser.bind(this)({ userId });
    };

    getAllSessionHandlesForUser = async function ({ userId }: { userId: string }): Promise<string[]> {
        return await this.originalImplementation.getAllSessionHandlesForUser.bind(this)({ userId });
    };

    revokeSession = async function ({ sessionHandle }: { sessionHandle: string }): Promise<boolean> {
        return await this.originalImplementation.revokeSession.bind(this)({ sessionHandle });
    };

    revokeMultipleSessions = async function ({ sessionHandles }: { sessionHandles: string[] }): Promise<string[]> {
        return await this.originalImplementation.revokeMultipleSessions.bind(this)({ sessionHandles });
    };

    updateSessionData = async function ({
        sessionHandle,
        newSessionData,
    }: {
        sessionHandle: string;
        newSessionData: any;
    }): Promise<void> {
        return await this.originalImplementation.updateSessionData.bind(this)({ sessionHandle, newSessionData });
    };

    updateAccessTokenPayload = async function ({
        sessionHandle,
        newAccessTokenPayload,
    }: {
        sessionHandle: string;
        newAccessTokenPayload: any;
    }): Promise<void> {
        // Remove the JWT from the new access token payload
        delete newAccessTokenPayload.jwt;

        // Get the current sessions expiry to calculate the validity to use for the JWT
        let sessionInformation = await this.getSessionInformation({ sessionHandle });
        let sessionExpiryInMillis = sessionInformation.expiry;
        let sessionvalidityInSeconds = (sessionExpiryInMillis - Date.now()) / 1000;

        let newJWTResponse = await this.jwtRecipeImplementation.createJWT({
            payload: newAccessTokenPayload,
            validitySeconds: sessionvalidityInSeconds + EXPIRY_OFFSET_SECONDS,
        });

        if (newJWTResponse.status === "UNSUPPORTED_ALGORITHM_ERROR") {
            // Should never come here
            throw new Error("JWT Signing algorithm not supported");
        }

        newAccessTokenPayload = {
            ...newAccessTokenPayload,
            jwt: newJWTResponse.jwt,
        };

        return await this.originalImplementation.updateAccessTokenPayload.bind(this)({
            sessionHandle,
            newAccessTokenPayload,
        });
    };

    getAccessTokenLifeTimeMS = async function (): Promise<number> {
        return await this.originalImplementation.getAccessTokenLifeTimeMS.bind(this)();
    };

    getRefreshTokenLifeTimeMS = async function (): Promise<number> {
        return await this.originalImplementation.getRefreshTokenLifeTimeMS.bind(this)();
    };
}
