import { Router } from "express";
import UserMetadata from "../../../recipe/usermetadata";
import { handleSession, serializeRecipeUserId, serializeUser } from "./utils";
import * as supertokens from "../../../lib/build";
import { logger } from "./logger";

const namespace = "com.supertokens:node-test-server:usermetadata";
const { logDebugMessage } = logger(namespace);

const router = Router()
    .post("/getusermetadata", async (req, res, next) => {
        try {
            logDebugMessage("Usermetadata:getusermetadata %j", req.body);
            const response = await UserMetadata.getUserMetadata(req.body.userId, req.body.userContext);
            res.json({
                ...response,
            });
        } catch (e) {
            next(e);
        }
    })
    .post("/updateusermetadata", async (req, res, next) => {
        try {
            logDebugMessage("Usermetadata:updateusermetadata %j", req.body);
            const response = await UserMetadata.updateUserMetadata(
                req.body.userId,
                req.body.metadataUpdate,
                req.body.userContext
            );
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/clearusermetadata", async (req, res, next) => {
        try {
            logDebugMessage("Usermetadata:clearusermetadata %j", req.body);
            const response = await UserMetadata.clearUserMetadata(req.body.userId, req.body.userContext);
            res.json(response);
        } catch (e) {
            next(e);
        }
    });

export default router;
