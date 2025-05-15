/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
 *
 * This software is licensed under the Apache License, Version 2.0 (the
 * "License") as published by the Apache Software Foundation.
 *
 * You may not use this file except in compliance with the License. You may
 * obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */
let assert = require("assert");
const { randomUUID } = require("node:crypto");

module.exports.getCoreUrl = () => {
    const host = process.env?.SUPERTOKENS_CORE_HOST ?? "localhost";
    const port = process.env?.SUPERTOKENS_CORE_PORT ?? "3567";

    const coreUrl = `http://${host}:${port}`;

    return coreUrl;
};

module.exports.setupCoreApplication = async function ({ appId, coreConfig } = {}) {
    const coreUrl = module.exports.getCoreUrl();

    if (!appId) {
        appId = randomUUID();
    }

    if (!coreConfig) {
        coreConfig = {};
    }

    const createAppResp = await fetch(`${coreUrl}/recipe/multitenancy/app/v2`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            appId,
            coreConfig,
        }),
    });

    const respBody = await createAppResp.json();
    assert.strictEqual(respBody.status, "OK");

    return `${coreUrl}/appid-${appId}`;
};

module.exports.addLicense = async function () {
    const coreUrl = module.exports.getCoreUrl();

    const OPAQUE_KEY_WITH_ALL_FEATURES_ENABLED =
        "N2yITHflaFS4BPm7n0bnfFCjP4sJoTERmP0J=kXQ5YONtALeGnfOOe2rf2QZ0mfOh0aO3pBqfF-S0jb0ABpat6pySluTpJO6jieD6tzUOR1HrGjJO=50Ob3mHi21tQHJ";

    // TODO: This should be done on the core directly, not in apps
    await fetch(`${coreUrl}/ee/license`, {
        method: "PUT",
        headers: {
            "content-type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
            licenseKey: OPAQUE_KEY_WITH_ALL_FEATURES_ENABLED,
        }),
    });
};

module.exports.removeAppAndTenants = async function (host, port, appId) {
    const tenantsResp = await fetch(`http://${host}:${port}/appid-${appId}/recipe/multitenancy/tenant/list/v2`);
    if (tenantsResp.status === 401) {
        const updateAppResp = await fetch(`http://${host}:${port}/recipe/multitenancy/app/v2`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                appId,
                coreConfig: { api_keys: null },
            }),
        });
        assert.strictEqual(updateAppResp.status, 200);
        await module.exports.removeAppAndTenants(host, port, appId);
    } else if (tenantsResp.status === 200) {
        const tenants = (await tenantsResp.json()).tenants;
        for (const t of tenants) {
            if (t.tenantId !== "public") {
                await fetch(`http://${host}:${port}/appid-${appId}/recipe/multitenancy/tenant/remove`, {
                    method: "POST",
                    headers: {
                        "content-type": "application/json; charset=utf-8",
                    },
                    body: JSON.stringify({
                        tenantId: t.tenantId,
                    }),
                });
            }
        }

        const removeResp = await fetch(`http://${host}:${port}/recipe/multitenancy/app/remove`, {
            method: "POST",
            headers: {
                "content-type": "application/json; charset=utf-8",
            },
            body: JSON.stringify({
                appId,
            }),
        });
        const removeRespBody = await removeResp.json();
        assert.strictEqual(removeRespBody.status, "OK");
    }
};

const WEB_PORT = process.env.WEB_PORT || 3031;
const websiteDomain = `http://localhost:${WEB_PORT}`;
module.exports.mockThirdPartyProvider = {
    config: {
        name: "Mock Provider",
        thirdPartyId: "mock-provider",
        authorizationEndpoint: `${websiteDomain}/mockProvider/auth`,
        tokenEndpoint: `${websiteDomain}/mockProvider/token`,
        clients: [
            {
                clientId: "supertokens",
                clientSecret: "",
            },
        ],
    },
    override: (oI) => ({
        ...oI,
        exchangeAuthCodeForOAuthTokens: ({ redirectURIInfo }) => redirectURIInfo.redirectURIQueryParams,
        getUserInfo: ({ oAuthTokens }) => {
            return {
                thirdPartyUserId: oAuthTokens.userId ?? "user",
                email: {
                    id: oAuthTokens.email ?? "email@test.com",
                    isVerified: oAuthTokens.isVerified !== "false",
                },
                rawUserInfoFromProvider: {},
            };
        },
    }),
};
/**
 *
 * @returns {import("supertokens-node/lib/build/recipe/thirdparty/types").ProviderConfig}
 */
module.exports.customAuth0Provider = () => {
    return {
        config: {
            thirdPartyId: "auth0",
            name: "Auth0",
            // this contains info about forming the authorisation redirect URL without the state params and without the redirect_uri param
            authorizationEndpoint: `https://${process.env.AUTH0_DOMAIN}/authorize`,
            authorizationEndpointQueryParams: {
                scope: "openid profile",
            },
            tokenEndpoint: `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
            clients: [
                {
                    clientId: process.env.AUTH0_CLIENT_ID,
                    clientSecret: process.env.AUTH0_CLIENT_SECRET,
                },
            ],
        },
        override: (oI) => ({
            ...oI,
            getUserInfo: async (accessTokenAPIResponse) => {
                let accessToken = accessTokenAPIResponse.oAuthTokens.access_token;
                if (accessToken === undefined) {
                    throw new Error("access token is undefined");
                }
                // let authHeader = `Bearer ${accessToken}`;
                // let response = await axios({
                //     method: "get",
                //     url: `https://${process.env.AUTH0_DOMAIN}/userinfo`,
                //     headers: {
                //         Authorization: authHeader,
                //     },
                // });
                // let userInfo = response.data;
                return {
                    thirdPartyUserId: "someId",
                    email: {
                        id: "test@example.com",
                        isVerified: true,
                    },
                };
            },
        }),
    };
};

module.exports.maxVersion = function (version1, version2) {
    let splittedv1 = version1.split(".");
    let splittedv2 = version2.split(".");
    let minLength = Math.min(splittedv1.length, splittedv2.length);
    for (let i = 0; i < minLength; i++) {
        let v1 = Number(splittedv1[i]);
        let v2 = Number(splittedv2[i]);
        if (v1 > v2) {
            return version1;
        } else if (v2 > v1) {
            return version2;
        }
    }
    if (splittedv1.length >= splittedv2.length) {
        return version1;
    }
    return version2;
};
