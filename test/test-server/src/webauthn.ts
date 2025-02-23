import { Router } from "express";
import EmailPassword from "../../../recipe/emailpassword";
import Webauthn from "../../../recipe/webauthn";
import { convertRequestSessionToSessionObject, serializeRecipeUserId, serializeResponse, serializeUser } from "./utils";
import * as supertokens from "../../../lib/build";
import { logger } from "./logger";

const namespace = "com.supertokens:node-test-server:webauthn";
const { logDebugMessage } = logger(namespace);

const router = Router()
    .post("/registeroptions", async (req, res, next) => {
        try {
            logDebugMessage("Webauthn:registerOptions %j", req.body);
            const response = await Webauthn.registerOptions({
                ...req.body,
            });
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/signinoptions", async (req, res, next) => {
        try {
            logDebugMessage("Webauthn:signInOptions %j", req.body);
            const response = await Webauthn.signInOptions({
                ...req.body,
            });
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/getgeneratedoptions", async (req, res, next) => {
        try {
            logDebugMessage("Webauthn:getGeneratedOptions %j", req.body);
            const response = await Webauthn.getGeneratedOptions({
                ...req.body,
            });
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/signup", async (req, res, next) => {
        try {
            logDebugMessage("Webauthn:signUp %j", req.body);
            const session = await convertRequestSessionToSessionObject(req.body.session);
            const response = await Webauthn.signUp({
                ...req.body,
                session,
            });
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/signin", async (req, res, next) => {
        try {
            logDebugMessage("Webauthn:signIn %j", req.body);
            const session = await convertRequestSessionToSessionObject(req.body.session);
            const response = await Webauthn.signIn({
                ...req.body,
                session,
            });
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/verifycredentials", async (req, res, next) => {
        try {
            logDebugMessage("Webauthn:verifyCredentials %j", req.body);
            const response = await Webauthn.verifyCredentials({
                ...req.body,
            });
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/generaterecoveraccounttoken", async (req, res, next) => {
        try {
            logDebugMessage("Webauthn:generateRecoverAccountToken %j", req.body);
            const response = await Webauthn.generateRecoverAccountToken({
                ...req.body,
            });
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/recoveraccount", async (req, res, next) => {
        try {
            logDebugMessage("Webauthn:recoverAccount %j", req.body);
            const response = await Webauthn.recoverAccount({
                ...req.body,
            });
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/consumerecoveraccounttoken", async (req, res, next) => {
        try {
            logDebugMessage("Webauthn:consumeRecoverAccountToken %j", req.body);
            const response = await Webauthn.consumeRecoverAccountToken({
                ...req.body,
            });
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/registercredential", async (req, res, next) => {
        try {
            logDebugMessage("Webauthn:registerCredential %j", req.body);
            const response = await Webauthn.registerCredential({
                ...req.body,
            });
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/createrecoveraccountlink", async (req, res, next) => {
        try {
            logDebugMessage("Webauthn:createRecoverAccountLink %j", req.body);
            const response = await Webauthn.createRecoverAccountLink({
                ...req.body,
            });
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/sendrecoveraccountemail", async (req, res, next) => {
        try {
            logDebugMessage("Webauthn:sendRecoverAccountEmail %j", req.body);
            const response = await Webauthn.sendRecoverAccountEmail({
                ...req.body,
            });
            res.json(response);
        } catch (e) {
            next(e);
        }
    })
    .post("/sendemail", async (req, res, next) => {
        try {
            logDebugMessage("Webauthn:sendEmail %j", req.body);
            const response = await Webauthn.sendEmail({
                ...req.body,
            });
            res.json(response);
        } catch (e) {
            next(e);
        }
    });

export default router;
