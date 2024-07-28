import { Router } from "express";
import OAuth2Provider from "../../../recipe/oauth2provider";
import { logger } from "./logger";

const namespace = "com.supertokens:node-test-server:oauth2provider";
const { logDebugMessage } = logger(namespace);

const router = Router()
    .post("/getoauth2clients", async (req, res, next) => {
        try {
            logDebugMessage("OAuth2Provider:getOAuth2Clients %j", req.body);
            const response = await OAuth2Provider.getOAuth2Clients(req.body.input, req.body.userContext);
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/createoauth2client", async (req, res, next) => {
        try {
            logDebugMessage("OAuth2Provider:createOAuth2Client %j", req.body);
            const response = await OAuth2Provider.createOAuth2Client(req.body.input, req.body.userContext);
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/updateoauth2client", async (req, res, next) => {
        try {
            logDebugMessage("OAuth2Provider:updateOAuth2Client %j", req.body);
            const response = await OAuth2Provider.updateOAuth2Client(req.body.input, req.body.userContext);
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/deleteoauth2client", async (req, res, next) => {
        try {
            logDebugMessage("OAuth2Provider:deleteOAuth2Client %j", req.body);
            const response = await OAuth2Provider.deleteOAuth2Client(req.body.input, req.body.userContext);
            res.json(response);
        } catch (e) {
            next(e);
        }
    });

export default router;
