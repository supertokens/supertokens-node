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

import SessionRecipe from "./sessionRecipe";
import * as express from "express";
import SuperTokensError from "../error";
import SessionClass from "./sessionClass";
import { verifySession as originalVerifySession } from "../middleware";

// For Express
export default class SessionWrapper {
    static init = SessionRecipe.init;
    static Error = SuperTokensError;

    static SessionContainer = SessionClass;

    static createNewSession(res: express.Response, userId: string, jwtPayload: any = {}, sessionData: any = {}) {
        return SessionRecipe.getInstanceOrThrowError().createNewSession(res, userId, jwtPayload, sessionData);
    }

    static getSession(req: express.Request, res: express.Response, doAntiCsrfCheck: boolean) {
        return SessionRecipe.getInstanceOrThrowError().getSession(req, res, doAntiCsrfCheck);
    }

    static refreshSession(req: express.Request, res: express.Response) {
        return SessionRecipe.getInstanceOrThrowError().refreshSession(req, res);
    }

    static revokeAllSessionsForUser(userId: string) {
        return SessionRecipe.getInstanceOrThrowError().revokeAllSessionsForUser(userId);
    }

    static getAllSessionHandlesForUser(userId: string) {
        return SessionRecipe.getInstanceOrThrowError().getAllSessionHandlesForUser(userId);
    }

    static revokeSession(sessionHandle: string) {
        return SessionRecipe.getInstanceOrThrowError().revokeSession(sessionHandle);
    }

    static revokeMultipleSessions(sessionHandles: string[]) {
        return SessionRecipe.getInstanceOrThrowError().revokeMultipleSessions(sessionHandles);
    }

    static getSessionData(sessionHandle: string) {
        return SessionRecipe.getInstanceOrThrowError().getSessionData(sessionHandle);
    }

    static updateSessionData(sessionHandle: string, newSessionData: any) {
        return SessionRecipe.getInstanceOrThrowError().updateSessionData(sessionHandle, newSessionData);
    }

    static getJWTPayload(sessionHandle: string) {
        return SessionRecipe.getInstanceOrThrowError().getJWTPayload(sessionHandle);
    }

    static updateJWTPayload(sessionHandle: string, newJWTPayload: any) {
        return SessionRecipe.getInstanceOrThrowError().updateJWTPayload(sessionHandle, newJWTPayload);
    }

    static verifySession = (antiCsrfCheck?: boolean) => {
        return originalVerifySession(SessionRecipe.getInstanceOrThrowError(), antiCsrfCheck);
    };
}

export let init = SessionWrapper.init;

export let createNewSession = SessionWrapper.createNewSession;

export let getSession = SessionWrapper.getSession;

export let refreshSession = SessionWrapper.refreshSession;

export let revokeAllSessionsForUser = SessionWrapper.revokeAllSessionsForUser;

export let getAllSessionHandlesForUser = SessionWrapper.getAllSessionHandlesForUser;

export let revokeSession = SessionWrapper.revokeSession;

export let revokeMultipleSessions = SessionWrapper.revokeMultipleSessions;

export let getSessionData = SessionWrapper.getSessionData;

export let updateSessionData = SessionWrapper.updateSessionData;

export let getJWTPayload = SessionWrapper.getJWTPayload;

export let updateJWTPayload = SessionWrapper.updateJWTPayload;

export let verifySession = SessionWrapper.verifySession;

export let Error = SessionWrapper.Error;

export let SessionContainer = SessionWrapper.SessionContainer;
