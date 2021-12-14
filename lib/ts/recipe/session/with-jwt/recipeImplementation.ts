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
import { RecipeInterface as OpenIdRecipeInterface } from "../../openid/types";
import { SessionContainerInterface, TypeNormalisedInput, VerifySessionOptions } from "../types";
import { ACCESS_TOKEN_PAYLOAD_JWT_PROPERTY_NAME_KEY } from "./constants";
import SessionClassWithJWT from "./sessionClass";
import * as assert from "assert";
import { addJWTToAccessTokenPayload } from "./utils";

// Time difference between JWT expiry and access token expiry (JWT expiry = access token expiry + EXPIRY_OFFSET_SECONDS)
let EXPIRY_OFFSET_SECONDS = 30;

// This function should only be used during testing
export function setJWTExpiryOffsetSecondsForTesting(offset: number) {
    if (process.env.TEST_MODE !== "testing") {
        throw Error("calling testing function in non testing env");
    }
    EXPIRY_OFFSET_SECONDS = offset;
}

export default function (
    originalImplementation: RecipeInterface,
    openIdRecipeImplementation: OpenIdRecipeInterface,
    config: TypeNormalisedInput
): RecipeInterface {
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
            userContext,
        }: {
            res: any;
            userId: string;
            accessTokenPayload?: any;
            sessionData?: any;
            userContext: any;
        }): Promise<SessionContainerInterface> {
            accessTokenPayload =
                accessTokenPayload === null || accessTokenPayload === undefined ? {} : accessTokenPayload;
            let accessTokenValidityInSeconds = Math.ceil((await this.getAccessTokenLifeTimeMS({ userContext })) / 1000);
            accessTokenPayload = await addJWTToAccessTokenPayload({
                accessTokenPayload,
                jwtExpiry: getJWTExpiry(accessTokenValidityInSeconds),
                userId,
                jwtPropertyName: config.jwt.propertyNameInAccessTokenPayload,
                openIdRecipeImplementation,
                userContext,
            });

            let sessionContainer = await originalImplementation.createNewSession({
                res,
                userId,
                accessTokenPayload,
                sessionData,
                userContext,
            });

            return new SessionClassWithJWT(sessionContainer, openIdRecipeImplementation);
        },
        getSession: async function ({
            req,
            res,
            options,
            userContext,
        }: {
            req: any;
            res: any;
            options?: VerifySessionOptions;
            userContext: any;
        }): Promise<SessionContainerInterface | undefined> {
            let sessionContainer = await originalImplementation.getSession({ req, res, options, userContext });

            if (sessionContainer === undefined) {
                return undefined;
            }

            return new SessionClassWithJWT(sessionContainer, openIdRecipeImplementation);
        },
        refreshSession: async function ({
            req,
            res,
            userContext,
        }: {
            req: any;
            res: any;
            userContext: any;
        }): Promise<SessionContainerInterface> {
            let accessTokenValidityInSeconds = Math.ceil((await this.getAccessTokenLifeTimeMS({ userContext })) / 1000);

            // Refresh session first because this will create a new access token
            let newSession = await originalImplementation.refreshSession({ req, res, userContext });
            let accessTokenPayload = newSession.getAccessTokenPayload();

            accessTokenPayload = await addJWTToAccessTokenPayload({
                accessTokenPayload,
                jwtExpiry: getJWTExpiry(accessTokenValidityInSeconds),
                userId: newSession.getUserId(),
                jwtPropertyName: config.jwt.propertyNameInAccessTokenPayload,
                openIdRecipeImplementation,
                userContext,
            });

            await newSession.updateAccessTokenPayload(accessTokenPayload);

            return new SessionClassWithJWT(newSession, openIdRecipeImplementation);
        },
        updateAccessTokenPayload: async function ({
            sessionHandle,
            newAccessTokenPayload,
            userContext,
        }: {
            sessionHandle: string;
            newAccessTokenPayload: any;
            userContext: any;
        }): Promise<void> {
            newAccessTokenPayload =
                newAccessTokenPayload === null || newAccessTokenPayload === undefined ? {} : newAccessTokenPayload;
            let sessionInformation = await this.getSessionInformation({ sessionHandle, userContext });
            let accessTokenPayload = sessionInformation.accessTokenPayload;

            let existingJwtPropertyName = accessTokenPayload[ACCESS_TOKEN_PAYLOAD_JWT_PROPERTY_NAME_KEY];

            if (existingJwtPropertyName === undefined) {
                return await originalImplementation.updateAccessTokenPayload({
                    sessionHandle,
                    newAccessTokenPayload,
                    userContext,
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

            if (jwtExpiry <= 0) {
                // it can come here if someone calls this function well after
                // the access token and the jwt payload have expired. In this case,
                // we still want the jwt payload to update, but the resulting JWT should
                // not be alive for too long (since it's expired already). So we set it to
                // 1 second lifetime.
                jwtExpiry = 1;
            }

            newAccessTokenPayload = await addJWTToAccessTokenPayload({
                accessTokenPayload: newAccessTokenPayload,
                jwtExpiry,
                userId: sessionInformation.userId,
                jwtPropertyName: existingJwtPropertyName,
                openIdRecipeImplementation,
                userContext,
            });

            return await originalImplementation.updateAccessTokenPayload({
                sessionHandle,
                newAccessTokenPayload,
                userContext,
            });
        },
    };
}
