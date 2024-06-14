import { Router } from "express";
import Session from "../../../recipe/session";
import * as supertokens from "../../../lib/build";
import { PrimitiveClaim } from "../../../lib/build/recipe/session/claims";
import SessionRecipe from "../../../lib/build/recipe/session/recipe";
import { logger } from "./logger";

const namespace = "com.supertokens:node-test-server:session";
const { logDebugMessage } = logger(namespace);

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

const router = Router()
    .post("/createnewsessionwithoutrequestresponse", async (req, res, next) => {
        try {
            logDebugMessage("Session.createNewSessionWithoutRequestResponse %j", req.body);
            const recipeUserId = supertokens.convertToRecipeUserId(req.body.recipeUserId);
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
    })
    .post("/getsessionwithoutrequestresponse", async (req, res, next) => {
        try {
            logDebugMessage("Session.getSessionWithoutRequestResponse %j", req.body);
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
    })
    .post("/getsessioninformation", async (req, res, next) => {
        try {
            logDebugMessage("Session.getSessionInformation %j", req.body);
            const response = await Session.getSessionInformation(req.body.sessionHandle, req.body.userContext);
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/getallsessionhandlesforuser", async (req, res, next) => {
        try {
            logDebugMessage("Session.getAllSessionHandlesForUser %j", req.body);
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
    })
    .post("/refreshsessionwithoutrequestresponse", async (req, res, next) => {
        try {
            logDebugMessage("Session.refreshSessionWithoutRequestResponse %j", req.body);
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
    })
    .post("/revokeallsessionsforuser", async (req, res, next) => {
        try {
            logDebugMessage("Session.revokeAllSessionsForUser %j", req.body);
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
    })
    .post("/mergeintoaccesspayload", async (req, res, next) => {
        try {
            logDebugMessage("Session.mergeIntoAccessPayload %j", req.body);
            const response = await Session.mergeIntoAccessTokenPayload(
                req.body.sessionHandle,
                req.body.accessTokenPayloadUpdate,
                req.body.userContext
            );
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/fetchandsetclaim", async (req, res, next) => {
        try {
            logDebugMessage("Session.fetchAndSetClaim %j", req.body);
            let claim = new PrimitiveClaim({
                key: req.body.claim.key,
                fetchValue: eval(`${req.body.claim.fetchValue}`),
            });
            const response = await Session.fetchAndSetClaim(req.body.sessionHandle, claim, req.body.userContext);
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/validateclaimsforsessionhandle", async (req, res, next) => {
        try {
            logDebugMessage("Session.validateClaimsForSessionHandle %j", req.body);

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
    })
    .post("/regenerateaccesstoken", async (req, res, next) => {
        try {
            logDebugMessage("Session.regenerateAccessToken %j", req.body);
            const response = await SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.regenerateAccessToken(
                req.body
            );
            res.json(response);
        } catch (e) {
            next(e);
        }
    });

export default router;
