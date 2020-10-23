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
import STError from "../error";

export * from "../error";
export * from "./sessionClass";
import { middleware as originalMiddleware } from "../middleware";

// For Express
export default class SessionWrapper {
    static init = SessionRecipe.init;

    static createNewSession = SessionRecipe.getInstanceOrThrowError().createNewSession;

    static getSession = SessionRecipe.getInstanceOrThrowError().getSession;

    static refreshSession = SessionRecipe.getInstanceOrThrowError().refreshSession;

    static revokeAllSessionsForUser = SessionRecipe.getInstanceOrThrowError().revokeAllSessionsForUser;

    static getAllSessionHandlesForUser = SessionRecipe.getInstanceOrThrowError().getAllSessionHandlesForUser;

    static revokeSession = SessionRecipe.getInstanceOrThrowError().revokeSession;

    static revokeMultipleSessions = SessionRecipe.getInstanceOrThrowError().revokeMultipleSessions;

    static getSessionData = SessionRecipe.getInstanceOrThrowError().getSessionData;

    static updateSessionData = SessionRecipe.getInstanceOrThrowError().updateSessionData;

    static getCORSAllowedHeaders = SessionRecipe.getInstanceOrThrowError().getCORSAllowedHeaders;

    static getJWTPayload = SessionRecipe.getInstanceOrThrowError().getJWTPayload;

    static updateJWTPayload = SessionRecipe.getInstanceOrThrowError().updateJWTPayload;

    static middleware = (antiCsrfCheck?: boolean) => {
        return originalMiddleware(SessionRecipe.getInstanceOrThrowError(), antiCsrfCheck);
    };

    static Error = STError;
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

export let getCORSAllowedHeaders = SessionWrapper.getCORSAllowedHeaders;

export let getJWTPayload = SessionWrapper.getJWTPayload;

export let updateJWTPayload = SessionWrapper.updateJWTPayload;
