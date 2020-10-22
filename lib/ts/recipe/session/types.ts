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
import { Request, Response, NextFunction } from "express";
import { Session } from "./express";

export type CreateOrRefreshAPIResponse = {
    session: {
        handle: string;
        userId: string;
        userDataInJWT: any;
    };
    accessToken: {
        token: string;
        expiry: number;
        createdTime: number;
    };
    refreshToken: {
        token: string;
        expiry: number;
        createdTime: number;
    };
    idRefreshToken: {
        token: string;
        expiry: number;
        createdTime: number;
    };
    antiCsrfToken: string | undefined;
};

export type TypeInput = {
    hosts?: string;
    accessTokenPath?: string;
    apiBasePath?: string;
    cookieDomain?: string;
    cookieSameSite?: "strict" | "lax" | "none";
    cookieSecure?: boolean;
    apiKey?: string;
    sessionExpiredStatusCode?: number;
};

export type TypeNormalisedInput = {
    hosts: string;
    accessTokenPath: string;
    apiBasePath: string;
    cookieDomain: string | undefined;
    cookieSameSite: "strict" | "lax" | "none";
    cookieSecure: boolean;
    apiKey?: string;
    sessionExpiredStatusCode: number;
};

export interface SessionRequest extends Request {
    session: Session;
}

export interface ErrorHandlerMiddleware {
    (message: string, request: Request, response: Response, next: NextFunction): void;
}

export interface TokenTheftErrorHandlerMiddleware {
    (sessionHandle: string, userId: string, request: Request, response: Response, next: NextFunction): void;
}

export interface SuperTokensErrorMiddlewareOptions {
    onUnauthorised?: ErrorHandlerMiddleware;
    onTryRefreshToken?: ErrorHandlerMiddleware;
    onTokenTheftDetected?: TokenTheftErrorHandlerMiddleware;
}

export type auth0RequestBody =
    | {
          action: "login";
          code: string;
          redirect_uri: string;
      }
    | {
          action: "refresh";
          code?: string;
          redirect_uri?: string;
      }
    | {
          action: "logout";
      };
