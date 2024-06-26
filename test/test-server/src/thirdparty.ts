import { Router } from "express";
import ThirdParty from "../../../recipe/thirdparty";
import { convertRequestSessionToSessionObject, serializeRecipeUserId, serializeUser } from "./utils";
import { logger } from "./logger";

const namespace = "com.supertokens:node-test-server:thirdparty";
const { logDebugMessage } = logger(namespace);

const router = Router().post("/manuallycreateorupdateuser", async (req, res, next) => {
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
        res.json({
            ...response,
            ...serializeUser(response),
            ...serializeRecipeUserId(response),
        });
    } catch (e) {
        next(e);
    }
});

export default router;
