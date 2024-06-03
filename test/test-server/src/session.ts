import type { Debugger } from "debug";
import type { Express } from "express";
import Session from "../../../recipe/session";
import * as supertokens from "../../../lib/build";
import { PrimitiveClaim } from "../../../lib/build/recipe/session/claims";
import SessionRecipe from "../../../lib/build/recipe/session/recipe";

let userIdInCallback;
let recipeUserIdInCallback;

export function getSessionVars() {
    return {
        userIdInCallback,
        recipeUserIdInCallback,
    };
}

export function resetSessionVars() {
    userIdInCallback = undefined;
    recipeUserIdInCallback = undefined;
}

export function setupSessionRoutes(app: Express, log: Debugger) {
    app.post("/test/session/createnewsessionwithoutrequestresponse", async (req, res, next) => {
        try {
            log("Session.createNewSessionWithoutRequestResponse %j", req.body);
            const recipeUserId = supertokens.convertToRecipeUserId(
                req.body.recipeUserId.recipeUserId || req.body.recipeUserId
            );
            const response = await Session.createNewSessionWithoutRequestResponse(
                req.body.tenantId || "public",
                recipeUserId,
                req.body.accessTokenPayload,
                req.body.sessionDataInDatabase,
                req.body.disableAntiCsrf,
                req.body.userContext
            );
            res.json(response);
        } catch (e) {
            next(e);
        }
    });

    app.post("/test/session/getsessionwithoutrequestresponse", async (req, res, next) => {
        try {
            log("Session.getSessionWithoutRequestResponse %j", req.body);
            const response = await Session.getSessionWithoutRequestResponse(
                req.body.accessToken,
                req.body.antiCsrfToken,
                req.body.options,
                req.body.userContext
            );
            res.json(response);
        } catch (e) {
            next(e);
        }
    });

    app.post("/test/session/getsessioninformation", async (req, res, next) => {
        try {
            log("Session.getSessionInformation %j", req.body);
            const response = await Session.getSessionInformation(req.body.sessionHandle, req.body.userContext);
            res.json(response);
        } catch (e) {
            next(e);
        }
    });

    app.post("/test/session/getallsessionhandlesforuser", async (req, res, next) => {
        try {
            log("Session.getAllSessionHandlesForUser %j", req.body);
            const response = await Session.getAllSessionHandlesForUser(
                req.body.userId,
                req.body.fetchSessionsForAllLinkedAccounts,
                req.body.tenantId,
                req.body.userContext
            );
            res.json(response);
        } catch (e) {
            next(e);
        }
    });

    app.post("/test/session/refreshsessionwithoutrequestresponse", async (req, res, next) => {
        try {
            log("Session.refreshSessionWithoutRequestResponse %j", req.body);
            const response = await Session.refreshSessionWithoutRequestResponse(
                req.body.refreshToken,
                req.body.disableAntiCsrf,
                req.body.antiCsrfToken,
                req.body.userContext
            );
            res.json(response);
        } catch (e) {
            next(e);
        }
    });

    app.post("/test/session/revokeallsessionsforuser", async (req, res, next) => {
        try {
            log("Session.revokeAllSessionsForUser %j", req.body);
            const response = await Session.revokeAllSessionsForUser(
                req.body.userId,
                req.body.revokeSessionsForLinkedAccounts,
                req.body.tenantId,
                req.body.userContext
            );
            res.json(response);
        } catch (e) {
            next(e);
        }
    });

    app.post("/test/session/mergeintoaccesspayload", async (req, res, next) => {
        try {
            log("Session.mergeIntoAccessPayload %j", req.body);
            const response = await Session.mergeIntoAccessTokenPayload(
                req.body.sessionHandle,
                req.body.accessTokenPayloadUpdate,
                req.body.userContext
            );
            res.json(response);
        } catch (e) {
            next(e);
        }
    });

    app.post("/test/session/fetchandsetclaim", async (req, res, next) => {
        try {
            log("Session.fetchAndSetClaim %j", req.body);
            let claim = new PrimitiveClaim({
                key: req.body.claim.key,
                fetchValue: eval(`${req.body.claim.fetchValue}`),
            });
            const response = await Session.fetchAndSetClaim(req.body.sessionHandle, claim, req.body.userContext);
            res.json(response);
        } catch (e) {
            next(e);
        }
    });

    app.post("/test/session/validateclaimsforsessionhandle", async (req, res, next) => {
        try {
            log("Session.validateClaimsForSessionHandle %j", req.body);

            let overrideGlobalClaimValidators = req.body.overrideGlobalClaimValidators
                ? eval(`${req.body.overrideGlobalClaimValidators}`)
                : undefined;
            const response = await Session.validateClaimsForSessionHandle(
                req.body.sessionHandle,
                overrideGlobalClaimValidators,
                req.body.userContext
            );
            res.json(response);
        } catch (e) {
            next(e);
        }
    });

    app.post("/test/session/regenerateaccesstoken", async (req, res, next) => {
        try {
            log("Session.regenerateAccessToken %j", req.body);
            const response = await SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.regenerateAccessToken(
                req.body
            );
            res.json(response);
        } catch (e) {
            next(e);
        }
    });
}
