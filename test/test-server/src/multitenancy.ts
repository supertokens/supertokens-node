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
    })
    .post("/gettenant", async (req, res, next) => {
        try {
            logDebugMessage("Multitenancy:getTenant %j", req.body);
            const response = await Multitenancy.getTenant(req.body.tenantId, req.body.userContext);
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/deletetenant", async (req, res, next) => {
        try {
            logDebugMessage("Multitenancy:deleteTenant %j", req.body);
            const response = await Multitenancy.deleteTenant(req.body.tenantId, req.body.userContext);
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .get("/listalltenants", async (req, res, next) => {
        try {
            logDebugMessage("Multitenancy:listAllTenants");
            const response = await Multitenancy.listAllTenants(req.body.userContext);
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/createorupdatethirdpartyconfig", async (req, res, next) => {
        try {
            logDebugMessage("Multitenancy:createOrUpdateThirdPartyConfig %j", req.body);
            const response = await Multitenancy.createOrUpdateThirdPartyConfig(
                req.body.tenantId,
                req.body.config,
                req.body.skipValidation,
                req.body.userContext
            );
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/deletethirdpartyconfig", async (req, res, next) => {
        try {
            logDebugMessage("Multitenancy:deleteThirdPartyConfig %j", req.body);
            const response = await Multitenancy.deleteThirdPartyConfig(
                req.body.tenantId,
                req.body.thirdPartyId,
                req.body.userContext
            );
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/disassociateuserfromtenant", async (req, res, next) => {
        try {
            logDebugMessage("Multitenancy:disassociateUserFromTenant %j", req.body);
            const response = await Multitenancy.disassociateUserFromTenant(
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
