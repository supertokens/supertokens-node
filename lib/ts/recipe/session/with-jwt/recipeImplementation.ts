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
import SessionClassWithJWT from "./sessionClass";

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
            let jwtResponse = await jwtRecipeImplementation.createJWT({
                payload: {
                    /* 
                        We add our claims before the user provided ones so that if they use the same claims
                        then the final payload will use the values they provide
                    */
                    sub: userId,
                    iss: appInfo.apiDomain.getAsStringDangerous(),
                    ...accessTokenPayload,
                },
                validitySeconds: getJWTExpiry(accessTokenValidityInSeconds),
            });

            if (jwtResponse.status === "UNSUPPORTED_ALGORITHM_ERROR") {
                // Should never come here
                throw new Error("JWT Signing algorithm not supported");
            }

            accessTokenPayload = {
                sub: userId,
                iss: appInfo.apiDomain.getAsStringDangerous(),
                ...accessTokenPayload,
                /*
                    We add the JWT after the user defined keys because we want to make sure that it never
                    gets overwritten by a user defined key. Using the same key as the one configured (or defaulting)
                    for the JWT should be considered a dev error
                */
                [config.jwt.propertyNameInAccessTokenPayload]: jwtResponse.jwt,
            };

            let sessionContainer = await originalImplementation.createNewSession({
                res,
                userId,
                accessTokenPayload,
                sessionData,
            });

            return new SessionClassWithJWT(sessionContainer, jwtRecipeImplementation, config);
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

            return new SessionClassWithJWT(sessionContainer, jwtRecipeImplementation, config);
        },
        refreshSession: async function ({ req, res }: { req: any; res: any }): Promise<SessionContainerInterface> {
            let accessTokenValidityInSeconds = Math.ceil((await this.getAccessTokenLifeTimeMS()) / 1000);

            // Refresh session first because this will create a new access token
            let newSession = await originalImplementation.refreshSession({ req, res });
            let accessTokenPayload = newSession.getAccessTokenPayload();

            // Remove the old jwt
            if (config.jwt.getPropertyNameFromAccessTokenPayload !== undefined) {
                let jwtPropertyName = config.jwt.getPropertyNameFromAccessTokenPayload(accessTokenPayload);
                delete accessTokenPayload[jwtPropertyName];
            } else {
                delete accessTokenPayload[config.jwt.propertyNameInAccessTokenPayload];
            }

            let jwtResponse = await jwtRecipeImplementation.createJWT({
                payload: accessTokenPayload,
                validitySeconds: getJWTExpiry(accessTokenValidityInSeconds),
            });

            if (jwtResponse.status === "UNSUPPORTED_ALGORITHM_ERROR") {
                // Should never come here
                throw new Error("JWT Signing algorithm not supported");
            }

            accessTokenPayload = {
                ...accessTokenPayload,
                [config.jwt.propertyNameInAccessTokenPayload]: jwtResponse.jwt,
            };

            await newSession.updateAccessTokenPayload(accessTokenPayload);

            return new SessionClassWithJWT(newSession, jwtRecipeImplementation, config);
        },
        updateAccessTokenPayload: async function ({
            sessionHandle,
            newAccessTokenPayload,
        }: {
            sessionHandle: string;
            newAccessTokenPayload: any;
        }): Promise<void> {
            let sessionInformation = await this.getSessionInformation({ sessionHandle });

            let jwtPropertyName = config.jwt.propertyNameInAccessTokenPayload;

            if (config.jwt.getPropertyNameFromAccessTokenPayload !== undefined) {
                jwtPropertyName = config.jwt.getPropertyNameFromAccessTokenPayload(
                    sessionInformation.accessTokenPayload
                );
            }

            let existingJWT = sessionInformation.accessTokenPayload[jwtPropertyName];

            if (existingJWT === undefined) {
                return await originalImplementation.updateAccessTokenPayload({
                    sessionHandle,
                    newAccessTokenPayload,
                });
            }

            // Get the validity of the current JWT
            let currentTimeInSeconds = Date.now() / 1000;
            let decodedPayload = JsonWebToken.decode(existingJWT, { json: true });

            // JsonWebToken.decode possibly returns null
            if (decodedPayload === null) {
                throw new Error("Error reading JWT from session");
            }

            let existingJWTValidity = decodedPayload.exp - currentTimeInSeconds;

            let defaultClaimsToAdd = {
                sub: sessionInformation.userId,
                iss: appInfo.apiDomain.getAsStringDangerous(),
            };

            let newJWTResponse = await jwtRecipeImplementation.createJWT({
                payload: {
                    ...defaultClaimsToAdd,
                    ...newAccessTokenPayload,
                },
                validitySeconds: existingJWTValidity,
            });

            if (newJWTResponse.status === "UNSUPPORTED_ALGORITHM_ERROR") {
                // Should never come here
                throw new Error("JWT Signing algorithm not supported");
            }

            newAccessTokenPayload = {
                ...defaultClaimsToAdd,
                ...newAccessTokenPayload,
                [jwtPropertyName]: newJWTResponse.jwt,
            };

            return await originalImplementation.updateAccessTokenPayload({
                sessionHandle,
                newAccessTokenPayload,
            });
        },
    };
}
