import { Router } from "express";
import Multitenancy from "../../../recipe/multitenancy";
import * as supertokens from "../../../lib/build";
import { logger } from "./logger";

const namespace = "com.supertokens:node-test-server:multitenancy";
const { logDebugMessage } = logger(namespace);

const router = Router()
    .post("/createorupdatetenant", async (req, res, next) => {
        try {
            logDebugMessage("Multitenancy:createOrUpdateTenant %j", req.body);
            const response = await Multitenancy.createOrUpdateTenant(
                req.body.tenantId,
                req.body.config,
                req.body.userContext
            );
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/associateusertotenant", async (req, res, next) => {
        try {
            logDebugMessage("Multitenancy:associateUserToTenant %j", req.body);
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

export default router;
