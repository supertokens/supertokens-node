import { Router } from "express";
import EmailVerificationRecipe from "../../../lib/build/recipe/emailverification/recipe";
import EmailVerification from "../../../recipe/emailverification";
import * as supertokens from "../../../lib/build";
import { logger } from "./logger";
import { handleSession } from "./utils";

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
            const session = req.body.session && (await handleSession(req.body.session));
            let instance = EmailVerificationRecipe.getInstance();
            if (instance === undefined) {
                throw new Error("No instance of EmailVerificationRecipe found");
            }
            const response = await instance.updateSessionIfRequiredPostEmailVerification({
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

export default router;
