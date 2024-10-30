import express from "express";

import OAuth2Provider from "supertokens-node/recipe/oauth2provider";

export const OAuthRouter = express.Router();

OAuthRouter.get("/hello", verifyOAuthAccessTokenUsingST, (req: express.Request, res: express.Response) => {
    res.send("Hello " + (req as any).session.sub);
});

async function verifyOAuthAccessTokenUsingST(req: express.Request, res: express.Response, next: express.NextFunction) {
    let accessToken = req.headers["authorization"]?.replace(/^Bearer /, "");

    if (!accessToken) {
        return next(new Error("No access token provided"));
    }
    try {
        const { payload } = await OAuth2Provider.validateOAuth2AccessToken(accessToken, undefined, false);
        (req as any).session = payload;
        next();
    } catch (err) {
        return next(err);
    }
}
