import { Router } from "express";
import SAML from "../../../recipe/saml";
import { logger } from "./logger";

const namespace = "com.supertokens:node-test-server:saml";
const { logDebugMessage } = logger(namespace);

const router = Router()
    .post("/createorupdateclient", async (req, res, next) => {
        try {
            logDebugMessage("SAML:createOrUpdateClient %j", req.body);
            const response = await SAML.createOrUpdateClient({
                tenantId: req.body.tenantId || "public",
                clientId: req.body.clientId,
                clientSecret: req.body.clientSecret,
                redirectURIs: req.body.redirectURIs,
                defaultRedirectURI: req.body.defaultRedirectURI,
                metadataXML: req.body.metadataXML,
                allowIDPInitiatedLogin: req.body.allowIDPInitiatedLogin,
                enableRequestSigning: req.body.enableRequestSigning,
                userContext: req.body.userContext,
            });
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/listclients", async (req, res, next) => {
        try {
            logDebugMessage("SAML:listClients %j", req.body);
            const response = await SAML.listClients({
                tenantId: req.body.tenantId || "public",
                userContext: req.body.userContext,
            });
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/removeclient", async (req, res, next) => {
        try {
            logDebugMessage("SAML:removeClient %j", req.body);
            const response = await SAML.removeClient({
                tenantId: req.body.tenantId || "public",
                clientId: req.body.clientId,
                userContext: req.body.userContext,
            });
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/createloginrequest", async (req, res, next) => {
        try {
            logDebugMessage("SAML:createLoginRequest %j", req.body);
            const response = await SAML.createLoginRequest({
                tenantId: req.body.tenantId || "public",
                clientId: req.body.clientId,
                redirectURI: req.body.redirectURI,
                state: req.body.state,
                acsURL: req.body.acsURL,
                userContext: req.body.userContext,
            });
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/verifysamlresponse", async (req, res, next) => {
        try {
            logDebugMessage("SAML:verifySAMLResponse %j", req.body);
            const response = await SAML.verifySAMLResponse({
                tenantId: req.body.tenantId || "public",
                samlResponse: req.body.samlResponse,
                relayState: req.body.relayState,
                userContext: req.body.userContext,
            });
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/getuserinfo", async (req, res, next) => {
        try {
            logDebugMessage("SAML:getUserInfo %j", req.body);
            const response = await SAML.getUserInfo({
                tenantId: req.body.tenantId || "public",
                accessToken: req.body.accessToken,
                clientId: req.body.clientId,
                userContext: req.body.userContext,
            });
            res.json(response);
        } catch (e) {
            next(e);
        }
    });

export default router;
