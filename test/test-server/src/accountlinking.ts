import type { Debugger } from "debug";
import type { Express } from "express";
import { User } from "../../../lib/build";
import AccountLinkingRecipe from "../../../lib/build/recipe/accountlinking/recipe";
import AccountLinking from "../../../recipe/accountlinking";
import * as supertokens from "../../../lib/build";

export function setupAccountlinkingRoutes(app: Express, log: Debugger) {
    app.post("/test/accountlinking/createprimaryuser", async (req, res, next) => {
        try {
            log("AccountLinking:createPrimaryUser %j", req.body);
            const recipeUserId = supertokens.convertToRecipeUserId(req.body.recipeUserId);
            const response = await AccountLinking.createPrimaryUser(recipeUserId, req.body.userContext);
            res.json({ ...response, user: "user" in response ? response.user.toJson() : undefined });
        } catch (e) {
            next(e);
        }
    });

    app.post("/test/accountlinking/linkaccounts", async (req, res, next) => {
        try {
            log("AccountLinking:linkAccounts %j", req.body);
            const recipeUserId = supertokens.convertToRecipeUserId(req.body.recipeUserId);
            const response = await AccountLinking.linkAccounts(
                recipeUserId,
                req.body.primaryUserId,
                req.body.userContext
            );
            res.json({
                ...response,
                ...("user" in response
                    ? {
                          user: response.user.toJson(),
                      }
                    : {}),
            });
        } catch (e) {
            next(e);
        }
    });

    app.post("/test/accountlinking/isemailchangeallowed", async (req, res, next) => {
        try {
            log("AccountLinking:isEmailChangeAllowed %j", req.body);
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
    });

    app.post("/test/accountlinking/unlinkaccount", async (req, res, next) => {
        try {
            log("AccountLinking:unlinkAccount %j", req.body);
            const recipeUserId = supertokens.convertToRecipeUserId(req.body.recipeUserId);
            const response = await AccountLinking.unlinkAccount(recipeUserId, req.body.userContext);
            res.json(response);
        } catch (e) {
            next(e);
        }
    });

    app.post("/test/accountlinking/createprimaryuseridorlinkaccounts", async (req, res, next) => {
        try {
            log("AccountLinking:createPrimaryUserIdOrLinkAccounts %j", req.body);
            const recipeUserId = supertokens.convertToRecipeUserId(req.body.recipeUserId);
            const response = await AccountLinking.createPrimaryUserIdOrLinkAccounts(
                req.body.tenantId,
                recipeUserId,
                req.body.session,
                req.body.userContext
            );
            res.json(response);
        } catch (e) {
            next(e);
        }
    });

    app.post("/test/accountlinking/getprimaryuserthatcanbelinkedtorecipeuserid", async (req, res, next) => {
        try {
            log("AccountLinking:getPrimaryUserThatCanBeLinkedToRecipeUserId %j", req.body);
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
    });

    app.post("/test/accountlinking/issignupallowed", async (req, res, next) => {
        try {
            log("AccountLinking:isSignUpAllowed %j", req.body);
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
    });

    app.post("/test/accountlinking/issigninallowed", async (req, res, next) => {
        try {
            log("AccountLinking:isSignInAllowed %j", req.body);
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
    });

    app.post("/test/accountlinking/verifyemailforrecipeuseriflinkedaccountsareverified", async (req, res, next) => {
        try {
            log("AccountLinking:verifyEmailForRecipeUserIfLinkedAccountsAreVerified %j", req.body);
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
    });

    app.post("/test/accountlinking/cancreateprimaryuser", async (req, res, next) => {
        try {
            log("AccountLinking:canCreatePrimaryUser %j", req.body);
            const recipeUserId = supertokens.convertToRecipeUserId(req.body.recipeUserId);
            const response = await AccountLinking.canCreatePrimaryUser(recipeUserId, req.body.userContext);
            res.json(response);
        } catch (e) {
            next(e);
        }
    });
}
