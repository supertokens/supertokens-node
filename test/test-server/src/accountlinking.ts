import { Router } from "express";
import { User } from "../../../lib/build";
import AccountLinkingRecipe from "../../../lib/build/recipe/accountlinking/recipe";
import AccountLinking from "../../../recipe/accountlinking";
import * as supertokens from "../../../lib/build";
import { logger } from "./logger";
import { serializeResponse, serializeUser } from "./utils";

const namespace = "com.supertokens:node-test-server:accountlinking";
const { logDebugMessage } = logger(namespace);

const router = Router()
    .post("/createprimaryuser", async (req, res, next) => {
        try {
            logDebugMessage("AccountLinking:createPrimaryUser %j", req.body);
            const recipeUserId = supertokens.convertToRecipeUserId(req.body.recipeUserId);
            const response = await AccountLinking.createPrimaryUser(recipeUserId, req.body.userContext);
            await serializeResponse(req, res, response);
        } catch (e) {
            next(e);
        }
    })
    .post("/linkaccounts", async (req, res, next) => {
        try {
            logDebugMessage("AccountLinking:linkAccounts %j", req.body);
            const recipeUserId = supertokens.convertToRecipeUserId(req.body.recipeUserId);
            const response = await AccountLinking.linkAccounts(
                recipeUserId,
                req.body.primaryUserId,
                req.body.userContext
            );
            await serializeResponse(req, res, response);
        } catch (e) {
            next(e);
        }
    })
    .post("/isemailchangeallowed", async (req, res, next) => {
        try {
            logDebugMessage("AccountLinking:isEmailChangeAllowed %j", req.body);
            const recipeUserId = supertokens.convertToRecipeUserId(req.body.recipeUserId);
            const response = await AccountLinking.isEmailChangeAllowed(
                recipeUserId,
                req.body.newEmail,
                req.body.isVerified,
                req.body.session,
                req.body.userContext
            );
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/unlinkaccount", async (req, res, next) => {
        try {
            logDebugMessage("AccountLinking:unlinkAccount %j", req.body);
            const recipeUserId = supertokens.convertToRecipeUserId(req.body.recipeUserId);
            const response = await AccountLinking.unlinkAccount(recipeUserId, req.body.userContext);
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/createprimaryuseridorlinkaccounts", async (req, res, next) => {
        try {
            logDebugMessage("AccountLinking:createPrimaryUserIdOrLinkAccounts %j", req.body);
            const recipeUserId = supertokens.convertToRecipeUserId(req.body.recipeUserId);
            const response = await AccountLinking.createPrimaryUserIdOrLinkAccounts(
                req.body.tenantId,
                recipeUserId,
                req.body.session,
                req.body.userContext
            );
            res.json(response.toJson());
        } catch (e) {
            next(e);
        }
    })
    .post("/getprimaryuserthatcanbelinkedtorecipeuserid", async (req, res, next) => {
        try {
            logDebugMessage("AccountLinking:getPrimaryUserThatCanBeLinkedToRecipeUserId %j", req.body);
            const recipeUserId = supertokens.convertToRecipeUserId(req.body.recipeUserId);
            const response = await AccountLinking.getPrimaryUserThatCanBeLinkedToRecipeUserId(
                req.body.tenantId,
                recipeUserId,
                req.body.userContext
            );
            res.json(response?.toJson());
        } catch (e) {
            next(e);
        }
    })
    .post("/issignupallowed", async (req, res, next) => {
        try {
            logDebugMessage("AccountLinking:isSignUpAllowed %j", req.body);
            const response = await AccountLinking.isSignUpAllowed(
                req.body.tenantId,
                req.body.newUser,
                req.body.isVerified,
                req.body.session,
                req.body.userContext
            );
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/issigninallowed", async (req, res, next) => {
        try {
            logDebugMessage("AccountLinking:isSignInAllowed %j", req.body);
            const recipeUserId = supertokens.convertToRecipeUserId(req.body.recipeUserId);
            const response = await AccountLinking.isSignInAllowed(
                req.body.tenantId,
                recipeUserId,
                req.body.session,
                req.body.userContext
            );
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/verifyemailforrecipeuseriflinkedaccountsareverified", async (req, res, next) => {
        try {
            logDebugMessage("AccountLinking:verifyEmailForRecipeUserIfLinkedAccountsAreVerified %j", req.body);
            const recipeUserId = supertokens.convertToRecipeUserId(req.body.recipeUserId);
            const user = new User(req.body.user);
            const response = await AccountLinkingRecipe.getInstance().verifyEmailForRecipeUserIfLinkedAccountsAreVerified(
                {
                    user,
                    recipeUserId,
                    userContext: req.body.userContext,
                }
            );
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/cancreateprimaryuser", async (req, res, next) => {
        try {
            logDebugMessage("AccountLinking:canCreatePrimaryUser %j", req.body);
            const recipeUserId = supertokens.convertToRecipeUserId(req.body.recipeUserId);
            const response = await AccountLinking.canCreatePrimaryUser(recipeUserId, req.body.userContext);
            res.json(response);
        } catch (e) {
            next(e);
        }
    });

export default router;
