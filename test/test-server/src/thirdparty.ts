import type { Debugger } from "debug";
import type { Express } from "express";
import ThirdParty from "../../../recipe/thirdparty";
import { handleSession } from "./utils";

export function setupThirdPartyRoutes(app: Express, log: Debugger) {
    app.post("/test/thirdparty/manuallycreateorupdateuser", async (req, res, next) => {
        try {
            log("ThirdParty:manuallyCreateOrUpdateUser %j", req.body);
            let session = req.body.session && (await handleSession(req.body.session));
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
                ...("user" in response
                    ? {
                          user: response.user.toJson(),
                      }
                    : {}),
                ...("recipeUserId" in response
                    ? {
                          recipeUserId: response.recipeUserId.getAsString(),
                      }
                    : {}),
            });
        } catch (e) {
            next(e);
        }
    });
}
