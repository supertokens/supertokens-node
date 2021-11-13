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
import { SessionContainerInterface, TypeNormalisedInput, KeyInfo, VerifySessionOptions } from "../types";
import SessionClassWithJWT from "./sessionClass";
import { HandshakeInfo, Helpers } from "../recipeImplementation";
import { ProcessState, PROCESS_STATE } from "../../../processState";
import NormalisedURLPath from "../../../normalisedURLPath";
import { Querier } from "../../../querier";

export default function (
    originalImplementation: RecipeInterface,
    jwtRecipeImplementation: JWTRecipeInterface,
    config: TypeNormalisedInput,
    querier: Querier
): RecipeInterface {
    const EXPIRY_OFFSET_SECONDS = 30;
    let handshakeInfo: undefined | HandshakeInfo;

    // TODO: See if this duplication for helper can be avoided
    async function getHandshakeInfo(forceRefetch = false): Promise<HandshakeInfo> {
        if (handshakeInfo === undefined || handshakeInfo.getJwtSigningPublicKeyList().length === 0 || forceRefetch) {
            let antiCsrf = config.antiCsrf;
            ProcessState.getInstance().addState(PROCESS_STATE.CALLING_SERVICE_IN_GET_HANDSHAKE_INFO);
            let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/handshake"), {});

            handshakeInfo = new HandshakeInfo(
                antiCsrf,
                response.accessTokenBlacklistingEnabled,
                response.accessTokenValidity,
                response.refreshTokenValidity,
                response.jwtSigningPublicKeyList
            );

            updateJwtSigningPublicKeyInfo(
                response.jwtSigningPublicKeyList,
                response.jwtSigningPublicKey,
                response.jwtSigningPublicKeyExpiryTime
            );
        }
        return handshakeInfo;
    }

    function updateJwtSigningPublicKeyInfo(keyList: KeyInfo[] | undefined, publicKey: string, expiryTime: number) {
        if (keyList === undefined) {
            // Setting createdAt to Date.now() emulates the old lastUpdatedAt logic
            keyList = [{ publicKey, expiryTime, createdAt: Date.now() }];
        }

        if (handshakeInfo !== undefined) {
            handshakeInfo.setJwtSigningPublicKeyList(keyList);
        }
    }

    let helpers: Helpers = {
        querier,
        updateJwtSigningPublicKeyInfo,
        getHandshakeInfo,
        config,
    };

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
            let accessTokenValidityInSeconds = (await originalImplementation.getAccessTokenLifeTimeMS()) / 1000;
            let jwtResponse = await jwtRecipeImplementation.createJWT({
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

            let sessionContainer = await originalImplementation.createNewSession({
                res,
                userId,
                accessTokenPayload,
                sessionData,
            });

            return new SessionClassWithJWT(
                helpers,
                sessionContainer.getAccessToken(),
                sessionContainer.getHandle(),
                sessionContainer.getUserId(),
                sessionContainer.getAccessTokenPayload(),
                res,
                jwtRecipeImplementation
            );
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

            return new SessionClassWithJWT(
                helpers,
                sessionContainer.getAccessToken(),
                sessionContainer.getHandle(),
                sessionContainer.getUserId(),
                sessionContainer.getAccessTokenPayload(),
                res,
                jwtRecipeImplementation
            );
        },
        refreshSession: async function ({ req, res }: { req: any; res: any }): Promise<SessionContainerInterface> {
            let accessTokenValidityInSeconds = (await originalImplementation.getAccessTokenLifeTimeMS()) / 1000;

            // Refresh session first because this will create a new access token
            let newSession = await originalImplementation.refreshSession({ req, res });
            let accessTokenPayload = newSession.getAccessTokenPayload();

            // Remove the old jwt
            delete accessTokenPayload.jwt;

            let jwtResponse = await jwtRecipeImplementation.createJWT({
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

            return new SessionClassWithJWT(
                helpers,
                newSession.getAccessToken(),
                newSession.getHandle(),
                newSession.getUserId(),
                newSession.getAccessTokenPayload(),
                res,
                jwtRecipeImplementation
            );
        },
        updateAccessTokenPayload: async function ({
            sessionHandle,
            newAccessTokenPayload,
        }: {
            sessionHandle: string;
            newAccessTokenPayload: any;
        }): Promise<void> {
            let sessionInformation = await originalImplementation.getSessionInformation({ sessionHandle });
            let existingJWT = sessionInformation.accessTokenPayload.jwt;

            if (existingJWT === undefined) {
                return await originalImplementation.updateAccessTokenPayload({
                    sessionHandle,
                    newAccessTokenPayload,
                });
            }

            // Get the validity of the current JWT
            let currentTimeInSeconds = Date.now() / 1000;
            let existingJWTValidity =
                JSON.parse(Buffer.from(existingJWT.split(".")[1], "base64").toString("utf-8")).exp -
                currentTimeInSeconds;

            let newJWTResponse = await jwtRecipeImplementation.createJWT({
                payload: newAccessTokenPayload,
                validitySeconds: existingJWTValidity,
            });

            if (newJWTResponse.status === "UNSUPPORTED_ALGORITHM_ERROR") {
                // Should never come here
                throw new Error("JWT Signing algorithm not supported");
            }

            newAccessTokenPayload = {
                ...newAccessTokenPayload,
                jwt: newJWTResponse.jwt,
            };

            return await originalImplementation.updateAccessTokenPayload({
                sessionHandle,
                newAccessTokenPayload,
            });
        },
    };
}
