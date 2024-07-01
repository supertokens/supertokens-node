import { Router } from "express";
import { MultiFactorAuthClaim } from "../../../lib/build/recipe/multifactorauth/multiFactorAuthClaim";
import MFARecipe from "../../../lib/build/recipe/multifactorauth/recipe";
import MultiFactorAuth from "../../../recipe/multifactorauth";
import * as supertokens from "../../../";
import { convertRequestSessionToSessionObject } from "./utils";

import { logger } from "./logger";

const namespace = "com.supertokens:node-test-server:multifactorauth";
const { logDebugMessage } = logger(namespace);

const router = Router()
    .post("/multifactorauthclaim.fetchvalue", async (req, res, next) => {
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
    })
    .post("/getfactorssetupforuser", async (req, res, next) => {
        try {
            logDebugMessage("MultiFactorAuthClaim:getFactorsSetupForUser %j", req.body);
            const response = await MultiFactorAuth.getFactorsSetupForUser(req.body.userId, req.body.userContext);
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/assertallowedtosetupfactorelsethowinvalidclaimerror", async (req, res, next) => {
        try {
            logDebugMessage("MultiFactorAuth:assertAllowedToSetupFactorElseThrowInvalidClaimError %j", req.body);
            let session = req.body.session && (await convertRequestSessionToSessionObject(req.body.session));
            await MultiFactorAuth.assertAllowedToSetupFactorElseThrowInvalidClaimError(
                session,
                req.body.factorId,
                req.body.userContext
            );
            res.sendStatus(200);
        } catch (e) {
            next(e);
        }
    })
    .post("/getmfarequirementsforauth", async (req, res, next) => {
        try {
            logDebugMessage("MultiFactorAuth:getMFARequirementsForAuth %j", req.body);
            let session = req.body.session && (await convertRequestSessionToSessionObject(req.body.session));
            const response = await MultiFactorAuth.getMFARequirementsForAuth(session, req.body.userContext);
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/markfactorascompleteinsession", async (req, res, next) => {
        try {
            logDebugMessage("MultiFactorAuth:markFactorAsCompleteInSession %j", req.body);
            let session = req.body.session && (await convertRequestSessionToSessionObject(req.body.session));
            await MultiFactorAuth.markFactorAsCompleteInSession(session, req.body.factorId, req.body.userContext);
            res.sendStatus(200);
        } catch (e) {
            next(e);
        }
    })
    .post("/getrequiredsecondaryfactorsforuser", async (req, res, next) => {
        try {
            logDebugMessage("MultiFactorAuth:getRequiredSecondaryFactorsForUser %j", req.body);
            const response = await MultiFactorAuth.getRequiredSecondaryFactorsForUser(
                req.body.userId,
                req.body.userContext
            );
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/addtorequiredsecondaryfactorsforuser", async (req, res, next) => {
        try {
            logDebugMessage("MultiFactorAuth:addToRequiredSecondaryFactorsForUser %j", req.body);
            await MultiFactorAuth.addToRequiredSecondaryFactorsForUser(
                req.body.userId,
                req.body.factorId,
                req.body.userContext
            );
            res.sendStatus(200);
        } catch (e) {
            next(e);
        }
    })
    .post("/removefromrequiredsecondaryfactorsforuser", async (req, res, next) => {
        try {
            logDebugMessage("MultiFactorAuth:removeFromRequiredSecondaryFactorsForUser %j", req.body);
            await MultiFactorAuth.removeFromRequiredSecondaryFactorsForUser(
                req.body.userId,
                req.body.factorId,
                req.body.userContext
            );
            res.sendStatus(200);
        } catch (e) {
            next(e);
        }
    })
    .post("/recipeimplementation.getmfarequirementsforauth", async (req, res, next) => {
        try {
            logDebugMessage("MultiFactorAuth:recipeImplementation.getMFARequirementsForAuth %j", req.body);
            const response = await MFARecipe.getInstanceOrThrowError().recipeInterfaceImpl.getMFARequirementsForAuth(
                req.body
            );
            res.json(response);
        } catch (e) {
            next(e);
        }
    });

export default router;
