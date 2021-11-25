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

import { RecipeInterface } from "../";
import { NormalisedAppinfo } from "../../../types";
import { RecipeInterface as JWTRecipeInterface } from "../../jwt/types";
import { SessionContainerInterface, TypeNormalisedInput, VerifySessionOptions } from "../types";
import { ACCESS_TOKEN_PAYLOAD_JWT_PROPERTY_NAME_KEY } from "./constants";
import SessionClassWithJWT from "./sessionClass";
import * as assert from "assert";

export default function (
    originalImplementation: RecipeInterface,
    jwtRecipeImplementation: JWTRecipeInterface,
    config: TypeNormalisedInput,
    appInfo: NormalisedAppinfo
): RecipeInterface {
    // Time difference between JWT expiry and access token expiry (JWT expiry = access token expiry + EXPIRY_OFFSET_SECONDS)
    const EXPIRY_OFFSET_SECONDS = 30;

    function getJWTExpiry(accessTokenExpiry: number): number {
        return accessTokenExpiry + EXPIRY_OFFSET_SECONDS;
    }

    async function modifyAccessTokenPayload({
        accessTokenPayload,
        jwtExpiry,
        userId,
        jwtPropertyName,
    }: {
        accessTokenPayload: any;
        jwtExpiry: number;
        userId: string;
        jwtPropertyName: string;
    }): Promise<any> {
        // If jwtPropertyName is not undefined it means that the JWT was added to the access token payload already
        let existingJwtPropertyName = accessTokenPayload[ACCESS_TOKEN_PAYLOAD_JWT_PROPERTY_NAME_KEY];

        if (existingJwtPropertyName !== undefined) {
            // Delete the old JWT and the old property name
            delete accessTokenPayload[existingJwtPropertyName];
            delete accessTokenPayload[ACCESS_TOKEN_PAYLOAD_JWT_PROPERTY_NAME_KEY];
        }

        // Update the access token payload with the default claims to add
        accessTokenPayload = {
            /* 
                We add our claims before the user provided ones so that if they use the same claims
                then the final payload will use the values they provide
            */
            sub: userId,
            iss: appInfo.apiDomain.getAsStringDangerous(),
            ...accessTokenPayload,
        };

        // Create the JWT
        let jwtResponse = await jwtRecipeImplementation.createJWT({
            payload: accessTokenPayload,
            validitySeconds: jwtExpiry,
        });

        if (jwtResponse.status === "UNSUPPORTED_ALGORITHM_ERROR") {
            // Should never come here
            throw new Error("JWT Signing algorithm not supported");
        }

        // Add the jwt and the property name to the access token payload
        accessTokenPayload = {
            ...accessTokenPayload,
            /*
                We add the JWT after the user defined keys because we want to make sure that it never
                gets overwritten by a user defined key. Using the same key as the one configured (or defaulting)
                for the JWT should be considered a dev error

                ACCESS_TOKEN_PAYLOAD_JWT_PROPERTY_NAME_KEY indicates a reserved key used to determine the property name
                with which the JWT is set, used to retrieve the JWT from the access token payload during refresg and
                updateAccessTokenPayload

                Note: If the user has multiple overrides each with a unique propertyNameInAccessTokenPayload, the logic
                for checking the existing JWT when refreshing the session or updating the access token payload will not work.
                This is because even though the jwt itself would be created with unique property names, the _jwtPName value would
                always be overwritten by the override that runs last and when retrieving the jwt using that key name it cannot be 
                guaranteed that the right JWT is returned. This case is considered to be a rare requirement and we assume
                that users will not need multiple JWT representations of their access token payload.
            */
            [jwtPropertyName]: jwtResponse.jwt,
            [ACCESS_TOKEN_PAYLOAD_JWT_PROPERTY_NAME_KEY]: jwtPropertyName,
        };

        return accessTokenPayload;
    }

    return {
        ...originalImplementation,
        createNewSession: async function ({
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
            let accessTokenValidityInSeconds = Math.ceil((await this.getAccessTokenLifeTimeMS()) / 1000);
            accessTokenPayload = await modifyAccessTokenPayload({
                accessTokenPayload,
                jwtExpiry: getJWTExpiry(accessTokenValidityInSeconds),
                userId,
                jwtPropertyName: config.jwt.propertyNameInAccessTokenPayload,
            });

            let sessionContainer = await originalImplementation.createNewSession({
                res,
                userId,
                accessTokenPayload,
                sessionData,
            });

            return new SessionClassWithJWT(sessionContainer, jwtRecipeImplementation, appInfo);
        },
        getSession: async function ({
            req,
            res,
            options,
        }: {
            req: any;
            res: any;
            options?: VerifySessionOptions;
        }): Promise<SessionContainerInterface | undefined> {
            let sessionContainer = await originalImplementation.getSession({ req, res, options });

            if (sessionContainer === undefined) {
                return undefined;
            }

            return new SessionClassWithJWT(sessionContainer, jwtRecipeImplementation, appInfo);
        },
        refreshSession: async function ({ req, res }: { req: any; res: any }): Promise<SessionContainerInterface> {
            let accessTokenValidityInSeconds = Math.ceil((await this.getAccessTokenLifeTimeMS()) / 1000);

            // Refresh session first because this will create a new access token
            let newSession = await originalImplementation.refreshSession({ req, res });
            let accessTokenPayload = newSession.getAccessTokenPayload();

            accessTokenPayload = await modifyAccessTokenPayload({
                accessTokenPayload,
                jwtExpiry: getJWTExpiry(accessTokenValidityInSeconds),
                userId: newSession.getUserId(),
                jwtPropertyName: config.jwt.propertyNameInAccessTokenPayload,
            });

            await newSession.updateAccessTokenPayload(accessTokenPayload);

            return new SessionClassWithJWT(newSession, jwtRecipeImplementation, appInfo);
        },
        updateAccessTokenPayload: async function ({
            sessionHandle,
            newAccessTokenPayload,
        }: {
            sessionHandle: string;
            newAccessTokenPayload: any;
        }): Promise<void> {
            let sessionInformation = await this.getSessionInformation({ sessionHandle });
            let accessTokenPayload = sessionInformation.accessTokenPayload;

            let existingJwtPropertyName = accessTokenPayload[ACCESS_TOKEN_PAYLOAD_JWT_PROPERTY_NAME_KEY];

            if (existingJwtPropertyName === undefined) {
                return await originalImplementation.updateAccessTokenPayload({
                    sessionHandle,
                    newAccessTokenPayload,
                });
            }

            let existingJwt = accessTokenPayload[existingJwtPropertyName];
            assert.notStrictEqual(existingJwt, undefined);

            let currentTimeInSeconds = Date.now() / 1000;
            let decodedPayload = JsonWebToken.decode(existingJwt, { json: true });

            // JsonWebToken.decode possibly returns null
            if (decodedPayload === null) {
                throw new Error("Error reading JWT from session");
            }

            let jwtExpiry = decodedPayload.exp - currentTimeInSeconds;

            newAccessTokenPayload = await modifyAccessTokenPayload({
                accessTokenPayload: newAccessTokenPayload,
                jwtExpiry,
                userId: sessionInformation.userId,
                jwtPropertyName: existingJwtPropertyName,
            });

            return await originalImplementation.updateAccessTokenPayload({
                sessionHandle,
                newAccessTokenPayload,
            });
        },
    };
}
