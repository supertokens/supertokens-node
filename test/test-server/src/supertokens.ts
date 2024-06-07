import type { Express } from "express";
import * as supertokens from "../../../lib/build";
import { logger } from "./logger";

const namespace = "com.supertokens:node-test-server:supertokens";
const { logDebugMessage } = logger(namespace);

export function setupSupertokensRoutes(app: Express) {
    app.post("/test/supertokens/getuser", async (req, res, next) => {
        try {
            logDebugMessage("SuperTokens:getUser %j", req.body);
            const response = await supertokens.getUser(req.body.userId, req.body.userContext);
            res.json(response?.toJson());
        } catch (e) {
            next(e);
        }
    });
    app.post("/test/supertokens/deleteuser", async (req, res, next) => {
        try {
            logDebugMessage("SuperTokens:deleteUser %j", req.body);
            const response = await supertokens.deleteUser(
                req.body.userId,
                req.body.removeAllLinkedAccounts,
                req.body.userContext
            );
            res.json(response);
        } catch (e) {
            next(e);
        }
    });
    app.post("/test/supertokens/listusersbyaccountinfo", async (req, res, next) => {
        try {
            logDebugMessage("SuperTokens:listUsersByAccountInfo %j", req.body);
            const response = await supertokens.listUsersByAccountInfo(
                req.body.tenantId,
                req.body.accountInfo,
                req.body.doUnionOfAccountInfo,
                req.body.userContext
            );
            res.json(response);
        } catch (e) {
            next(e);
        }
    });
    app.post("/test/supertokens/getusersnewestfirst", async (req, res, next) => {
        try {
            logDebugMessage("SuperTokens:getUsersNewestFirst %j", req.body);
            const response = await supertokens.getUsersNewestFirst(req.body);
            res.json(response);
        } catch (e) {
            next(e);
        }
    });
}
