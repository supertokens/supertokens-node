import { Router } from "express";
import EmailPassword from "../../../recipe/emailpassword";
import { convertRequestSessionToSessionObject, serializeRecipeUserId, serializeUser } from "./utils";
import * as supertokens from "../../../lib/build";
import { logger } from "./logger";

const namespace = "com.supertokens:node-test-server:emailpassword";
const { logDebugMessage } = logger(namespace);

const router = Router()
    .post("/signup", async (req, res, next) => {
        try {
            logDebugMessage("EmailPassword:signup %j", req.body);
            let session = req.body.session && (await convertRequestSessionToSessionObject(req.body.session));
            const response = await EmailPassword.signUp(
                req.body.tenantId || "public",
                req.body.email,
                req.body.password,
                session,
                req.body.userContext
            );
            res.json({
                ...response,
                ...serializeUser(response),
                ...serializeRecipeUserId(response),
            });
        } catch (e) {
            next(e);
        }
    })
    .post("/signin", async (req, res, next) => {
        try {
            logDebugMessage("EmailPassword:signin %j", req.body);
            let session = req.body.session && (await convertRequestSessionToSessionObject(req.body.session));
            const response = await EmailPassword.signIn(
                req.body.tenantId || "public",
                req.body.email,
                req.body.password,
                session,
                req.body.userContext
            );
            res.json({
                ...response,
                ...serializeUser(response),
                ...serializeRecipeUserId(response),
            });
        } catch (e) {
            next(e);
        }
    })
    .post("/createresetpasswordlink", async (req, res, next) => {
        try {
            logDebugMessage("EmailPassword:createResetPasswordLink %j", req.body);
            const response = await EmailPassword.createResetPasswordLink(
                req.body.tenantId || "public",
                req.body.userId,
                req.body.email,
                req.body.userContext
            );
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/updateemailorpassword", async (req, res, next) => {
        try {
            logDebugMessage("EmailPassword:updateEmailOrPassword %j", req.body);
            const recipeUserId = supertokens.convertToRecipeUserId(req.body.recipeUserId);
            const response = await EmailPassword.updateEmailOrPassword({
                recipeUserId,
                email: req.body.email,
                password: req.body.password,
                userContext: req.body.userContext,
                applyPasswordPolicy: req.body.applyPasswordPolicy,
                tenantIdForPasswordPolicy: req.body.tenantIdForPasswordPolicy,
            });
            res.json(response);
        } catch (e) {
            next(e);
        }
    });

export default router;
