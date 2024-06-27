import { Router } from "express";
import TOTP from "../../../recipe/totp";
import { logger } from "./logger";

const namespace = "com.supertokens:node-test-server:totp";
const { logDebugMessage } = logger(namespace);

const router = Router()
    .post("/createdevice", async (req, res, next) => {
        try {
            logDebugMessage("TOTP.createDevice %j", req.body);
            const response = await TOTP.createDevice(
                req.body.userId,
                req.body.userIdentifierInfo,
                req.body.deviceName,
                req.body.skew,
                req.body.period,
                req.body.userContext
            );
            res.json(response);
        } catch (e) {
            next(e);
        }
    })

    .post("/verifydevice", async (req, res, next) => {
        try {
            logDebugMessage("TOTP.verifyDevice %j", req.body);
            const response = await TOTP.verifyDevice(
                req.body.tenantId,
                req.body.userId,
                req.body.deviceName,
                req.body.totp,
                req.body.userContext
            );
            res.json(response);
        } catch (e) {
            next(e);
        }
    });

export default router;
