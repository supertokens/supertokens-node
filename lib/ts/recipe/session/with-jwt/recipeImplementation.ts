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

    createNewSession = async ({
        res,
        userId,
        accessTokenPayload,
        sessionData,
    }: {
        res: any;
        userId: string;
        accessTokenPayload?: any;
        sessionData?: any;
    }): Promise<SessionContainerInterface> => {
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

        return await this.originalImplementation.createNewSession({
            res,
            userId,
            accessTokenPayload,
            sessionData,
        });
    };

    getSession = async ({
        req,
        res,
        options,
    }: {
        req: any;
        res: any;
        options?: VerifySessionOptions | undefined;
    }): Promise<SessionContainerInterface | undefined> => {
        return await this.originalImplementation.getSession({ req, res, options });
    };

    refreshSession = async ({ req, res }: { req: any; res: any }): Promise<SessionContainerInterface> => {
        let accessTokenValidityInSeconds = (await this.getAccessTokenLifeTimeMS()) / 1000;

        // Refresh session first because this will create a new access token
        let newSession = await this.originalImplementation.refreshSession({ req, res });
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

    getSessionInformation = async ({ sessionHandle }: { sessionHandle: string }): Promise<SessionInformation> => {
        return await this.originalImplementation.getSessionInformation({ sessionHandle });
    };

    revokeAllSessionsForUser = async ({ userId }: { userId: string }): Promise<string[]> => {
        return await this.originalImplementation.revokeAllSessionsForUser({ userId });
    };

    getAllSessionHandlesForUser = async ({ userId }: { userId: string }): Promise<string[]> => {
        return await this.originalImplementation.getAllSessionHandlesForUser({ userId });
    };

    revokeSession = async ({ sessionHandle }: { sessionHandle: string }): Promise<boolean> => {
        return await this.originalImplementation.revokeSession({ sessionHandle });
    };

    revokeMultipleSessions = async ({ sessionHandles }: { sessionHandles: string[] }): Promise<string[]> => {
        return await this.originalImplementation.revokeMultipleSessions({ sessionHandles });
    };

    updateSessionData = async ({
        sessionHandle,
        newSessionData,
    }: {
        sessionHandle: string;
        newSessionData: any;
    }): Promise<void> => {
        return await this.originalImplementation.updateSessionData({ sessionHandle, newSessionData });
    };

    updateAccessTokenPayload = async ({
        sessionHandle,
        newAccessTokenPayload,
    }: {
        sessionHandle: string;
        newAccessTokenPayload: any;
    }): Promise<void> => {
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

        return await this.originalImplementation.updateAccessTokenPayload({ sessionHandle, newAccessTokenPayload });
    };

    getAccessTokenLifeTimeMS = async (): Promise<number> => {
        return await this.originalImplementation.getAccessTokenLifeTimeMS();
    };

    getRefreshTokenLifeTimeMS = async (): Promise<number> => {
        return await this.originalImplementation.getRefreshTokenLifeTimeMS();
    };
}
