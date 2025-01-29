import { Router } from "express";
import EmailPassword from "../../../recipe/emailpassword";
import Webauthn from "../../../recipe/webauthn";
import { convertRequestSessionToSessionObject, serializeRecipeUserId, serializeResponse, serializeUser } from "./utils";
import * as supertokens from "../../../lib/build";
import { logger } from "./logger";

const namespace = "com.supertokens:node-test-server:webauthn";
const { logDebugMessage } = logger(namespace);

const router = Router().post("/getgeneratedoptions", async (req, res, next) => {
    try {
        logDebugMessage("Webauthn:getGeneratedOptions %j", req.body);
        const response = await Webauthn.getGeneratedOptions({
            webauthnGeneratedOptionsId: req.body.webauthnGeneratedOptionsId,
            tenantId: req.body.tenantId,
            userContext: req.body.userContext,
        });
        res.json(response);
    } catch (e) {
        next(e);
    }
});

export default router;
