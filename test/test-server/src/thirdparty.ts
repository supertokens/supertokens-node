import { Router } from "express";
import ThirdParty from "../../../recipe/thirdparty";
import { convertRequestSessionToSessionObject, serializeRecipeUserId, serializeResponse, serializeUser } from "./utils";
import { logger } from "./logger";

const namespace = "com.supertokens:node-test-server:thirdparty";
const { logDebugMessage } = logger(namespace);

const router = Router()
    .post("/manuallycreateorupdateuser", async (req, res, next) => {
        try {
            logDebugMessage("ThirdParty:manuallyCreateOrUpdateUser %j", req.body);
            let session = req.body.session && (await convertRequestSessionToSessionObject(req.body.session));
            const response = await ThirdParty.manuallyCreateOrUpdateUser(
                req.body.tenantId || "public",
                req.body.thirdPartyId,
                req.body.thirdPartyUserId,
                req.body.email,
                req.body.isVerified,
                session,
                req.body.userContext
            );
            await serializeResponse(req, res, response);
        } catch (e) {
            next(e);
        }
    })
    .post("/getprovider", async (req, res, next) => {
        logDebugMessage("ThirdParty:getProvider %j", req.body);
        let provider = await ThirdParty.getProvider(
            req.body.tenantId || "public",
            req.body.thirdPartyId,
            req.body.clientType,
            req.body.userContext
        );

        if (provider === undefined) {
            await serializeResponse(req, res, {});
            return;
        }

        await serializeResponse(req, res, {
            id: provider.id,
            config: provider.config,
        });
    });

export default router;
