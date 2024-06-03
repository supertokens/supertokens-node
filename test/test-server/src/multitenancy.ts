import type { Debugger } from "debug";
import type { Express } from "express";
import Multitenancy from "../../../recipe/multitenancy";
import * as supertokens from "../../../lib/build";

export function setupMultitenancyRoutes(app: Express, log: Debugger) {
    app.post("/test/multitenancy/createorupdatetenant", async (req, res, next) => {
        try {
            log("Multitenancy:createOrUpdateTenant %j", req.body);
            const response = await Multitenancy.createOrUpdateTenant(
                req.body.tenantId,
                req.body.config,
                req.body.userContext
            );
            res.json(response);
        } catch (e) {
            next(e);
        }
    });

    app.post("/test/multitenancy/associateusertotenant", async (req, res, next) => {
        try {
            log("Multitenancy:associateUserToTenant %j", req.body);
            const response = await Multitenancy.associateUserToTenant(
                req.body.tenantId,
                supertokens.convertToRecipeUserId(req.body.recipeUserId),
                req.body.userContext
            );
            res.json(response);
        } catch (e) {
            next(e);
        }
    });
}
