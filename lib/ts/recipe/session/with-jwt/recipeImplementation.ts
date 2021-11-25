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
import { modifyAccessTokenPayload } from "./utils";

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
            accessTokenPayload = await modifyAccessTokenPayload({
                accessTokenPayload,
                jwtExpiry: getJWTExpiry(accessTokenValidityInSeconds),
                userId,
                jwtPropertyName: config.jwt.propertyNameInAccessTokenPayload,
                appInfo,
                jwtRecipeImplementation,
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
                appInfo,
                jwtRecipeImplementation,
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
                appInfo,
                jwtRecipeImplementation,
            });

            return await originalImplementation.updateAccessTokenPayload({
                sessionHandle,
                newAccessTokenPayload,
            });
        },
    };
}
