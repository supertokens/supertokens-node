import { Router } from "express";
import Passwordless from "../../../recipe/passwordless";
import { handleSession } from "./utils";
import { logger } from "./logger";

const namespace = "com.supertokens:node-test-server:passwordless";
const { logDebugMessage } = logger(namespace);

const router = Router()
    .post("/signinup", async (req, res, next) => {
        try {
            logDebugMessage("Passwordless:signInUp %j", req.body);
            const response = await Passwordless.signInUp({
                ...(req.body.email
                    ? {
                          email: req.body.email,
                      }
                    : {
                          phoneNumber: req.body.phoneNumber,
                      }),
                tenantId: req.body.tenantId || "public",
                session: req.body.session && (await handleSession(req.body.session)),
                userContext: req.body.userContext,
            });
            res.json({
                ...response,
                ...("user" in response
                    ? {
                          user: response.user.toJson(),
                      }
                    : {}),
                ...("recipeUserId" in response
                    ? {
                          recipeUserId: response.recipeUserId.getAsString(),
                      }
                    : {}),
            });
        } catch (e) {
            next(e);
        }
    })
    .post("/createcode", async (req, res, next) => {
        try {
            logDebugMessage("Passwordless:createCode %j", req.body);
            const response = await Passwordless.createCode({
                email: req.body.email,
                phoneNumber: req.body.phoneNumber,
                tenantId: req.body.tenantId || "public",
                session: req.body.session && (await handleSession(req.body.session)),
                userContext: req.body.userContext,
                userInputCode: req.body.userInputCode,
            });
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/consumecode", async (req, res, next) => {
        try {
            logDebugMessage("Passwordless:consumeCode %j", req.body);
            const response = await Passwordless.consumeCode({
                deviceId: req.body.deviceId,
                linkCode: req.body.linkCode,
                preAuthSessionId: req.body.preAuthSessionId,
                tenantId: req.body.tenantId || "public",
                userInputCode: req.body.userInputCode,
                session: req.body.session && (await handleSession(req.body.session)),
                userContext: req.body.userContext,
            });
            res.json({
                ...response,
                ...("user" in response ? { user: response.user.toJson() } : {}),
                ...("recipeUserId" in response ? { recipeUserId: response.recipeUserId.getAsString() } : {}),
            });
        } catch (e) {
            next(e);
        }
    });

export default router;
