import { Router } from "express";
import Session from "../../../recipe/session";
import * as supertokens from "../../../lib/build";
import SessionRecipe from "../../../lib/build/recipe/session/recipe";
import { logger } from "./logger";
import { getFunc } from "./testFunctionMapper";
import {
    convertRequestSessionToSessionObject,
    deserializeClaim,
    deserializeValidator,
    maxVersion,
    serializeResponseSession,
} from "./utils";
import { logOverrideEvent } from "./overrideLogging";

const namespace = "com.supertokens:node-test-server:session";
const { logDebugMessage } = logger(namespace);

const router = Router()
    .post("/createnewsessionwithoutrequestresponse", async (req, res, next) => {
        const fdiVersion = req.headers["fdi-version"] as string;

        try {
            logDebugMessage("Session.createNewSessionWithoutRequestResponse %j", req.body);
            let recipeUserId;
            if (
                maxVersion("1.17", fdiVersion) === "1.17" ||
                (maxVersion("2.0", fdiVersion) === fdiVersion && maxVersion("3.0", fdiVersion) !== fdiVersion)
            ) {
                // fdiVersion <= "1.17" || (fdiVersion >= "2.0" && fdiVersion < "3.0")
                recipeUserId = supertokens.convertToRecipeUserId(req.body.userId);
            } else {
                recipeUserId = supertokens.convertToRecipeUserId(req.body.recipeUserId);
            }
            const response = await Session.createNewSessionWithoutRequestResponse(
                req.body.tenantId || "public",
                recipeUserId,
                req.body.accessTokenPayload,
                req.body.sessionDataInDatabase,
                req.body.disableAntiCsrf,
                req.body.userContext
            );

            res.json(serializeResponseSession(response));
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
            res.json(serializeResponseSession(response));
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
            res.json(serializeResponseSession(response));
        } catch (e) {
            console.error(e);
            // we do not call next(e) here so that the proper error response is sent back to the client
            // otherwise the supertokens error handler will send a different type of response.
            res.status(500).json({ ...e, message: e.message });
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
            let claim = deserializeClaim(req.body.claim);
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
                ? getFunc(`${req.body.overrideGlobalClaimValidators}`)
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
    })
    .post("/sessionobject/revokesession", async (req, res, next) => {
        logDebugMessage("Session.sessionobject.revokesession %j", req.body);
        logOverrideEvent("sessionobject.revokesession", "CALL", req.body);
        try {
            const session = await convertRequestSessionToSessionObject(req.body.session);
            if (!session) {
                throw new Error("This should never happen: failed to deserialize session");
            }
            const retVal = await session.revokeSession(req.body.userContext); // : Promise<void>;
            res.json({ retVal, updatedSession: serializeResponseSession(session) });

            logOverrideEvent("sessionobject.revokesession", "RES", retVal);
        } catch (e) {
            logOverrideEvent("sessionobject.revokesession", "REJ", e);
            next(e);
        }
    })
    .post("/sessionobject/getsessiondatafromdatabase", async (req, res, next) => {
        logDebugMessage("Session.sessionobject.getsessiondatafromdatabase %j", req.body);
        logOverrideEvent("sessionobject.getsessiondatafromdatabase", "CALL", req.body);
        try {
            const session = await convertRequestSessionToSessionObject(req.body.session);
            if (!session) {
                throw new Error("This should never happen: failed to deserialize session");
            }
            const retVal = await session.getSessionDataFromDatabase(req.body.userContext); // : Promise<any>;
            res.json({ retVal, updatedSession: serializeResponseSession(session) });

            logOverrideEvent("sessionobject.getsessiondatafromdatabase", "RES", retVal);
        } catch (e) {
            logOverrideEvent("sessionobject.getsessiondatafromdatabase", "REJ", e);
            next(e);
        }
    })
    .post("/sessionobject/updatesessiondataindatabase", async (req, res, next) => {
        logDebugMessage("Session.sessionobject.updatesessiondataindatabase %j", req.body);
        logOverrideEvent("sessionobject.updatesessiondataindatabase", "CALL", req.body);
        try {
            const session = await convertRequestSessionToSessionObject(req.body.session);
            if (!session) {
                throw new Error("This should never happen: failed to deserialize session");
            }
            const retVal = await session.updateSessionDataInDatabase(req.body.newSessionData, req.body.userContext); // : Promise<any>;
            res.json({ retVal, updatedSession: serializeResponseSession(session) });

            logOverrideEvent("sessionobject.updatesessiondataindatabase", "RES", retVal);
        } catch (e) {
            logOverrideEvent("sessionobject.updatesessiondataindatabase", "REJ", e);
            next(e);
        }
    })
    .post("/sessionobject/getuserid", async (req, res, next) => {
        logDebugMessage("Session.sessionobject.getuserid %j", req.body);
        logOverrideEvent("sessionobject.getuserid", "CALL", req.body);
        try {
            const session = await convertRequestSessionToSessionObject(req.body.session);
            if (!session) {
                throw new Error("This should never happen: failed to deserialize session");
            }
            const retVal = await session.getUserId(req.body.userContext); // : string;
            res.json({ retVal, updatedSession: serializeResponseSession(session) });

            logOverrideEvent("sessionobject.getuserid", "RES", retVal);
        } catch (e) {
            logOverrideEvent("sessionobject.getuserid", "REJ", e);
            next(e);
        }
    })
    .post("/sessionobject/getrecipeuserid", async (req, res, next) => {
        logDebugMessage("Session.sessionobject.getrecipeuserid %j", req.body);
        logOverrideEvent("sessionobject.getrecipeuserid", "CALL", req.body);
        try {
            const session = await convertRequestSessionToSessionObject(req.body.session);
            if (!session) {
                throw new Error("This should never happen: failed to deserialize session");
            }
            const retVal = await session.getRecipeUserId(req.body.userContext); // : RecipeUserId;
            res.json({ retVal, updatedSession: serializeResponseSession(session) });

            logOverrideEvent("sessionobject.getrecipeuserid", "RES", retVal);
        } catch (e) {
            logOverrideEvent("sessionobject.getrecipeuserid", "REJ", e);
            next(e);
        }
    })
    .post("/sessionobject/gettenantid", async (req, res, next) => {
        logDebugMessage("Session.sessionobject.gettenantid %j", req.body);
        logOverrideEvent("sessionobject.gettenantid", "CALL", req.body);
        try {
            const session = await convertRequestSessionToSessionObject(req.body.session);
            if (!session) {
                throw new Error("This should never happen: failed to deserialize session");
            }
            const retVal = await session.getTenantId(req.body.userContext); // : string;
            res.json({ retVal, updatedSession: serializeResponseSession(session) });

            logOverrideEvent("sessionobject.gettenantid", "RES", retVal);
        } catch (e) {
            logOverrideEvent("sessionobject.gettenantid", "REJ", e);
            next(e);
        }
    })
    .post("/sessionobject/getaccesstokenpayload", async (req, res, next) => {
        logDebugMessage("Session.sessionobject.getaccesstokenpayload %j", req.body);
        logOverrideEvent("sessionobject.getaccesstokenpayload", "CALL", req.body);
        try {
            const session = await convertRequestSessionToSessionObject(req.body.session);
            if (!session) {
                throw new Error("This should never happen: failed to deserialize session");
            }
            const retVal = await session.getAccessTokenPayload(req.body.userContext); // : any;
            res.json({ retVal, updatedSession: serializeResponseSession(session) });

            logOverrideEvent("sessionobject.getaccesstokenpayload", "RES", retVal);
        } catch (e) {
            logOverrideEvent("sessionobject.getaccesstokenpayload", "REJ", e);
            next(e);
        }
    })
    .post("/sessionobject/gethandle", async (req, res, next) => {
        logDebugMessage("Session.sessionobject.gethandle %j", req.body);
        logOverrideEvent("sessionobject.gethandle", "CALL", req.body);
        try {
            const session = await convertRequestSessionToSessionObject(req.body.session);
            if (!session) {
                throw new Error("This should never happen: failed to deserialize session");
            }
            const retVal = await session.getHandle(req.body.userContext); // : string;
            res.json({ retVal, updatedSession: serializeResponseSession(session) });

            logOverrideEvent("sessionobject.gethandle", "RES", retVal);
        } catch (e) {
            logOverrideEvent("sessionobject.gethandle", "REJ", e);
            next(e);
        }
    })
    .post("/sessionobject/getallsessiontokensdangerously", async (req, res, next) => {
        logDebugMessage("Session.sessionobject.getallsessiontokensdangerously %j", req.body);
        logOverrideEvent("sessionobject.getallsessiontokensdangerously", "CALL", req.body);
        try {
            const session = await convertRequestSessionToSessionObject(req.body.session);
            if (!session) {
                throw new Error("This should never happen: failed to deserialize session");
            }
            const retVal = await session.getAllSessionTokensDangerously(); // : Promise<{}>;
            res.json({ retVal, updatedSession: serializeResponseSession(session) });

            logOverrideEvent("sessionobject.getallsessiontokensdangerously", "RES", retVal);
        } catch (e) {
            logOverrideEvent("sessionobject.getallsessiontokensdangerously", "REJ", e);
            next(e);
        }
    })
    .post("/sessionobject/getaccesstoken", async (req, res, next) => {
        logDebugMessage("Session.sessionobject.getaccesstoken %j", req.body);
        logOverrideEvent("sessionobject.getaccesstoken", "CALL", req.body);
        try {
            const session = await convertRequestSessionToSessionObject(req.body.session);
            if (!session) {
                throw new Error("This should never happen: failed to deserialize session");
            }
            const retVal = await session.getAccessToken(req.body.userContext); // : string;
            res.json({ retVal, updatedSession: serializeResponseSession(session) });

            logOverrideEvent("sessionobject.getaccesstoken", "RES", retVal);
        } catch (e) {
            logOverrideEvent("sessionobject.getaccesstoken", "REJ", e);
            next(e);
        }
    })
    .post("/sessionobject/mergeintoaccesstokenpayload", async (req, res, next) => {
        logDebugMessage("Session.sessionobject.mergeintoaccesstokenpayload %j", req.body);
        logOverrideEvent("sessionobject.mergeintoaccesstokenpayload", "CALL", req.body);
        try {
            const session = await convertRequestSessionToSessionObject(req.body.session);
            if (!session) {
                throw new Error("This should never happen: failed to deserialize session");
            }
            const retVal = await session.mergeIntoAccessTokenPayload(
                req.body.accessTokenPayloadUpdate,
                req.body.userContext
            ); // : Promise<void>;
            res.json({ retVal, updatedSession: serializeResponseSession(session) });

            logOverrideEvent("sessionobject.mergeintoaccesstokenpayload", "RES", retVal);
        } catch (e) {
            logOverrideEvent("sessionobject.mergeintoaccesstokenpayload", "REJ", e);
            next(e);
        }
    })
    .post("/sessionobject/gettimecreated", async (req, res, next) => {
        logDebugMessage("Session.sessionobject.gettimecreated %j", req.body);
        logOverrideEvent("sessionobject.gettimecreated", "CALL", req.body);
        try {
            const session = await convertRequestSessionToSessionObject(req.body.session);
            if (!session) {
                throw new Error("This should never happen: failed to deserialize session");
            }
            const retVal = await session.getTimeCreated(req.body.userContext); // : Promise<number>;
            res.json({ retVal, updatedSession: serializeResponseSession(session) });

            logOverrideEvent("sessionobject.gettimecreated", "RES", retVal);
        } catch (e) {
            logOverrideEvent("sessionobject.gettimecreated", "REJ", e);
            next(e);
        }
    })
    .post("/sessionobject/getexpiry", async (req, res, next) => {
        logDebugMessage("Session.sessionobject.getexpiry %j", req.body);
        logOverrideEvent("sessionobject.getexpiry", "CALL", req.body);
        try {
            const session = await convertRequestSessionToSessionObject(req.body.session);
            if (!session) {
                throw new Error("This should never happen: failed to deserialize session");
            }
            const retVal = await session.getExpiry(req.body.userContext); // : Promise<number>;
            res.json({ retVal, updatedSession: serializeResponseSession(session) });

            logOverrideEvent("sessionobject.getexpiry", "RES", retVal);
        } catch (e) {
            logOverrideEvent("sessionobject.getexpiry", "REJ", e);
            next(e);
        }
    })
    .post("/sessionobject/assertclaims", async (req, res, next) => {
        logDebugMessage("Session.sessionobject.assertclaims %j", req.body);
        logOverrideEvent("sessionobject.assertclaims", "CALL", req.body);
        try {
            const session = await convertRequestSessionToSessionObject(req.body.session);
            if (!session) {
                throw new Error("This should never happen: failed to deserialize session");
            }
            const retVal = await session.assertClaims(
                req.body.claimValidators.map(deserializeValidator),
                req.body.userContext
            ); // : Promise<void>;
            res.json({ retVal, updatedSession: serializeResponseSession(session) });

            logOverrideEvent("sessionobject.assertclaims", "RES", retVal);
        } catch (e) {
            logOverrideEvent("sessionobject.assertclaims", "REJ", e);
            next(e);
        }
    })
    .post("/sessionobject/fetchandsetclaim", async (req, res, next) => {
        logDebugMessage("Session.sessionobject.fetchandsetclaim %j", req.body);
        logOverrideEvent("sessionobject.fetchandsetclaim", "CALL", req.body);
        try {
            const session = await convertRequestSessionToSessionObject(req.body.session);
            if (!session) {
                throw new Error("This should never happen: failed to deserialize session");
            }

            const retVal = await session.fetchAndSetClaim(deserializeClaim(req.body.claim), req.body.userContext); // : Promise<void>;
            res.json({ retVal, updatedSession: serializeResponseSession(session) });

            logOverrideEvent("sessionobject.fetchandsetclaim", "RES", retVal);
        } catch (e) {
            logOverrideEvent("sessionobject.fetchandsetclaim", "REJ", e);
            next(e);
        }
    })
    .post("/sessionobject/setclaimvalue", async (req, res, next) => {
        logDebugMessage("Session.sessionobject.setclaimvalue %j", req.body);
        logOverrideEvent("sessionobject.setclaimvalue", "CALL", req.body);
        try {
            const session = await convertRequestSessionToSessionObject(req.body.session);
            if (!session) {
                throw new Error("This should never happen: failed to deserialize session");
            }
            const retVal = await session.setClaimValue(
                deserializeClaim(req.body.claim),
                req.body.value,
                req.body.userContext
            ); // : Promise<void>;
            res.json({ retVal, updatedSession: serializeResponseSession(session) });

            logOverrideEvent("sessionobject.setclaimvalue", "RES", retVal);
        } catch (e) {
            logOverrideEvent("sessionobject.setclaimvalue", "REJ", e);
            next(e);
        }
    })
    .post("/sessionobject/removeclaim", async (req, res, next) => {
        logDebugMessage("Session.sessionobject.removeClaim %j", req.body);
        logOverrideEvent("sessionobject.removeClaim", "CALL", req.body);
        try {
            const session = await convertRequestSessionToSessionObject(req.body.session);
            if (!session) {
                throw new Error("This should never happen: failed to deserialize session");
            }
            await session.removeClaim(deserializeClaim(req.body.claim), req.body.userContext); // : Promise<void>;
            res.json({ updatedSession: serializeResponseSession(session) });

            logOverrideEvent("sessionobject.removeClaim", "RES", undefined);
        } catch (e) {
            logOverrideEvent("sessionobject.removeClaim", "REJ", e);
            next(e);
        }
    })
    .post("/sessionobject/getclaimvalue", async (req, res, next) => {
        logDebugMessage("Session.sessionobject.getclaimvalue %j", req.body);
        logOverrideEvent("sessionobject.getclaimvalue", "CALL", req.body);
        try {
            const session = await convertRequestSessionToSessionObject(req.body.session);
            if (!session) {
                throw new Error("This should never happen: failed to deserialize session");
            }
            const retVal = await session.getClaimValue(deserializeClaim(req.body.claim), req.body.userContext); // : Promise<void>;
            res.json({ retVal, updatedSession: serializeResponseSession(session) });

            logOverrideEvent("sessionobject.getclaimvalue", "RES", retVal);
        } catch (e) {
            logOverrideEvent("sessionobject.getclaimvalue", "REJ", e);
            next(e);
        }
    })
    .post("/sessionobject/attachtorequestresponse", async (req, res, next) => {
        logDebugMessage("Session.sessionobject.attachtorequestresponse %j", req.body);
        logOverrideEvent("sessionobject.attachtorequestresponse", "CALL", req.body);
        throw new Error("This should never happen: attachToRequestResponse called on remote-test session obj");
    });

export default router;
