import { Router } from "express";
import EmailVerificationRecipe from "../../../lib/build/recipe/emailverification/recipe";
import EmailVerification from "../../../recipe/emailverification";
import * as supertokens from "../../../lib/build";
import { logger } from "./logger";
import { convertRequestSessionToSessionObject } from "./utils";
import Session from "../../../recipe/session";

const namespace = "com.supertokens:node-test-server:emailverification";
const { logDebugMessage } = logger(namespace);

const router = Router()
    .post("/isemailverified", async (req, res, next) => {
        try {
            logDebugMessage("EmailVerification:isEmailVerified %j", req.body);
            const recipeUserId = supertokens.convertToRecipeUserId(req.body.recipeUserId);
            const response = await EmailVerification.isEmailVerified(
                recipeUserId,
                req.body.email,
                req.body.userContext
            );
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/createemailverificationtoken", async (req, res, next) => {
        try {
            logDebugMessage("EmailVerification:createEmailVerificationToken %j", req.body);
            const recipeUserId = supertokens.convertToRecipeUserId(req.body.recipeUserId);
            const response = await EmailVerification.createEmailVerificationToken(
                req.body.tenantId || "public",
                recipeUserId,
                req.body.email,
                req.body.userContext
            );
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/verifyemailusingtoken", async (req, res, next) => {
        try {
            logDebugMessage("EmailVerification:verifyEmailUsingToken %j", req.body);
            const response = await EmailVerification.verifyEmailUsingToken(
                req.body.tenantId || "public",
                req.body.token,
                req.body.attemptAccountLinking,
                req.body.userContext
            );
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/unverifyemail", async (req, res, next) => {
        try {
            logDebugMessage("EmailVerification:unverifyEmail %j", req.body);
            const recipeUserId = supertokens.convertToRecipeUserId(req.body.recipeUserId);
            const response = await EmailVerification.unverifyEmail(recipeUserId, req.body.email, req.body.userContext);
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/updatesessionifrequiredpostemailverification", async (req, res, next) => {
        try {
            logDebugMessage("EmailVerificationRecipe:updateSessionIfRequiredPostEmailVerification %j", req.body);
            const recipeUserIdWhoseEmailGotVerified = supertokens.convertToRecipeUserId(
                req.body.recipeUserIdWhoseEmailGotVerified.recipeUserId
            );
            const session: Session.SessionContainer | undefined =
                req.body.session && (await convertRequestSessionToSessionObject(req.body.session));
            const response =
                await EmailVerificationRecipe.getInstanceOrThrowError().updateSessionIfRequiredPostEmailVerification({
                    ...req.body,
                    session,
                    recipeUserIdWhoseEmailGotVerified,
                    userContext: req.body.userContext ?? {},
                });
            logDebugMessage(
                "EmailVerificationRecipe:updateSessionIfRequiredPostEmailVerification response %j",
                response
            );
            res.json(response);
        } catch (e) {
            console.error(e);
            // we do not call next(e) here so that the proper error response is sent back to the client
            // otherwise the supertokens error handler will send a different type of response.
            res.status(500).json({ ...e, message: e.message });
        }
    });

export default router;
