import type { Express } from "express";
import { MultiFactorAuthClaim } from "../../../lib/build/recipe/multifactorauth/multiFactorAuthClaim";
import * as supertokens from "../../../lib/build";
import { logger } from "./logger";

const namespace = "com.supertokens:node-test-server:multifactorauth";
const { logDebugMessage } = logger(namespace);

export function setupMultiFactorAuthRoutes(app: Express) {
    app.post("/test/multifactorauth/multifactorauthclaim.fetchvalue", async (req, res, next) => {
        try {
            logDebugMessage("MultiFactorAuthClaim:fetchValue %j", req.body);
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
