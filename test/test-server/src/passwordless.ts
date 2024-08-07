import { Router } from "express";
import SuperTokens from "../../..";
import Passwordless from "../../../recipe/passwordless";
import { convertRequestSessionToSessionObject, serializeRecipeUserId, serializeResponse, serializeUser } from "./utils";
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
                session: req.body.session && (await convertRequestSessionToSessionObject(req.body.session)),
                userContext: req.body.userContext,
            });
            await serializeResponse(req, res, response);
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
                session: req.body.session && (await convertRequestSessionToSessionObject(req.body.session)),
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
                session: req.body.session && (await convertRequestSessionToSessionObject(req.body.session)),
                userContext: req.body.userContext,
            });
            await serializeResponse(req, res, response);
        } catch (e) {
            next(e);
        }
    })
    .post("/updateuser", async (req, res, next) => {
        try {
            logDebugMessage("Passwordless:updateUser %j", req.body);
            const response = await Passwordless.updateUser({
                recipeUserId: SuperTokens.convertToRecipeUserId(req.body.recipeUserId),
                email: req.body.email,
                phoneNumber: req.body.phoneNumber,
                userContext: req.body.userContext,
            });
            await serializeResponse(req, res, response);
        } catch (e) {
            next(e);
        }
    });

export default router;
