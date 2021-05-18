import { RecipeInterface, VerifySessionOptions } from "./types";
import Recipe from "./recipe";
import * as SessionFunctions from "./sessionFunctions";
import {
    attachAccessTokenToCookie,
    clearSessionFromCookie,
    getAccessTokenFromCookie,
    getAntiCsrfTokenFromHeaders,
    getIdRefreshTokenFromCookie,
    getRefreshTokenFromCookie,
    setFrontTokenInHeaders,
    getRidFromHeader,
} from "./cookieAndHeaders";
import * as express from "express";
import { attachCreateOrRefreshSessionResponseToExpressRes } from "./utils";
import Session from "./sessionClass";
import STError from "./error";
import { normaliseHttpMethod } from "../../utils";

export default class RecipeImplementation implements RecipeInterface {
    recipeInstance: Recipe;
    constructor(recipeInstance: Recipe) {
        this.recipeInstance = recipeInstance;
    }

    createNewSession = async (
        res: express.Response,
        userId: string,
        jwtPayload: any = {},
        sessionData: any = {}
    ): Promise<Session> => {
        let response = await SessionFunctions.createNewSession(this.recipeInstance, userId, jwtPayload, sessionData);
        attachCreateOrRefreshSessionResponseToExpressRes(this.recipeInstance, res, response);
        return new Session(
            this.recipeInstance,
            response.accessToken.token,
            response.session.handle,
            response.session.userId,
            response.session.userDataInJWT,
            res
        );
    };

    getSession = async (
        req: express.Request,
        res: express.Response,
        options?: VerifySessionOptions
    ): Promise<Session | undefined> => {
        let doAntiCsrfCheck = options !== undefined ? options.antiCsrfCheck : undefined;

        let idRefreshToken = getIdRefreshTokenFromCookie(req);
        if (idRefreshToken === undefined) {
            // we do not clear cookies here because of a
            // race condition mentioned here: https://github.com/supertokens/supertokens-node/issues/17

            if (options !== undefined && typeof options !== "boolean" && options.sessionRequired === false) {
                // there is no session that exists here, and the user wants session verification
                // to be optional. So we return undefined.
                return undefined;
            }

            throw new STError(
                {
                    message: "Session does not exist. Are you sending the session tokens in the request as cookies?",
                    type: STError.UNAUTHORISED,
                },
                this.recipeInstance
            );
        }
        let accessToken = getAccessTokenFromCookie(req);
        if (accessToken === undefined) {
            // maybe the access token has expired.
            throw new STError(
                {
                    message: "Access token has expired. Please call the refresh API",
                    type: STError.TRY_REFRESH_TOKEN,
                },
                this.recipeInstance
            );
        }
        try {
            let antiCsrfToken = getAntiCsrfTokenFromHeaders(req);

            if (doAntiCsrfCheck === undefined) {
                doAntiCsrfCheck = normaliseHttpMethod(req.method) !== "get";
            }

            let response = await SessionFunctions.getSession(
                this.recipeInstance,
                accessToken,
                antiCsrfToken,
                doAntiCsrfCheck,
                getRidFromHeader(req) !== undefined
            );
            if (response.accessToken !== undefined) {
                setFrontTokenInHeaders(
                    this.recipeInstance,
                    res,
                    response.session.userId,
                    response.accessToken.expiry,
                    response.session.userDataInJWT
                );
                attachAccessTokenToCookie(
                    this.recipeInstance,
                    res,
                    response.accessToken.token,
                    response.accessToken.expiry
                );
                accessToken = response.accessToken.token;
            }
            return new Session(
                this.recipeInstance,
                accessToken,
                response.session.handle,
                response.session.userId,
                response.session.userDataInJWT,
                res
            );
        } catch (err) {
            if (err.type === STError.UNAUTHORISED) {
                clearSessionFromCookie(this.recipeInstance, res);
            }
            throw err;
        }
    };

    refreshSession = async (req: express.Request, res: express.Response): Promise<Session> => {
        let inputIdRefreshToken = getIdRefreshTokenFromCookie(req);
        if (inputIdRefreshToken === undefined) {
            // we do not clear cookies here because of a
            // race condition mentioned here: https://github.com/supertokens/supertokens-node/issues/17

            throw new STError(
                {
                    message: "Session does not exist. Are you sending the session tokens in the request as cookies?",
                    type: STError.UNAUTHORISED,
                },
                this.recipeInstance
            );
        }

        try {
            let inputRefreshToken = getRefreshTokenFromCookie(req);
            if (inputRefreshToken === undefined) {
                throw new STError(
                    {
                        message:
                            "Refresh token not found. Are you sending the refresh token in the request as a cookie?",
                        type: STError.UNAUTHORISED,
                    },
                    this.recipeInstance
                );
            }
            let antiCsrfToken = getAntiCsrfTokenFromHeaders(req);
            let response = await SessionFunctions.refreshSession(
                this.recipeInstance,
                inputRefreshToken,
                antiCsrfToken,
                getRidFromHeader(req) !== undefined
            );
            attachCreateOrRefreshSessionResponseToExpressRes(this.recipeInstance, res, response);
            return new Session(
                this.recipeInstance,
                response.accessToken.token,
                response.session.handle,
                response.session.userId,
                response.session.userDataInJWT,
                res
            );
        } catch (err) {
            if (err.type === STError.UNAUTHORISED || err.type === STError.TOKEN_THEFT_DETECTED) {
                clearSessionFromCookie(this.recipeInstance, res);
            }
            throw err;
        }
    };

    revokeAllSessionsForUser = (userId: string) => {
        return SessionFunctions.revokeAllSessionsForUser(this.recipeInstance, userId);
    };

    getAllSessionHandlesForUser = (userId: string): Promise<string[]> => {
        return SessionFunctions.getAllSessionHandlesForUser(this.recipeInstance, userId);
    };

    revokeSession = (sessionHandle: string): Promise<boolean> => {
        return SessionFunctions.revokeSession(this.recipeInstance, sessionHandle);
    };

    revokeMultipleSessions = (sessionHandles: string[]) => {
        return SessionFunctions.revokeMultipleSessions(this.recipeInstance, sessionHandles);
    };

    getSessionData = (sessionHandle: string): Promise<any> => {
        return SessionFunctions.getSessionData(this.recipeInstance, sessionHandle);
    };

    updateSessionData = (sessionHandle: string, newSessionData: any) => {
        return SessionFunctions.updateSessionData(this.recipeInstance, sessionHandle, newSessionData);
    };

    getJWTPayload = (sessionHandle: string): Promise<any> => {
        return SessionFunctions.getJWTPayload(this.recipeInstance, sessionHandle);
    };

    updateJWTPayload = (sessionHandle: string, newJWTPayload: any) => {
        return SessionFunctions.updateJWTPayload(this.recipeInstance, sessionHandle, newJWTPayload);
    };
}
