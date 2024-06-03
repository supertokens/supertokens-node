import type { Debugger } from "debug";
import type { Express } from "express";
import EmailPassword from "../../../recipe/emailpassword";
import { handleSession } from "./utils";
import * as supertokens from "../../../lib/build";

export function setupEmailpasswordRoutes(app: Express, log: Debugger) {
    app.post("/test/emailpassword/signup", async (req, res, next) => {
        try {
            log("EmailPassword:signup %j", req.body);
            let session = req.body.session && (await handleSession(req.body.session));
            const response = await EmailPassword.signUp(
                req.body.tenantId || "public",
                req.body.email,
                req.body.password,
                session,
                req.body.userContext
            );
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
    });

    app.post("/test/emailpassword/signin", async (req, res, next) => {
        try {
            log("EmailPassword:signin %j", req.body);
            let session = req.body.session && (await handleSession(req.body.session));
            const response = await EmailPassword.signIn(
                req.body.tenantId || "public",
                req.body.email,
                req.body.password,
                session,
                req.body.userContext
            );
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
    });

    app.post("/test/emailpassword/createresetpasswordlink", async (req, res, next) => {
        try {
            log("EmailPassword:createResetPasswordLink %j", req.body);
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
    });

    app.post("/test/emailpassword/updateemailorpassword", async (req, res, next) => {
        try {
            log("EmailPassword:updateEmailOrPassword %j", req.body);
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
}
