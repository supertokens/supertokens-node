import { Router } from "express";
import EmailPassword from "../../../recipe/emailpassword";
import Webauthn from "../../../recipe/webauthn";
import { convertRequestSessionToSessionObject, serializeRecipeUserId, serializeResponse, serializeUser } from "./utils";
import * as supertokens from "../../../lib/build";
import { logger } from "./logger";

const namespace = "com.supertokens:node-test-server:emailpassword";
const { logDebugMessage } = logger(namespace);

const router = Router().post("/registeroptions", async (req, res, next) => {
    try {
        logDebugMessage("Webauthn:registerOptions %j", req.body);
        const response = await Webauthn.registerOptions(
            req.body.email,
            req.body.recoverAccountToken,
            req.body.relyingPartyId,
            req.body.relyingPartyName,
            req.body.origin,
            req.body.timeout,
            req.body.attestation,
            req.body.tenantId || "public",
            req.body.userContext
        );
        res.json(response);
    } catch (e) {
        next(e);
    }
});

export default router;
