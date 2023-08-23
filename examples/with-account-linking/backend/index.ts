import express from "express";
import cors from "cors";
import supertokens, { getUser, listUsersByAccountInfo } from "supertokens-node";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import { middleware, errorHandler, SessionRequest } from "supertokens-node/framework/express";
import { getWebsiteDomain, SuperTokensConfig } from "./config";
import EmailVerification from "supertokens-node/recipe/emailverification";
import AccountLinking from "supertokens-node/recipe/accountlinking";
import Session from "supertokens-node/recipe/session";
import ThirdPartyEmailPassword from "supertokens-node/recipe/thirdpartyemailpassword";
import Passwordless from "supertokens-node/recipe/passwordless";

supertokens.init(SuperTokensConfig);

const app = express();

app.use(
    cors({
        origin: getWebsiteDomain(),
        allowedHeaders: ["content-type", ...supertokens.getAllCORSHeaders()],
        methods: ["GET", "PUT", "POST", "DELETE"],
        credentials: true,
    })
);

// This exposes all the APIs from SuperTokens to the client.
app.use(middleware());
app.use(express.json());

// An example API that requires session verification
app.get("/sessioninfo", verifySession(), async (req: SessionRequest, res) => {
    let session = req.session;
    res.send({
        sessionHandle: session!.getHandle(),
        userId: session!.getUserId(),
        accessTokenPayload: session!.getAccessTokenPayload(),
    });
});

app.get("/getUserInfo", verifySession(), async (req: SessionRequest, res) => {
    const session = req.session!;
    const user = await getUser(session.getRecipeUserId().getAsString());
    if (!user) {
        throw new Session.Error({ type: Session.Error.UNAUTHORISED, message: "user removed" });
    }

    res.json({
        user: user.toJson(),
    });
});

app.post("/addPassword", verifySession(), async (req: SessionRequest, res) => {
    const session = req.session!;
    const user = await getUser(session.getRecipeUserId().getAsString());
    if (!user) {
        throw new Session.Error({ type: Session.Error.UNAUTHORISED, message: "user removed" });
    }
    const loginMethod = user.loginMethods.find(
        (m) => m.recipeUserId.getAsString() === session.getRecipeUserId().getAsString()
    );
    if (!loginMethod) {
        throw new Error("This should never happen");
    }

    if (loginMethod.recipeId === "emailpassword") {
        return res.json({
            status: "GENERAL_ERROR",
            message: "This user already has a password associated to it",
        });
    }

    if (!loginMethod.verified) {
        return res.json({
            status: "GENERAL_ERROR",
            message: "You can only add a password when logged in using a verified account",
        });
    }

    // Technically we do not need this limitation
    if (loginMethod.email === undefined) {
        return res.json({
            status: "GENERAL_ERROR",
            message: "You can only add a password when to accounts associated with email addresses",
        });
    }

    let password: string = req.body.formFields.find(({ id }: { id: string }) => id === "password")!.value;

    const signUpResp = await ThirdPartyEmailPassword.emailPasswordSignUp(
        session.getTenantId(),
        loginMethod.email,
        password
    );

    if (signUpResp.status === "EMAIL_ALREADY_EXISTS_ERROR") {
        // This is an edge-case where the current third-party user has an email that has already signed up but not linked for some reason.
        return res.json({
            status: "GENERAL_ERROR",
            message: "This user has already signed up. Please delete it first.",
        });
    }

    if (signUpResp.status !== "OK") {
        return res.json(signUpResp);
    }
    // Here we can assume the user in signUpResp is not a primary user since it was just created
    // Plus the linkAccounts core impl checks anyway
    const newRecipeUserId = signUpResp.user.loginMethods[0].recipeUserId;

    const tokenResp = await EmailVerification.createEmailVerificationToken(
        session.getTenantId(),
        newRecipeUserId,
        loginMethod.email
    );
    if (tokenResp.status === "OK") {
        await EmailVerification.verifyEmailUsingToken(session.getTenantId(), tokenResp.token, false);
    }

    const linkResp = await AccountLinking.linkAccounts(newRecipeUserId, session.getUserId());
    if (linkResp.status !== "OK") {
        return res.json({
            status: "GENERAL_ERROR",
            message: linkResp.status, // TODO: proper string
        });
    }
    // if the access token payload contains any information that'd change based on the new account, we'd want to update it here.

    return res.json({
        status: "OK",
        user: linkResp.user,
    });
});

app.post("/addThirdPartyUser", verifySession(), async (req: SessionRequest, res) => {
    // We need this because several functions below require it
    const userContext = {};
    const session = req.session!;
    const user = await getUser(session.getRecipeUserId().getAsString());
    if (!user) {
        throw new Session.Error({ type: Session.Error.UNAUTHORISED, message: "user removed" });
    }
    const loginMethod = user.loginMethods.find(
        (m) => m.recipeUserId.getAsString() === session.getRecipeUserId().getAsString()
    );
    if (!loginMethod) {
        throw new Error("This should never happen");
    }

    if (!loginMethod.verified) {
        return res.json({
            status: "GENERAL_ERROR",
            message: "You can only add a password when logged in using a verified account",
        });
    }

    const provider = await ThirdPartyEmailPassword.thirdPartyGetProvider(
        session.getTenantId(),
        req.body.thirdPartyId,
        req.body.clientType
    );
    if (provider === undefined) {
        return res.json({
            status: "GENERAL_ERROR",
            message: "Unknown thirdparty provider id/client type",
        });
    }

    let oAuthTokensToUse;
    if ("redirectURIInfo" in req.body && req.body.redirectURIInfo !== undefined) {
        oAuthTokensToUse = await provider.exchangeAuthCodeForOAuthTokens({
            redirectURIInfo: req.body.redirectURIInfo,
            userContext,
        });
    } else if ("oAuthTokens" in req.body && req.body.oAuthTokens !== undefined) {
        oAuthTokensToUse = req.body.oAuthTokens;
    } else {
        throw Error("should never come here");
    }
    const tpUserInfo = await provider.getUserInfo({ oAuthTokens: oAuthTokensToUse, userContext });
    let emailInfo = tpUserInfo.email;
    if (emailInfo === undefined) {
        return res.json({
            status: "NO_EMAIL_GIVEN_BY_PROVIDER",
        });
    }

    // TODO: add explanation comment
    if (!user.emails.includes(emailInfo.id) && !emailInfo.isVerified) {
        return res.json({
            status: "GENERAL_ERROR",
            message: "The email of the third-party account doesn't match the current user and is not verified",
        });
    }
    const signUpResp = await ThirdPartyEmailPassword.thirdPartyManuallyCreateOrUpdateUser(
        session.getTenantId(),
        req.body.thirdPartyId,
        tpUserInfo.thirdPartyUserId,
        emailInfo.id,
        emailInfo.isVerified,
        { doNotLink: true }
    );

    if (signUpResp.status !== "OK") {
        return res.json(signUpResp);
    }

    if (!signUpResp.createdNewRecipeUser) {
        return res.json({
            status: "GENERAL_ERROR",
            message: "This user has already signed up. Please delete it first.",
        });
    }
    // Here we can assume the user in signUpResp is not a primary user since it was just created
    // Plus the linkAccounts core impl checks anyway
    const newRecipeUserId = signUpResp.user.loginMethods[0].recipeUserId;

    const tokenResp = await EmailVerification.createEmailVerificationToken(
        session.getTenantId(),
        newRecipeUserId,
        loginMethod.email
    );
    if (tokenResp.status === "OK") {
        await EmailVerification.verifyEmailUsingToken(session.getTenantId(), tokenResp.token, false);
    }

    const linkResp = await AccountLinking.linkAccounts(newRecipeUserId, session.getUserId());
    if (linkResp.status !== "OK") {
        return res.json({
            status: "GENERAL_ERROR",
            message: linkResp.status, // TODO: proper string
        });
    }
    // if the access token payload contains any information that'd change based on the new account, we'd want to update it here.

    return res.json({
        status: "OK",
        user: linkResp.user,
    });
});

app.post("/addPhoneNumber", verifySession(), async (req: SessionRequest, res) => {
    // We need this because several functions below require it
    const userContext = {};
    const session = req.session!;
    const user = await getUser(session.getRecipeUserId().getAsString());
    if (!user) {
        throw new Session.Error({ type: Session.Error.UNAUTHORISED, message: "user removed" });
    }
    const loginMethod = user.loginMethods.find(
        (m) => m.recipeUserId.getAsString() === session.getRecipeUserId().getAsString()
    );
    if (!loginMethod) {
        throw new Error("This should never happen");
    }

    if (!loginMethod.verified) {
        return res.json({
            status: "GENERAL_ERROR",
            message: "You can only add a phone number when logged in using a verified account",
        });
    }

    const phoneNumber = req.body.phoneNumber;

    const otherUsers = await listUsersByAccountInfo({ tenantId: "public", phoneNumber });
    if (otherUsers.length > 0) {
        return res.json({
            status: "GENERAL_ERROR",
            message: "You can only add a phone number to a single user",
        });
    }

    const signUpResp = await Passwordless.signInUp({
        tenantId: session.getTenantId(),
        phoneNumber,
        userContext: { doNotLink: true },
    });

    if (signUpResp.createdNewRecipeUser === false) {
        // This is possible only in a race-condition where 2 users are adding the same phone number.
        return res.json({
            status: "GENERAL_ERROR",
            message: "You can only add a phone number to a single user",
        });
    }
    const newRecipeUserId = signUpResp.user.loginMethods[0].recipeUserId;

    const linkResp = await AccountLinking.linkAccounts(newRecipeUserId, session.getUserId());
    if (linkResp.status !== "OK") {
        return res.json({
            status: "GENERAL_ERROR",
            message: linkResp.status, // TODO: proper string
        });
    }
    // if the access token payload contains any information that'd change based on the new account, we'd want to update it here.

    return res.json({
        status: "OK",
        user: linkResp.user,
    });
});

// In case of session related errors, this error handler
// returns 401 to the client.
app.use(errorHandler());

app.listen(3001, () => console.log(`API Server listening on port 3001`));
