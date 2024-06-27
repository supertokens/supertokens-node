import { Router } from "express";
import OAuth2 from "../../../recipe/oauth2";
import { logger } from "./logger";

const namespace = "com.supertokens:node-test-server:oauth2";
const { logDebugMessage } = logger(namespace);

const router = Router()
    .post("/getoauth2clients", async (req, res, next) => {
        try {
            logDebugMessage("OAuth2:getOAuth2Clients %j", req.body);
            const response = await OAuth2.getOAuth2Clients(req.body.input, req.body.userContext);
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/createoauth2client", async (req, res, next) => {
        try {
            logDebugMessage("OAuth2:createOAuth2Client %j", req.body);
            const response = await OAuth2.createOAuth2Client(req.body.input, req.body.userContext);
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/updateoauth2client", async (req, res, next) => {
        try {
            logDebugMessage("OAuth2:updateOAuth2Client %j", req.body);
            const response = await OAuth2.updateOAuth2Client(req.body.input, req.body.userContext);
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/deleteoauth2client", async (req, res, next) => {
        try {
            logDebugMessage("OAuth2:deleteOAuth2Client %j", req.body);
            const response = await OAuth2.deleteOAuth2Client(req.body.input, req.body.userContext);
            res.json(response);
        } catch (e) {
            next(e);
        }
    });

export default router;
