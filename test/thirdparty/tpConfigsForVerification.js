const { default: fetch } = require("cross-fetch");

const privateKey =
    "-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgu8gXs+XYkqXD6Ala9Sf/iJXzhbwcoG5dMh1OonpdJUmgCgYIKoZIzj0DAQehRANCAASfrvlFbFCYqn3I2zeknYXLwtH30JuOKestDbSfZYxZNMqhF/OzdZFTV0zc5u5s3eN+oCWbnvl0hM+9IW0UlkdA\n-----END PRIVATE KEY-----";
const configsForVerification = {
    "active-directory": {
        oidcDiscoveryEndpoint: "https://login.microsoftonline.com/97f9a564-fcee-4b88-ae34-a1fbc4656593/v2.0/",
        scope: ["openid", "email"],
        authorizationEndpoint:
            "https://login.microsoftonline.com/97f9a564-fcee-4b88-ae34-a1fbc4656593/oauth2/v2.0/authorize",
        tokenEndpoint: "https://login.microsoftonline.com/97f9a564-fcee-4b88-ae34-a1fbc4656593/oauth2/v2.0/token",
        userInfoEndpoint: "https://graph.microsoft.com/oidc/userinfo",
        jwksURI: "https://login.microsoftonline.com/97f9a564-fcee-4b88-ae34-a1fbc4656593/discovery/v2.0/keys",
        userInfoMap: {
            fromIdTokenPayload: { userId: "sub", email: "email", emailVerified: "email_verified" },
            fromUserInfoAPI: { userId: "sub", email: "email", emailVerified: "email_verified" },
        },
    },
    apple: {
        scope: ["openid", "email"],
        authorizationEndpoint: "https://appleid.apple.com/auth/authorize",
        tokenEndpoint: "https://appleid.apple.com/auth/token",
        jwksURI: "https://appleid.apple.com/auth/keys",
        userInfoMap: {
            fromIdTokenPayload: { userId: "sub", email: "email", emailVerified: "email_verified" },
            fromUserInfoAPI: { userId: "sub", email: "email", emailVerified: "email_verified" },
        },
    },
    bitbucket: {
        authorizationEndpoint: "https://bitbucket.org/site/oauth2/authorize",
        tokenEndpoint: "https://bitbucket.org/site/oauth2/access_token",
        authorizationEndpointQueryParams: { audience: "api.atlassian.com" },
        scope: ["account", "email"],
        userInfoMap: {
            fromIdTokenPayload: { userId: "sub", email: "email", emailVerified: "email_verified" },
            fromUserInfoAPI: { userId: "sub", email: "email", emailVerified: "email_verified" },
        },
    },
    "boxy-saml": {
        additionalConfig: { boxyURL: "https://test.boxy.com:5225" },
        authorizationEndpoint: "https://test.boxy.com:5225/api/oauth/authorize",
        tokenEndpoint: "https://test.boxy.com:5225/api/oauth/token",
        userInfoEndpoint: "https://test.boxy.com:5225/api/oauth/userinfo",
        userInfoMap: {
            fromIdTokenPayload: { userId: "sub", email: "email", emailVerified: "email_verified" },
            fromUserInfoAPI: { userId: "id", email: "email", emailVerified: "email_verified" },
        },
    },
    discord: {
        authorizationEndpoint: "https://discord.com/oauth2/authorize",
        tokenEndpoint: "https://discord.com/api/oauth2/token",
        userInfoEndpoint: "https://discord.com/api/users/@me",
        scope: ["identify", "email"],
        userInfoMap: {
            fromIdTokenPayload: { userId: "sub", email: "email", emailVerified: "email_verified" },
            fromUserInfoAPI: { userId: "id", email: "email", emailVerified: "verified" },
        },
    },
    facebook: {
        authorizationEndpoint: "https://www.facebook.com/v12.0/dialog/oauth",
        tokenEndpoint: "https://graph.facebook.com/v12.0/oauth/access_token",
        userInfoEndpoint: "https://graph.facebook.com/me",
        scope: ["email"],
        userInfoMap: {
            fromIdTokenPayload: { userId: "sub", email: "email", emailVerified: "email_verified" },
            fromUserInfoAPI: { userId: "id", email: "email", emailVerified: "email_verified" },
        },
    },
    github: {
        authorizationEndpoint: "https://github.com/login/oauth/authorize",
        tokenEndpoint: "https://github.com/login/oauth/access_token",
        scope: ["read:user", "user:email"],
        userInfoMap: {
            fromIdTokenPayload: { userId: "sub", email: "email", emailVerified: "email_verified" },
            fromUserInfoAPI: { userId: "sub", email: "email", emailVerified: "email_verified" },
        },
    },
    gitlab: {
        authorizationEndpoint: "https://gitlab.com/oauth/authorize",
        tokenEndpoint: "https://gitlab.com/oauth/token",
        userInfoEndpoint: "https://gitlab.com/oauth/userinfo",
        jwksURI: "https://gitlab.com/oauth/discovery/keys",
        scope: ["openid", "email"],
        userInfoMap: {
            fromIdTokenPayload: { userId: "sub", email: "email", emailVerified: "email_verified" },
            fromUserInfoAPI: { userId: "sub", email: "email", emailVerified: "email_verified" },
        },
    },
    google: {
        authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenEndpoint: "https://oauth2.googleapis.com/token",
        userInfoEndpoint: "https://openidconnect.googleapis.com/v1/userinfo",
        jwksURI: "https://www.googleapis.com/oauth2/v3/certs",
        scope: ["openid", "email"],
        authorizationEndpointQueryParams: { included_grant_scopes: "true", access_type: "offline" },
        userInfoMap: {
            fromIdTokenPayload: { userId: "sub", email: "email", emailVerified: "email_verified" },
            fromUserInfoAPI: { userId: "sub", email: "email", emailVerified: "email_verified" },
        },
    },
    "google-workspaces": {
        authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenEndpoint: "https://oauth2.googleapis.com/token",
        userInfoEndpoint: "https://openidconnect.googleapis.com/v1/userinfo",
        jwksURI: "https://www.googleapis.com/oauth2/v3/certs",
        scope: ["openid", "email"],
        authorizationEndpointQueryParams: { included_grant_scopes: "true", access_type: "offline", hd: "*" },
        userInfoMap: {
            fromIdTokenPayload: { userId: "sub", email: "email", emailVerified: "email_verified" },
            fromUserInfoAPI: { userId: "sub", email: "email", emailVerified: "email_verified" },
        },
        additionalConfig: { hd: "*" },
    },
    linkedin: {
        authorizationEndpoint: "https://www.linkedin.com/oauth/v2/authorization",
        tokenEndpoint: "https://www.linkedin.com/oauth/v2/accessToken",
        scope: ["openid", "profile", "email"],
        userInfoMap: {
            fromIdTokenPayload: { userId: "sub", email: "email", emailVerified: "email_verified" },
            fromUserInfoAPI: { userId: "sub", email: "email", emailVerified: "email_verified" },
        },
    },
    okta: {
        authorizationEndpoint: "https://dev-8636097.okta.com/oauth2/v1/authorize",
        tokenEndpoint: "https://dev-8636097.okta.com/oauth2/v1/token",
        userInfoEndpoint: "https://dev-8636097.okta.com/oauth2/v1/userinfo",
        jwksURI: "https://dev-8636097.okta.com/oauth2/v1/keys",
        scope: ["openid", "email"],
        userInfoMap: {
            fromIdTokenPayload: { userId: "sub", email: "email", emailVerified: "email_verified" },
            fromUserInfoAPI: { userId: "sub", email: "email", emailVerified: "email_verified" },
        },
    },
};
exports.configsForVerification = configsForVerification;
const providers = [
    ...[
        "active-directory",
        "apple",
        "bitbucket",
        "boxy-saml",
        "discord",
        "facebook",
        "github",
        "gitlab",
        "google",
        "google-workspaces",
        "linkedin",
        "okta",
    ].map((thirdPartyId) => {
        let config = {
            thirdPartyId,
            clients: [{ clientId: "test", clientSecret: "secret" }],
        };

        if (thirdPartyId === "active-directory") {
            config.clients[0].additionalConfig = {
                directoryId: "97f9a564-fcee-4b88-ae34-a1fbc4656593",
            };
        } else if (thirdPartyId === "apple") {
            config.clients[0].clientSecret = undefined;
            config.clients[0].additionalConfig = {
                keyId: "test-key",
                privateKey,
                teamId: "test-team-id",
            };
        } else if (thirdPartyId === "boxy-saml") {
            config.clients[0].additionalConfig = {
                boxyURL: "https://test.boxy.com:5225",
            };
        } else if (thirdPartyId === "okta") {
            config.clients[0].additionalConfig = {
                oktaDomain: "dev-8636097.okta.com",
            };
        }

        return { config };
    }),
];
exports.providers = providers;
