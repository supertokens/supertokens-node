import type { Express } from "express";
import EmailVerificationRecipe from "../../../lib/build/recipe/emailverification/recipe";
import SessionClass from "../../../lib/build/recipe/session/sessionClass";
import EmailVerification from "../../../recipe/emailverification";
import * as supertokens from "../../../lib/build";
import { logger } from "./logger";

const namespace = "com.supertokens:node-test-server:emailverification";
const { logDebugMessage } = logger(namespace);

export function setupEmailverificationRoutes(app: Express) {
    app.post("/test/emailverification/isemailverified", async (req, res, next) => {
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
    });

    app.post("/test/emailverification/createemailverificationtoken", async (req, res, next) => {
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
    });

    app.post("/test/emailverification/verifyemailusingtoken", async (req, res, next) => {
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
    });

    app.post("/test/emailverification/unverifyemail", async (req, res, next) => {
        try {
            logDebugMessage("EmailVerification:unverifyEmail %j", req.body);
            const recipeUserId = supertokens.convertToRecipeUserId(req.body.recipeUserId);
            const response = await EmailVerification.unverifyEmail(recipeUserId, req.body.email, req.body.userContext);
            res.json(response);
        } catch (e) {
            next(e);
        }
    });

    app.post("/test/emailverification/updatesessionifrequiredpostemailverification", async (req, res, next) => {
        try {
            logDebugMessage("EmailVerificationRecipe:updateSessionIfRequiredPostEmailVerification %j", req.body);
            const recipeUserIdWhoseEmailGotVerified = supertokens.convertToRecipeUserId(
                req.body.recipeUserIdWhoseEmailGotVerified.recipeUserId || req.body.recipeUserIdWhoseEmailGotVerified
            );
            const sessionRaw = req.body.session;
            const session = sessionRaw
                ? new SessionClass(
                      sessionRaw.helpers,
                      sessionRaw.accessToken,
                      sessionRaw.frontToken,
                      sessionRaw.refreshToken,
                      sessionRaw.antiCsrfToken,
                      sessionRaw.sessionHandle,
                      sessionRaw.userId,
                      supertokens.convertToRecipeUserId(sessionRaw.recipeUserId.recipeUserId),
                      sessionRaw.userDataInAccessToken,
                      sessionRaw.reqResInfo,
                      sessionRaw.accessTokenUpdated,
                      sessionRaw.tenantId
                  )
                : sessionRaw;
            const response = await EmailVerificationRecipe.getInstance()?.updateSessionIfRequiredPostEmailVerification({
                ...req.body,
                session,
                recipeUserIdWhoseEmailGotVerified,
            });
            logDebugMessage(
                "EmailVerificationRecipe:updateSessionIfRequiredPostEmailVerification response %j",
                response
            );
            res.json(response);
        } catch (e) {
            next(e);
        }
    });
}
