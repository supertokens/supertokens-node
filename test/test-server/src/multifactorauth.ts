import type { Debugger } from "debug";
import type { Express } from "express";
import { MultiFactorAuthClaim } from "../../../lib/build/recipe/multifactorauth/multiFactorAuthClaim";
import * as supertokens from "../../../lib/build";

export function setupMultiFactorAuthRoutes(app: Express, log: Debugger) {
    app.post("/test/multifactorauth/multifactorauthclaim.fetchvalue", async (req, res, next) => {
        try {
            const response = await MultiFactorAuthClaim.fetchValue(
                req.body._userId,
                supertokens.convertToRecipeUserId(req.body.recipeUserId),
                req.body.tenantId,
                req.body.currentPayload,
                req.body.userContext
            );
            res.json(response);
        } catch (e) {
            next(e);
        }
    });
}
