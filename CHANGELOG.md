# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

## Unreleased

## [23.0.1] - 2025-07-31

-   Updated FDI support to 4.2
-   Added `recipeUserId` in the WebAuthn list credentials response
-   Added `recipeUserId` as required field for registering new WebAuthn credentials endpoint
-   Fix WebAuthn credential listing and removal to work even when the WebAuthn user is not the primary user and when there are multiple WebAuthn users linked
-   Prevent removal of WebAuthn credentials unless all session claims are satisfied
-   Change how sessions are fetched before listing, removing and adding WebAuthn credentials

## [23.0.0] - 2025-07-21

### Breaking changes

-   The `getConsentRequest`, `acceptConsentRequest`, `rejectConsentRequest`, `acceptLoginRequest`, `rejectLoginRequest` and `introspectToken` can now possibly return an `ErrorOAuth2`.
-   The `/oauth/introspect` can now possibly return an `ErrorAuth2`.
-   Removed default defaultMaxAge from all built-in claims/validators. You can optionally set them when adding the validators. This should help with unexpected API calls during session verification.
-   Added register credential endpoint for the WebAuthn recipe

### Refactors/Internal changes

-   Refactors querier to use dynamic request body and response body types inference.
-   Refactor internal network calls made with querier to use the new dynamic types.
-   The `User` class now has a `fromApi` function to normalize the user object returned from the API.
-   Added experimental support for plugins. Please note that the experimental nature of this feature means that we might break the interface in non-major version updates.
-   Refactor the AccountLinking recipe to be automatically initialized on SuperTokens init instead during the first call
-   Upgrade typedoc and the reference docs
-   Add a method for verifying if a recipe is initialized or not

## [22.1.1] - 2025-06-20

-   Migrates backend-sdk-testing test to use a containerized core
    -   Migrates from CircleCI to Github Actions
-   Adds workflow to test supertokens-website
    -   Updates `frontendIntegration` servers
-   Fixes broken workflows (Example Tests, AWS Edge function compatibility)
-   Sets up workflow to run auth-react tests
    -   Updates test-servers to work with updated tests
-   Refactors internal logic of parsing cookies to check accessToken and optimizes it to avoid parsing unrelated cookies.
-   Fixes an issue with fetch not supporting `cache: no-cache` in Cloudflare Workers.

## [22.1.0] - 2025-04-04

-   Adds support for using `code_challenge_method` from OIDC provider response to determine whether to use PKCE or not.
-   Fixes issue with ThirdParty provider info on dashboard

## [22.0.1] - 2025-03-26

-   Added Dashboard support for WebAuthn

## [22.0.0] - 2025-03-19

### Breaking changes

-   Makes URL path normalization case sensitive
    -   Updates `normalise_url_path_or_throw_error` to be case sensitive
    -   URL paths will not be converted to lower-case, and will be kept as-is.
-   Updated CDI supported version from `5.2` to `5.3`
-   Changed `AccountInfo` to `AccountInfoInput` in various methods for better type safety. This is required in order to allow querying by a single WebAuthn `credentialId`, while the WebAuthn login method contains an array of `credentialId`

### Added WebAuthn (Passkeys) Support

-   Added WebAuthn recipe with authentication support:

    -   Registration, sign-in, and credential verification flows
    -   Account recovery functionality

-   Added new API endpoints for WebAuthn operations:

    -   GET `/api/webauthn/email/exists` - Check if email exists in system
    -   POST `/api/webauthn/options/register` - Handle registration options
    -   POST `/api/webauthn/options/signin` - Handle sign-in options
    -   POST `/api/webauthn/signin` - Handle WebAuthn sign-in
    -   POST `/api/webauthn/signup` - Handle WebAuthn sign-up
    -   POST `/api/user/webauthn/reset` - Handle account recovery
    -   POST `/api/user/webauthn/reset/token` - Generate recovery tokens

-   Added WebAuthn support to account linking functionality:

    -   Support for linking users based on WebAuthn `credentialId`
    -   Updated `AccountInfo` type to `AccountInfoInput` with WebAuthn fields
    -   Added `hasSameWebauthnInfoAs` method for credential comparison

-   Updated FDI support to `4.1`

## [21.1.1] - 2025-03-18

-   Fixes an issue where the response body was not being cloned when using cache
-   Fixes type of `cookies` to `string[]` instead of `string` in:
    -   Return type of `authorization` in `RecipeInterface` in `oauth2provider` recipe
    -   Return type of `authGET` in `APIInterface` in `oauth2provider` recipe
    -   Return type of `loginGET` in `APIInterface` in `oauth2provider` recipe

## [21.1.0] - 2024-11-19

-   Adds `getCookieNameForTokenType` config option to allow customizing the cookie name for a token type.
-   Adds `getResponseHeaderNameForTokenType` config option to allow customizing the response header name for a token type.
    -   Please note, that using this will require further customizations on the frontend
-   Fixes an issue where `removeDevice` API allowed removing verified TOTP devices without the user completing MFA.

## [21.0.0] - 2024-10-07

-   Added OAuth2Provider recipe
-   Added a way to run CI on unmerged PRs
-   Added support for FDIs: 3.1 and 4.0. Required by: auth-react >=0.48.0 and web-js>=0.14.0
-   The `networkInterceptor` now also gets a new `params` prop in the request config.
-   Adds `customFramework` util functions to minimize code required in custom frameworks like remix, astro etc.
-   Replicates `fastify` types based on requirement for the SDK instead of using the original module.
-   Improved type definitions for `TypeProvider`

### Breaking change

-   Changes type of value in formField object to be `unknown` instead of `string` to add support for accepting any type of value in form fields.
-   Only supporting CDI 5.2, Compatible with Core version >= 9.3
-   Removed the `overwriteSessionDuringSignInUp` option.
-   Added a new `shouldTryLinkingWithSessionUser` to sign in/up related APIs (and the related recipe functions)
    -   This will default to false on the API
    -   This will be set to true in function calls if you pass a session, otherwise it is set to false
    -   By setting this to true you can enable MFA flows (trying to connect to the session user)
    -   If set to false, the sign-in/up will be considered a first-factor
    -   Changed APIs:
        -   `EmailPassword.signInPOST`
        -   `EmailPassword.signUpPOST`
        -   `ThirdParty.signInUpPOST`
        -   `Passwordless.createCodePOST`
        -   `Passwordless.consumeCodePOST`
        -   `Passwordless.resendCodePOST`
    -   Changed functions:
        -   `EmailPassword.signIn`
        -   `EmailPassword.signUp`
        -   `ThirdParty.signInUp`
        -   `ThirdPary.manuallyCreateOrUpdateUser`
        -   `Passwordless.createCode`
        -   `Passwordless.consumeCode`
-   We no longer try to load the session if `shouldTryLinkingWithSessionUser` is set to false.
-   Changed the return type of `getOpenIdConfiguration` and `getOpenIdDiscoveryConfigurationGET`, and added the following props:
    -   authorization_endpoint
    -   token_endpoint
    -   userinfo_endpoint
    -   revocation_endpoint
    -   token_introspection_endpoint
    -   end_session_endpoint
    -   subject_types_supported
    -   id_token_signing_alg_values_supported
    -   response_types_supported
-   Exposing the OpenId recipe separately and remove it from the Session recipe
    -   This means that we removed `override.openIdFeature` from the Session recipe configuration
-   Removed `getJWKS` from the OpenId recipe, as it is already exposed by the JWT recipe
-   We now automatically initialize the OpenId and JWT recipes even if you do not use the Session recipe
-   `getAppDirRequestHandler` for `nextjs` will no longer accept a Response object.

### Migration

#### Separating the OpenId recipe from Session recipe

If you used to use the `openIdFeature` in the Session recipe, you should now use the OpenId recipe directly instead:

Before:

```tsx
import SuperTokens from "supertokens-node";
import Session from "supertokens-node/recipe/session";

SuperTokens.init({
    appInfo: {
        apiDomain: "...",
        appName: "...",
        websiteDomain: "...",
    },
    recipeList: [
        Session.init({
            override: {
                openIdFeature: {
                    jwtFeature: {
                        functions: originalImplementation => ({
                            ...originalImplementation,
                            getJWKS: async (input) => {
                                console.log("getJWKS called");
                                return originalImplementation.getJWKS(input);
                            },
                        })
                    },
                    functions: originalImplementation => ({
                        ...originalImplementation,
                        getOpenIdDiscoveryConfiguration: async (input) => ({
                            issuer: "your issuer",
                            jwks_uri: "https://your.api.domain/auth/jwt/jwks.json",
                            status: "OK"
                        }),
                    })
                }
            }
        });
    ],
});
```

After:

```tsx
import SuperTokens from "supertokens-node";
import Session from "supertokens-node/recipe/session";
import OpenId from "supertokens-node/recipe/openid";
import JWT from "supertokens-node/recipe/jwt";

SuperTokens.init({
    appInfo: {
        apiDomain: "...",
        appName: "...",
        websiteDomain: "...",
    },
    recipeList: [
        Session.init(),
        JWT.init({
            override: {
                functions: originalImplementation => ({
                    ...originalImplementation,
                    getJWKS: async (input) => {
                        console.log("getJWKS called");
                        return originalImplementation.getJWKS(input);
                    },
                })
            }
        }),
        OpenId.init({
            override: {
                functions: originalImplementation => ({
                    ...originalImplementation,
                    getOpenIdDiscoveryConfiguration: async (input) => ({
                        issuer: "your issuer",
                        jwks_uri: "https://your.api.domain/auth/jwt/jwks.json",
                        status: "OK"
                    }),
                })
            }
        });
    ],
});
```

#### Using updated `getAppDirRequestHandler` for next.js

Before:

```ts
import { getAppDirRequestHandler } from "supertokens-node/nextjs";
import { NextResponse } from "next/server";

const handleCall = getAppDirRequestHandler(NextResponse);
```

After:

```ts
import { getAppDirRequestHandler } from "supertokens-node/nextjs";

const handleCall = getAppDirRequestHandler();
```

## [20.1.5] - 2024-10-09

-   Fixes an issue where users were not able to reset their password if a user with the same email address was created before account linking was enabled.
-   Fixes and re-works some security checks connected to password reset.

## [20.1.4] - 2024-10-07

-   Fixes an issue where revoking sessions for a specific tenant didn't work well
-   Fixes an issue where the automatic session revocation after linking didn't work across all tenants

## [20.1.3] - 2024-09-30

-   Replaces `psl` with `tldts` to avoid `punycode` deprecation warning.

## [20.1.2] - 2024-09-14

-   Fixes formFields to accept non string types as well.

## [20.1.1] - 2024-09-10

-   Fixes an issue with Okta / Active Directory providers where we check for additional config if `oidcDiscoveryEndpoint` is not defined. It would not be necessary in the cases where other endpoints are already provided.

## [20.1.0] - 2024-09-09

-   Add edge compatibility for custom frameworks and Next.JS

## [20.0.5] - 2024-09-02

-   Optional form fields are now truly optional, can be omitted from the payload.

## [20.0.4] - 2024-08-30

-   Improves thirdParty debug logging to help with debugging issues with JSON parsing.

## [20.0.3] - 2024-08-22

-   Fixes issue with dashboard APIs `createOrUpdateThirdPartyConfig` and `deleteThirdPartyConfig` which did not take `includeInNonPublicTenantsByDefault` into account for non-public tenants.
-   Updates test server to support dashboard tests.

## [20.0.2] - 2024-08-08

-   Fixes an issue where `shouldDoAutomaticAccountLinking` was called without a primary user when linking in some cases.

## [20.0.1] - 2024-08-05

-   Fixes an issue with `removeFromPayloadByMerge_internal` for `MultiFactorAuthClaim` where it was not retaining other claims while removing the claim from the payload.
-   Updates testing with backend-sdk-testing repo to run against all supported FDI versions.

## [20.0.0] - 2024-07-24

### Changes

-   Updates `createOrUpdateThirdPartyConfig` and `getThirdPartyConfig` dashboard APIs to handle boxy SAML inputs.
-   Fixes an issue where `isEmailChangeAllowed` was not checking across all tenants

### Breaking changes

-   For a non-public tenant, when there are no providers added in the core, the SDK used to fallback to the providers added in the ThirdParty.init. Now, the SDK will not fallback to the providers added in the ThirdParty.init by default. If you require a thirdparty provider to be available for non-public tenants, you can make it available by setting `includeInNonPublicTenantsByDefault` for each of the providers. See the migration section below to see how to do this. Note that this only affects non-public tenants when there are no providers added in core.

### Migration

To make all the providers added in the ThirdParty.init available for non-public tenants by default,

Before:

```ts
ThirdParty.init({
    signInAndUpFeature: {
        providers: [
            {
                config: {
                    thirdPartyId: "google",
                    // ... rest of the config
                },
            },
            {
                config: {
                    thirdPartyId: "github",
                    // ... rest of the config
                },
            },
        ],
    },
});
```

After:

```ts
ThirdParty.init({
    signInAndUpFeature: {
        providers: [
            {
                config: {
                    thirdPartyId: "google",
                    // ... rest of the config
                },

                // Add the following line to make this provider available in non-public tenants by default
                includeInNonPublicTenantsByDefault: true,
            },
            {
                config: {
                    thirdPartyId: "github",
                    // ... rest of the config
                },

                // Add the following line to make this provider available in non-public tenants by default
                includeInNonPublicTenantsByDefault: true,
            },
        ],
    },
});
```

## [19.0.1] - 2024-07-18

-   Fixes issue in fetching `thirdPartyConfig` for dashboard when OIDC discovery endpoint is added in core.

## [19.0.0] - 2024-07-10

### Breaking changes

-   Defined the entry points of the library using the "exports" field in package.json to make ESM imports more comfortable. This can cause some issues for applications using directory imports from the `lib/build` directory. In those cases we recommend adding `index.js` to the import path.
-   `isEmailChangeAllowed` now returns false for unverified addresses if input user is a primary user and there exists another user with the same email address and linking requires verification
-   Generating a password reset token is now denied if all of the following is true:
    -   a linked email password user exists
    -   the email address is not verified
    -   the user has another email address or phone number associated with it
-   Account linking based on emails now require the email to be verified in both users if `shouldRequireVerification` is set to `true` instead of only requiring it for the recipe user.
-   The access token cookie expiry has been changed from 100 years to 1 year due to some browsers capping the maximum expiry at 400 days. No action is needed on your part.
-   Recipe functions that update the email address of users now call `isEmailChangeAllowed` to check if the email update should be allowed or not.

    -   This only has an effect if account linking is turned on.
    -   This is aimed to help you avoid security issues.
    -   `isEmailChangeAllowed` is now called in functions:
        -   `updateUser` (Passwordless recipe)
        -   `updateEmailOrPassword` (EmailPassword recipe)
        -   `manuallyCreateOrUpdateUser` (ThirdParty recipe)

-   Removes the default `maxAgeInSeconds` value (previously 300 seconds) in EmailVerification Claim. If the claim value is true and `maxAgeInSeconds` is not provided, it will not be refetched.

-   In the multitenancy recipe,

    -   Removes `emailPasswordEnabled`, `passwordlessEnabled`, `thirdPartyEnabled` inputs from `createOrUpdateTenant` functions.
    -   Recipe implementation uses v2 APIs for creating, fetching and listing tenants. Refer CDI spec for more information.

-   SDK will no longer add `.well-known/openid-configuration` to the `oidcDiscoveryEndpoint` config in thirdParty providers. If you have specified any custom `oidcDiscoveryEndpoint` in the ThirdParty.init or added to the core, please make sure to update them to include `.well-known/openid-configuration`.

### Changes

-   Adds Multitenancy and Multifactor auth related APIs for dashboard:
    -   GET `/api/tenants`
    -   GET `/api/tenant`
    -   POST `/api/tenant`
    -   DELETE `/api/tenant`
    -   PUT `/api/tenant/first-factor`
    -   PUT `/api/tenant/required-secondary-factor`
    -   PUT `/api/tenant/core-config`
    -   GET `/api/thirdparty/config`
    -   PUT `/api/thirdparty/config`
    -   DELETE `/api/thirdparty/config`
-   `passwordResetPOST`:
    -   now verifies the email address in all cases if the EmailVerification recipe is initialized
    -   now tries to link accounts based on account info if AccountLinking is enabled
-   Extracted some tests into a separate [backend-sdk-testing](https://github.com/supertokens/backend-sdk-testing/) repo, to reuse tests between our backend SDKs
-   Sends `websiteDomain` and `apiDomain` to core for telemetry.
-   `boxyURL` is no more mandatory input in `additionalConfig` while adding boxy-saml provider in thirdParty.
-   Fixes issue with OIDC discover when the input url already contains `.well-known/openid-configuration`.
-   Removes the default `maxAgeInSeconds` value in EmailVerification Claim when the claim value is true. Now, the SDK won't refetch the claim value if `maxAgeInSeconds` is not provided and claim value is true.
-   Adds `jwksRefreshIntervalSec` config to `session.init` to set the default JWKS cache duration. The default is 4 hours.

### Migration

#### Create or update tenant

If you were using Multitenancy.createOrUpdateTenant, you should remove the `emailPasswordEnabled`, `passwordlessEnabled`, `thirdPartyEnabled` inputs from the function call, and just use the `firstFactors` and `requiredSecondaryFactors` as applicable.

Here are some examples:

1.  Using Emailpassword and ThirdParty login methods

    Before:

    ```ts
    Multitenancy.createOrUpdateTenant("tenantId", {
        emailPasswordEnabled: true,
        thirdPartyEnabled: true,
    });
    ```

    After:

    ```ts
    Multitenancy.createOrUpdateTenant("tenantId", {
        firstFactors: ["emailpassword", "thirdparty"],
    });
    ```

2.  Using Passwordless and ThirdParty login methods. Note that for passwordless, you need to specify all the passwordless factorIds you wish to use.

    Before:

    ```ts
    Multitenancy.createOrUpdateTenant("tenantId", {
        passwordlessEnabled: true,
        thirdPartyEnabled: true,
    });
    ```

    After:

    ```ts
    Multitenancy.createOrUpdateTenant("tenantId", {
        firstFactors: ["otp-email", "otp-phone", "link-email", "link-phone", "thirdparty"],
    });
    ```

3.  Using EmailPassword, ThirdParty for first factor and phone OTP, TOTP for secondary factors

    Before:

    ```ts
    Multitenancy.createOrUpdateTenant("tenantId", {
        emailPasswordEnabled: true,
        thirdPartyEnabled: true,
        passwordlessEnabled: true,
        firstFactors: ["emailpassword", "thirdparty"],
        requiredSecondaryFactors: ["otp-phone", "totp"],
    });
    ```

    After:

    ```ts
    Multitenancy.createOrUpdateTenant("tenantId", {
        firstFactors: ["emailpassword", "thirdparty"],
        requiredSecondaryFactors: ["otp-phone", "totp"],
    });
    ```

4.  Enable everything in core so that SDK can configure the required login methods and required secondary factors

    Before:

    ```ts
    Multitenancy.createOrUpdateTenant("tenantId", {
        emailPasswordEnabled: true,
        thirdPartyEnabled: true,
        passwordlessEnabled: true,
    });
    ```

    After:

    ```ts
    Multitenancy.createOrUpdateTenant("tenantId", {
        firstFactors: null,
        requiredSecondaryFactors: null,
    });
    ```

#### Migrating `oidcDiscoveryEndpoint` in ThirdParty.init:

Before:

```ts
ThirdParty.init({
    signInAndUpFeature: {
        providers: [
            {
                config: {
                    thirdPartyId: "custom",
                    clients: [
                        // ...
                    ],
                    oidcDiscoveryEndpoint: "https://auth.example.com",
                },
            },
        ],
    },
});
```

After:

```ts
ThirdParty.init({
    signInAndUpFeature: {
        providers: [
            {
                config: {
                    thirdPartyId: "custom",
                    clients: [
                        // ...
                    ],
                    oidcDiscoveryEndpoint: "https://auth.example.com/.well-known/openid-configuration",
                },
            },
        ],
    },
});
```

#### Migrating `oidcDiscoveryEndpoint` in core (for custom providers only):

For each tenant, do the following

1.  GET `/appid-<appId>/<tenantId>/recipe/multitenancy/tenant/v2`

    You should see the thirdParty providers in the response using `response.thirdParty.providers`

2.  For each config in providers list, if you have `oidcDiscoveryEndpoint` in the config, update it to include `.well-known/openid-configuration` at the end.

Here's a sample code snippet to update the `oidcDiscoveryEndpoint`:

```ts
import Multitenancy from "supertokens-node/recipe/multitenancy";

const tenantsRes = await Multitenancy.listAllTenants();

function isCustomProvider(thirdPartyId: string): boolean {
    const customProviders = [
        "custom",
        //... all your custom thirdPartyIds
    ];
    return customProviders.includes(thirdPartyId);
}

for (const tenant of tenantsRes.tenants) {
    for (const provider of tenant.thirdParty.providers) {
        if (isCustomProvider(provider.thirdPartyId) && provider.oidcDiscoveryEndpoint !== undefined) {
            if (provider.oidcDiscoveryEndpoint.endsWith("/")) {
                provider.oidcDiscoveryEndpoint = provider.oidcDiscoveryEndpoint.slice(0, -1);
            }
            provider.oidcDiscoveryEndpoint = `${provider.config.oidcDiscoveryEndpoint}/.well-known/openid-configuration`;

            await Multitenancy.createOrUpdateThirdPartyConfig(tenant.tenantId, provider);
        }
    }
}
```

## [18.0.2] - 2024-07-09

-   `refreshPOST` and `refreshSession` now clears all user tokens upon CSRF failures and if no tokens are found. See the latest comment on https://github.com/supertokens/supertokens-node/issues/141 for more details.

## [18.0.2] - 2024-07-09

-   `refreshPOST` and `refreshSession` now clears all user tokens upon CSRF failures and if no tokens are found. See the latest comment on https://github.com/supertokens/supertokens-node/issues/141 for more details.

## [18.0.1] - 2024-06-19

### Fixes

-   Fix a bug that was preventing errors from being caught in the fetch function, thus bypassing our error handling.

## [18.0.0] - 2024-05-23

### Breaking change

-   Removed ThirdPartyEmailPassword and ThirdPartyPasswordless recipes. Instead, you should use ThirdParty + EmailPassword or ThirdParty + Passwordless recipes separately in your recipe list.
-   Removed `rid` query param from:
    -   email verification links
    -   passwordless magic links
    -   password reset links
-   The API for checking if an email exists in the passwordless recipe has changed to return true only if there exists a user with that email as a passwordless user. So for example, earlier, if a user existed with email `test@example.com` as an emailpassword user (and not passwordless user), the passwordless API for does email exist would return true, but now, it won't.

### Changes

-   Even if the `rid` header is present in an API call, the routing now not only depends on that. If the SDK cannot resolve a request handler based on the `rid`, request path and method, it will try to resolve a request handler only based on the request path and method (therefore ignoring the `rid` header).
-   New API handlers are:
    -   `GET /emailpassword/email/exists` => email password, does email exist API (used to be `GET /signup/email/exists` with `rid` of `emailpassword` or `thirdpartyemailpassword` which is now deprecated)
    -   `GET /passwordless/email/exists` => email password, does email exist API (used to be `GET /signup/email/exists` with `rid` of `passwordless` or `thirdpartypasswordless` which is now deprecated)
    -   `GET /passwordless/phonenumber/exists` => email password, does email exist API (used to be `GET /signup/phonenumber/exists` which is now deprecated)
-   Support for FDI 2.0 and 3.0

### Migration guide

-   If you were using `ThirdPartyEmailPassword`, you should now init `ThirdParty` and `EmailPassword` recipes separately. The config for the individual recipes are mostly the same, except the syntax may be different. Check our recipe guides for [ThirdParty](https://supertokens.com/docs/thirdparty/introduction) and [EmailPassword](https://supertokens.com/docs/emailpassword/introduction) for more information.

-   If you were using `ThirdPartyPasswordless`, you should now init `ThirdParty` and `Passwordless` recipes separately. The config for the individual recipes are mostly the same, except the syntax may be different. Check our recipe guides for [ThirdParty](https://supertokens.com/docs/thirdparty/introduction) and [Passwordless](https://supertokens.com/docs/passwordless/introduction) for more information.

### Fixes

-   Fixes override recursion build-up in built-in providers due to the modification of the `input.override` object in the ThirdParty providers list.
-   Fixes issue with reference to `config` object in `TypeProvider` in the provider override. The issue was the `originalImplementation.config` object did not have the updated `config` values that was being used in the provider implementation.

## [17.1.2] - 2024-05-21

### Fixes

-   Add workaround for unsupported 'cache' field in Cloudflare Workers. We retry fetch requests without the 'cache' field if they fail due to it not being implemented.

## [17.1.1] - 2024-05-16

### Fixes

-   Fixed an issue when using Apple as a third party provider with our NextJs integration.
-   Added a compatibility layer into `BaseRequest` to handle the form data parser returning `FormData` instead of the raw parsed object. This is to address/fix the above issues, possibly present in other frameworks.

## [17.1.0] - 2024-04-25

-   Added `olderCookieDomain` config option in the session recipe. This will allow users to clear cookies from the older domain when the `cookieDomain` is changed.
-   If `verifySession` detects multiple access tokens in the request, it will return a 401 error, prompting a refresh, even if one of the tokens is valid.
-   `refreshPOST` (`/auth/session/refresh` by default) API changes:
    -   now returns 500 error if multiple access tokens are present in the request and `config.olderCookieDomain` is not set.
    -   now clears the access token cookie if it was called without a refresh token (if an access token cookie exists and if using cookie-based sessions).
    -   now clears cookies from the old domain if `olderCookieDomain` is specified and multiple refresh/access token cookies exist, without updating the front-token or any of the tokens.
    -   now a 200 response may not include new session tokens.

### Rationale

This update addresses an edge case where changing the `cookieDomain` config on the server can lead to session integrity issues. For instance, if the API server URL is 'api.example.com' with a cookie domain of '.example.com', and the server updates the cookie domain to 'api.example.com', the client may retain cookies with both '.example.com' and 'api.example.com' domains, resulting in multiple sets of session token cookies existing.

Previously, verifySession would select one of the access tokens from the incoming request. If it chose the older cookie, it would return a 401 status code, prompting a refresh request. However, the `refreshPOST` API would then set new session token cookies with the updated `cookieDomain`, but older cookies will persist, leading to repeated 401 errors and refresh loops.

With this update, verifySession will return a 401 error if it detects multiple access tokens in the request, prompting a refresh request. The `refreshPOST` API will clear cookies from the old domain if `olderCookieDomain` is specified in the configuration, then return a 200 status. If `olderCookieDomain` is not configured, the `refreshPOST` API will return a 500 error with a message instructing to set `olderCookieDomain`.

**Example:**

-   `apiDomain`: 'api.example.com'
-   `cookieDomain`: 'api.example.com'

**Flow:**

1. After authentication, the frontend has cookies set with `domain=api.example.com`, but the access token has expired.
2. The server updates `cookieDomain` to `.example.com`.
3. An API call requiring session with an expired access token (cookie with `domain=api.example.com`) results in a 401 response.
4. The frontend attempts to refresh the session, generating a new access token saved with `domain=.example.com`.
5. The original API call is retried, but because it sends both the old and new cookies, it again results in a 401 response.
6. The frontend tries to refresh the session with multiple access tokens: - If `olderCookieDomain` is not set, the refresh fails with a 500 error. - The user remains stuck until they clear cookies manually or `olderCookieDomain` is set. - If `olderCookieDomain` is set, the refresh clears the older cookie, returning a 200 response. - The frontend retries the original API call, sending only the new cookie (`domain=.example.com`), resulting in a successful request.

## [17.0.7] - 2024-05-03

-   Adds `no-cache` header when querying core, so that frameworks like NextJS don't cache GET requests (https://nextjs.org/docs/app/building-your-application/caching#data-cache)

## [17.0.6] - 2024-05-02

-   Fixes how FDI header is parsed from frontend requests to account for more than one version being passed.

## [17.0.5] - 2024-04-25

-   Support for websiteDomain / apiDomain ending with `.local`: https://github.com/supertokens/supertokens-node/issues/823

## [17.0.4] - 2024-04-09

### Changes

-   Improved error message to help debugging if MFA was enabled without account linking.
-   Now the `resyncSessionAndFetchMFAInfoPUT` will throw if the user is in a stuck state, because they are required to complete factors, but they are not allowed to because of some configuration issue.

## [17.0.3] - 2024-04-08

### Fixes

-   Smaller fixes in `Passwordless`:
    -   Fixed an issue in `createCodePOST` where the flowtype wasn't appropriately set in some MFA cases
    -   Fixed an interaction with the `firstFactors` config of the `MultiFactorAuth` recipe in `createCodePOST`
    -   Fixed an issue in `resendCodePOST` where the email/text message included a magic link when it shouldn't have in some MFA cases

## [17.0.2] - 2024-03-20

-   Remove tenants listing dashboard API and update `getTenantLoginMethodsInfo` dashboard API to remove querying core in loop and return only firstFactors.

## [17.0.1] - 2024-03-08

### Changes

-   We now allow sign in/up even if the session user is conflicting with the current sign in/up (because of the email verification status)
    -   This makes use-cases where an secondary factor (i.e.: otp-email) is also used as a means of verification.

## [17.0.0] - 2024-03-08

### Changes

-   Enable smooth switching between `useDynamicAccessTokenSigningKey` settings by allowing refresh calls to change the signing key type of a session
-   Added a core call cache that should reduce traffic to your SuperTokens core instances
-   Refactored sign in/up API codes to reduce code duplication
-   Added MFA related information to dashboard APIs
-   Added a cache to reduce the number of requests made to the core. This can be disabled using the `disableCoreCallCache: true`, in the config.
-   Added new `overwriteSessionDuringSignInUp` configuration option to the Session recipe
-   Added new function: `checkCode` to Passwordless and ThirdPartyPasswordless recipes
-   Added new function: `verifyCredentials` to EmailPassword and ThirdPartyEmailPassword recipes
-   Added the `MultiFactorAuth` and `TOTP` recipes. To start using them you'll need compatible versions:
    -   Core>=8.0.0
    -   supertokens-node>=17.0.0
    -   supertokens-website>=18.0.0
    -   supertokens-web-js>=0.10.0
    -   supertokens-auth-react>=0.39.0

### Breaking changes

-   Now only supporting CDI 5.0. Compatible with core version >= 8.0
-   Account linking now takes the active session into account.
-   Account linking now also happens in sign in function calls (instead of sign ups and sign in API calls)
-   Fixed the typing of the `userContext`:
    -   All functions now take `Record<string, any>` instead of `any` as `userContext`. This means that primitives (strings, numbers) are no longer allowed as `userContext`.
    -   All functions overrides that take a `userContext` parameter now get a well typed `userContext` parameter ensuring that the right object is passed to the original implementation calls
-   Calling sign in/up APIs with a session will now skip creating a new session by default. This is overrideable through by passing `overwriteSessionDuringSignInUp: true` to the Session recipe config.
-   Added new support codes to sign in/up APIs. This means that there are new possible values coming from the default implementation for the `reason` strings of `SIGN_IN_NOT_ALLOWED`, `SIGN_UP_NOT_ALLOWED` and `SIGN_IN_UP_NOT_ALLOWED` responses.
-   `Session` recipe:
    -   The sign out API new returns a 401 instead of 200 in case the input access token has expired or is missing.
-   `AccountLinking` recipe:
    -   Changed the signature of the following functions, each taking a new (optional) `session` parameter:
        -   `createPrimaryUserIdOrLinkAccounts`
        -   `isSignUpAllowed`
        -   `isSignInAllowed`
        -   `isEmailChangeAllowed`
    -   Changed the signature of the `shouldDoAutomaticAccountLinking` callback: it now takes a new (optional) session parameter.
-   `EmailPassword`:
    -   Changed the signature of the following overrideable functions:
        -   `signUp`
            -   Takes a new (optional) `session` parameter
            -   Can now return with `status: "LINKING_TO_SESSION_USER_FAILED"`
        -   `signIn`
            -   Takes a new (optional) `session` parameter
            -   Can now return with `status: "LINKING_TO_SESSION_USER_FAILED"`
    -   Changed the signature of overrideable APIs, adding a new (optional) session parameter:
        -   `signInPOST`
        -   `signUpPOST`
    -   Changed the signature of functions:
        -   `signUp`
            -   Takes a new (optional) `session` parameter
            -   Can now return with `status: "LINKING_TO_SESSION_USER_FAILED"`
        -   `signIn`
            -   Takes a new (optional) `session` parameter
            -   Can now return with `status: "LINKING_TO_SESSION_USER_FAILED"
-   `Multitenancy`:
    -   Changed the signature of the following functions:
        -   `createOrUpdateTenant`: Added optional `firstFactors` and `requiredSecondaryFactors` parameters.
        -   `getTenant`: Added `firstFactors` and `requiredSecondaryFactors` to the return type
        -   `listAllTenants`: Added `firstFactors` and `requiredSecondaryFactors` to the returned tenants
    -   Changed the signature of the following overrideable functions:
        -   `createOrUpdateTenant`: Now gets optional `firstFactors` and `requiredSecondaryFactors` in the input.
        -   `getTenant`: Added `firstFactors` and `requiredSecondaryFactors` to the return type
        -   `listAllTenants`: Added `firstFactors` and `requiredSecondaryFactors` to the returned tenants
    -   Changed the signature of the overrideable apis:
        -   `loginMethodsGET`: Now returns `firstFactors`
-   `Passwordless`:
    -   `revokeCode` (and the related overrideable func) can now be called with either `preAuthSessionId` or `codeId` instead of only `codeId`.
    -   Added new email and sms type for MFA
    -   Changed the signature of the following functions:
        -   `signInUp`, `createCode`: Takes a new (optional) `session` parameter
        -   `consumeCode`:
            -   Takes a new (optional) `session` parameter
            -   Can now return with `status: "LINKING_TO_SESSION_USER_FAILED"`
            -   It now also returns `consumedDevice` if the code was successfully consumed
    -   Changed the signature of the following overrideable functions:
        -   `createCode`: Takes a new (optional) `session` parameter
        -   `consumeCode`:
            -   Takes a new (optional) `session` parameter
            -   Can now return with `status: "LINKING_TO_SESSION_USER_FAILED"`
            -   It now also returns `consumedDevice` if the code was successfully consumed
    -   Changed the signature of overrideable APIs, adding a new (optional) session parameter:
        -   `createCodePOST`
        -   `resendCodePOST`
        -   `consumeCodePOST`
-   Session claims:
    -   The `build` function and the `fetchValue` callback of session claims now take a new `currentPayload` param.
        -   This affects built-in claims: `EmailVerificationClaim`, `UserRoleClaim`, `PermissionClaim`, `AllowedDomainsClaim`.
        -   This will affect all custom claims as well built on our base classes.
-   `ThirdParty`:
    -   Changed the signature of the following functions:
        -   `manuallyCreateOrUpdateUser`:
            -   Takes a new (optional) `session` parameter
            -   Can now return with `status: "LINKING_TO_SESSION_USER_FAILED"`
    -   Changed the signature of the following overrideable functions:
        -   `signInUp`:
            -   Takes a new (optional) `session` parameter
            -   Can now return with `status: "LINKING_TO_SESSION_USER_FAILED"`
        -   `manuallyCreateOrUpdateUser`
            -   Takes a new (optional) `session` parameter
            -   Can now return with `status: "LINKING_TO_SESSION_USER_FAILED"`
    -   Changed the signature of overrideable APIs, adding a new (optional) session parameter:
        -   `signInUpPOST`
-   `ThirdPartyEmailPassword`:
    -   Added new function: `emailPasswordVerifyCredentials`
    -   Changed the signature of the following functions:
        -   `thirdPartyManuallyCreateOrUpdateUser`:
            -   Takes a new (optional) `session` parameter
            -   Can now return with `status: "LINKING_TO_SESSION_USER_FAILED"`
        -   `emailPasswordSignUp`
            -   Takes a new (optional) `session` parameter
            -   Can now return with `status: "LINKING_TO_SESSION_USER_FAILED"`
    -   Changed the signature of the following overrideable functions:
        -   `thirdPartySignInUp`:
            -   Takes a new (optional) `session` parameter
            -   Can now return with `status: "LINKING_TO_SESSION_USER_FAILED"`
        -   `thirdPartyManuallyCreateOrUpdateUser`
            -   Takes a new (optional) `session` parameter
            -   Can now return with `status: "LINKING_TO_SESSION_USER_FAILED"`
        -   `emailPasswordSignUp`
            -   Takes a new (optional) `session` parameter
            -   Can now return with `status: "LINKING_TO_SESSION_USER_FAILED"`
    -   Changed the signature of overrideable APIs, adding a new (optional) session parameter:
        -   `emailPasswordSignInPOST`
        -   `emailPasswordSignUpPOST`
        -   `thirdPartySignInUpPOST`
-   `ThirdPartyPasswordless`:
    -   `revokeCode` (and the related overrideable func) can now be called with either `preAuthSessionId` or `codeId` instead of only `codeId`.
    -   Changed the signature of the following functions:
        -   `thirdPartyManuallyCreateOrUpdateUser`:
            -   Takes a new (optional) `session` parameter
            -   Can now return with `status: "LINKING_TO_SESSION_USER_FAILED"`
        -   `passwordlessSignInUp`, `createCode`: Takes a new (optional) `session` parameter
        -   `consumeCode`:
            -   Takes a new (optional) `session` parameter
            -   Can now return with `status: "LINKING_TO_SESSION_USER_FAILED"`
            -   It now also returns `consumedDevice` if the code was successfully consumed
    -   Changed the signature of the following overrideable functions:
        -   `thirdPartySignInUp`:
            -   Takes a new (optional) `session` parameter
            -   Can now return with `status: "LINKING_TO_SESSION_USER_FAILED"`
        -   `thirdPartyManuallyCreateOrUpdateUser`
            -   Takes a new (optional) `session` parameter
            -   Can now return with `status: "LINKING_TO_SESSION_USER_FAILED"`
        -   `createCode`: Takes a new (optional) `session` parameter
        -   `consumeCode`:
            -   Takes a new (optional) `session` parameter
            -   Can now return with `status: "LINKING_TO_SESSION_USER_FAILED"`
            -   It now also returns `consumedDevice` if the code was successfully consumed
    -   Changed the signature of overrideable APIs, adding a new (optional) session parameter:
        -   `thirdPartySignInUpPOST`
        -   `createCodePOST`
        -   `resendCodePOST`
        -   `consumeCodePOST`

#### Migration guide

##### shouldDoAutomaticAccountLinking signature change

If you use the `userContext` or `tenantId` parameters passed to `shouldDoAutomaticAccountLinking`, please update your implementation to account for the new parameter.

Before:

```ts
AccountLinking.init({
    shouldDoAutomaticAccountLinking: async (newAccountInfo, user, tenantId, userContext) => {
        return {
            shouldAutomaticallyLink: true,
            shouldRequireVerification: true,
        };
    },
});
```

After:

```ts
AccountLinking.init({
    shouldDoAutomaticAccountLinking: async (newAccountInfo, user, session, tenantId, userContext) => {
        return {
            shouldAutomaticallyLink: true,
            shouldRequireVerification: true,
        };
    },
});
```

##### Optional `session` parameter added to public functions

We've added a new optional `session` parameter to many function calls. In all cases, these have been added as the last parameter before `userContext`, so this should only affect you if you are using that. You only need to pass a session as a parameter if you are using account linking and want to try and link the user signing in/up to the session user.
You can get the necessary session object using `verifySession` in an API call.

Here we use the example of `EmailPassword.signIn` but this fits other functions with changed signatures.

Before:

```ts
const signInResp = await EmailPassword.signIn("public", "asdf@asdf.asfd", "testpw", { myContextVar: true });
```

After:

```ts
const signInResp = await EmailPassword.signIn("public", "asdf@asdf.asfd", "testpw", undefined, { myContextVar: true });
```

##### `fetchValue` signature change

If you use the `userContext` parameter passed to `fetchValue`, please update your implementation to account for the new parameter.

Before:

```ts
const boolClaim = new BooleanClaim({
    key: "asdf",
    fetchValue: (userId, recipeUserId, tenantId, userContext) => {
        return userContext.claimValue;
    },
});
```

After:

```ts
const boolClaim = new BooleanClaim({
    key: "asdf",
    fetchValue: (userId, recipeUserId, tenantId, currentPayload, userContext) => {
        return userContext.claimValue;
    },
});
```

##### `build` signature change

If you were using the `build` function for custom or built-in session claims, you should update the call signature to also pass the new parameter.

Before:

```ts
Session.init({
    override: {
        functions: (originalImplementation) => {
            return {
                ...originalImplementation,
                createNewSession: async function (input) {
                    input.accessTokenPayload = {
                        ...input.accessTokenPayload,
                        ...(await UserRoleClaim.build(
                            input.userId,
                            input.recipeUserId,
                            input.tenantId,
                            input.userContext
                        )),
                    };

                    return originalImplementation.createNewSession(input);
                },
            };
        },
    },
});
```

After:

```ts
Session.init({
    override: {
        functions: (originalImplementation) => {
            return {
                ...originalImplementation,
                createNewSession: async function (input) {
                    input.accessTokenPayload = {
                        ...input.accessTokenPayload,
                        ...(await UserRoleClaim.build(
                            input.userId,
                            input.recipeUserId,
                            input.tenantId,
                            input.accessTokenPayload,
                            input.userContext
                        )),
                    };

                    return originalImplementation.createNewSession(input);
                },
            };
        },
    },
});
```

##### Post sign-in/up actions

Since now sign in/up APIs and functions can be called with a session (e.g.: during MFA flows), you may need to add an extra check to your overrides to account for that:

Before:

```ts
// While this example uses Passwordless, all recipes require a very similar change
Passwordless.init({
    contactMethod: "EMAIL", // This example will work with any contactMethod
    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK", // This example will work with any flowType

    override: {
        functions: (originalImplementation) => {
            return {
                ...originalImplementation,
                consumeCode: async (input) => {

                    // First we call the original implementation of consumeCode.
                    let response = await originalImplementation.consumeCode(input);

                    // Post sign up response, we check if it was successful
                    if (response.status === "OK") {
                        if (response.createdNewRecipeUser && response.user.loginMethods.length === 1) {
                            // TODO: post sign up logic
                        } else {
                            // TODO: post sign in logic
                        }
                    }
                    return response;
                }
            }
        }
    }
}),
```

After:

```ts
// While this example uses Passwordless, all recipes require a very similar change
Passwordless.init({
    contactMethod: "EMAIL", // This example will work with any contactMethod
    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK", // This example will work with any flowType

    override: {
        functions: (originalImplementation) => {
            return {
                ...originalImplementation,
                consumeCode: async (input) => {

                    // First we call the original implementation of consumeCode.
                    let response = await originalImplementation.consumeCode(input);

                    // Post sign up response, we check if it was successful
                    if (response.status === "OK") {
                        if (input.session === undefined) {
                            if (response.createdNewRecipeUser && response.user.loginMethods.length === 1) {
                                // TODO: post sign up logic
                            } else {
                                // TODO: post sign in logic
                            }
                        }
                    }
                    return response;
                }
            }
        }
    }
}),
```

##### Sign-in/up linking to the session user

Sign in/up APIs and functions will now attempt to link the authenticating user to the session user if a session is available (depending on AccountLinking settings). You can disable this and get the old behaviour by:

Before:

```ts
// While this example uses Passwordless, all recipes require a very similar change
Passwordless.init({
    contactMethod: "EMAIL", // This example will work with any contactMethod
    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK", // This example will work with any flowType
}),
```

After:

```ts
// While this example uses Passwordless, all recipes require a very similar change
Passwordless.init({
    contactMethod: "EMAIL", // This example will work with any contactMethod
    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK", // This example will work with any flowType

    override: {
        functions: (originalImplementation) => {
            return {
                ...originalImplementation,
                consumeCode: async (input) => {
                    input.session = undefined;
                    return originalImplementation.consumeCode(input);
                }
            }
        }
    }
}),
```

## [16.7.4] - 2024-03-01

-   Adds a user friendly error screen that provides helpful information regarding Content Security Policy (CSP) issues..

## [16.7.3] - 2024-02-26

-   Fixes dashboard URI path. Now it returns the complete user given path instead of just the normalized connectionURI domain.

## [16.7.2] - 2024-02-19

-   `createNewSession` now defaults to the value of the `st-auth-mode` header (if available) if the configured `getTokenTransferMethod` returns `any`.

## [16.7.1] - 2024-01-09

-   Fixes type output of `resetPasswordUsingToken` in emailpassword and thirdpartyemailpassword recipe to not include statuses that happen based on email change.

## [16.7.0] - 2023-12-22

-   Add session util functions `withSession`, `getSSRSession` and `withPreParsedRequestResponse` for Next.js App directory.
-   Previously, the custom framework's `errorHandler` callback function was invoked only upon encountering an error. This behavior has been rectified, and now the callback is invoked in both error and success cases.
-   Added user creation apis on dashboard recipe to create Emailpassword and Passwordless recipe users.

## [16.6.8] - 2023-12-18

-   Fix App dir support by removing the import of the "http" module

## [16.6.7] - 2023-12-18

-   Adds facebook user data by checking the scopes provided in the config

## [16.6.6] - 2023-12-17

-   Adds `userContext` input to the `validate` function in form fields. You can use this to fetch the request object from the `userContext`, read the request body, and then read the other form fields from there. If doing so, keep in mind that for the email and password validators, the request object may not always be available in the `validate` function, and even if it's available, it may not have the request body of the sign up API since the `validate` functions are also called from other operations (like in password reset API). For custom form fields that you have added to the sign up API, the request object will always be there in the `userContext`.
-   Fixes support for the custom framework on node 16 by optionally using an implementation of the Headers class (from `node-fetch`)

## [16.6.5] - 2023-12-12

-   CI/CD changes
-   Fixes connectionURI domain normalisation.

## [16.6.4] - 2023-12-05

-   Fixes typing of `verifySession` adding generic to extend the fastify base request.

## [16.6.3] - 2023-12-05

-   Fixes issue with LinkedIn OAuth ([#751](https://github.com/supertokens/supertokens-node/issues/751))

## [16.6.2] - 2023-12-02

-   Fixes implementation of `getBackwardsCompatibleUserInfo` to not throw an error in case of session and user id mismatch.

## [16.6.1] - 2023-11-29

-   Removed dependency on the `crypto` library to enable Apple OAuth usage in Cloudflare Workers.

## [16.6.0] - 2023-11-23

### Added

-   Added User roles and permissions feature to dashboard recipe.

## [16.5.2] - 2023-11-21

-   Fixes issue with `passwordReset` in emailpassword recipe for custom frameworks ([#746](https://github.com/supertokens/supertokens-node/issues/746))

## [16.5.1] - 2023-11-15

-   Fixes issue with `createResetPasswordLink` and `sendResetPasswordEmail` in thirdpartyemailpassword recipe.

## [16.5.0] - 2023-11-10

-   Added `networkInterceptor` to the `TypeInput` config.
    -   This can be used to capture/modify all the HTTP requests sent to the core.
    -   Closes the issue - https://github.com/supertokens/supertokens-core/issues/865

## [16.4.0] - 2023-10-26

-   Added `debug` property to `TypeInput`. When set to `true`, it will enable debug logs.

## [16.3.4] - 2023-10-22

### Fixes

-   Fixes an issue where sometimes the `Access-Control-Expose-Headers` header value would contain duplicates

## [16.3.3] - 2023-10-19

-   Tests `null` values in `ProviderConfig` saved in core

## [16.3.2] - 2023-10-16

### Fixes

-   `getUsersNewestFirst` and `getUsersOldestFirst` will now properly filter users by tenantId.
-   Fixes issue with missed email verification claim update that caused the frontend pre built UI to call the email verify API multiple times.

## [16.3.1] - 2023-10-12

### Fixes

-   Handle AWS Public URLs (ending with `.amazonaws.com`) separately while extracting TLDs for SameSite attribute.

## [16.3.0] - 2023-10-10

### Added

-   Adds support for configuring multiple frontend domains to be used with the same backend
-   Added a new `origin` property to `appInfo`, this can be configured to be a function which allows you to conditionally return the value of the frontend domain. This property will replace `websiteDomain` in a future release of `supertokens-node`
-   `websiteDomain` inside `appInfo` is now optional. Using `origin` is recommended over using `websiteDomain`. This is not a breaking change and using `websiteDomain` will continue to work
-   Added a "custom" framework you can use in framework normally not supported by our SDK
-   Added a next13 app router compatible request handler.

### Fixed

-   Fixed an issue where calling signinup for thirdparty recipe would result in a "clone is not a function" error

### Changes

-   Using built-in fetch whenever available instead of cross-fetch
-   Improved edge-function support

## [16.2.1] - 2023-10-06

-   Slight refactors logic to code for social providers to make it consistent across all providers

## [16.2.0] - 2023-09-29

### Changes

-   Added `validateAccessToken` to the configuration for social login providers, this function allows you to verify the access token returned by the social provider. If you are using Github as a provider, there is a default implmentation provided for this function.

## [16.1.0] - 2023-09-26

-   Added `twitter` as a built-in thirdparty provider

## [16.0.0] - 2023-09-25

### Overview

#### Introducing account-linking

With this release, we are introducing a new AccountLinking recipe, this will let you:

-   link accounts automatically,
-   implement manual account linking flows.

Check our [guide](https://supertokens.com/docs/thirdpartyemailpassword/common-customizations/account-linking/overview) for more information.

To use this you'll need compatible versions:

-   Core>=7.0.0
-   supertokens-node>=16.0.0 (support is pending in other backend SDKs)
-   supertokens-website>=17.0.3
-   supertokens-web-js>=0.8.0
-   supertokens-auth-react>=0.35.0

#### The new User object and primary vs non-primary users

In this release, we've removed the recipes specific user types and instead introduced a new `User` class to support the "Primary user" concept introduced by account linking

-   The new `User` class now provides the same interface for all recipes.
-   It contains an `isPrimary` field that you can use to differentiate between primary and recipe users
-   The `loginMethods` array contains objects that covers all props of the old (recipe specific) user types, with the exception of the id. Please check the migration section below to get the exact mapping between old and new props.
-   Non-primary users:
    -   The `loginMethods` array should contain exactly 1 element.
    -   `user.id` will be the same as `user.loginMethods[0].recipeUserId.getAsString()`.
    -   `user.id` will change if it is linked to another user.
    -   They can become a primary user if, and only if there are no other primary users with the same email, third party info or phone number as this user across all the tenants that this user is a part of.
-   Primary users
    -   The `loginMethods` array can have 1 or more elements, each corresponding to a single recipe user.
    -   `user.id` will not change even if other users are linked to it.
    -   Other non-primary users can be linked to it. The user ID of the linked accounts will now be the primary users ID.
-   Check [here](https://supertokens.com/docs/thirdpartyemailpassword/common-customizations/account-linking/overview#primary-user-vs-non-primary-user) for more information about differences between primary and recipe users.

#### Primary vs RecipeUserId

Because of account linking we've introduced a new Primary user concept (see above). In most cases, you should only use the primary user id (`user.id` or `session.getUserId()`) if you are associating data to users. Still, in some cases you need to specifically refer to a login method, which is covered by the new `RecipeUserId` class:

-   You can get it:
    -   From a session by: `session.getRecipeUserId()`.
    -   By finding the appropriate entry in the `loginMethods` array of a `User` object (see above): `user.loginMethods[0].recipeUserId`.
-   It wraps a simple string value that you can get by calling `recipeUserId.getAsString()`.
-   We've introduced it to differentiate between primary and recipe user ids in our APIs on a type level.
-   Check [here](https://supertokens.com/docs/thirdpartyemailpassword/user-object#primary-vs-recipe-user-id) for more information.

### Breaking changes

-   Now only supporting CDI 4.0. Compatible with core version >= 7.0
-   Now supporting FDI 1.18
-   Removed the recipe specific `User` type, now all functions are using the new generic `User` type.
    -   Check [here](https://supertokens.com/docs/thirdpartyemailpassword/user-object) for more information.
-   The `build` function and the `fetchValue` callback of session claims now take a new `recipeUserId` param.
    -   This affects built-in claims: `EmailVerificationClaim`, `UserRoleClaim`, `PermissionClaim`, `AllowedDomainsClaim`.
    -   This will affect all custom claims as well built on our base classes.
-   Now ignoring protected props in the payload in `createNewSession` and `createNewSessionWithoutRequestResponse`
-   `createdNewUser` has been renamed to `createdNewRecipeUser` in sign up related APIs and functions

-   EmailPassword:
    -   removed `getUserById`, `getUserByEmail`. You should use `supertokens.getUser`, and `supertokens. listUsersByAccountInfo` instead
    -   added `consumePasswordResetToken`. This function allows the consumption of the reset password token without changing the password. It will return OK if the token was valid.
    -   added an overrideable `createNewRecipeUser` function that is called during sign up and password reset flow (in case a new email password user is being created on the fly). This is mostly for internal use.
    -   `recipeUserId` is added to the input of `getContent` of the email delivery config
    -   `email` was added to the input of `createResetPasswordToken` , `sendResetPasswordEmail`, `createResetPasswordLink`
    -   `updateEmailOrPassword` :
        -   now takes `recipeUserId` instead of `userId`
        -   can return the new `EMAIL_CHANGE_NOT_ALLOWED_ERROR` status
    -   `signIn`:
        -   returns new `recipeUserId` prop in the `status: OK` case
    -   `signUp`:
        -   returns new `recipeUserId` prop in the `status: OK` case
    -   `resetPasswordUsingToken`:
        -   removed from the recipe interface, making it no longer overrideable (directly)
        -   the related function in the index files now call `consumePasswordResetToken` and `updateEmailOrPassword`
        -   any necessary behaviour changes can be achieved by overriding those two function instead
    -   `signInPOST`:
        -   can return status `SIGN_IN_NOT_ALLOWED`
    -   `signUpPOST`:
        -   can return status `SIGN_UP_NOT_ALLOWED`
    -   `generatePasswordResetTokenPOST`:
        -   can now return `PASSWORD_RESET_NOT_ALLOWED`
    -   `passwordResetPOST`:
        -   now returns the `user` and the `email` whose password was reset
        -   can now return `PASSWORD_POLICY_VIOLATED_ERROR`
-   EmailVerification:
    -   `createEmailVerificationToken`, `createEmailVerificationLink`, `isEmailVerified`, `revokeEmailVerificationTokens` , `unverifyEmail`:
        -   now takes `recipeUserId` instead of `userId`
    -   `sendEmailVerificationEmail` :
        -   now takes an additional `recipeUserId` parameter
    -   `verifyEmailUsingToken`:
        -   now takes a new `attemptAccountLinking` parameter
        -   returns the `recipeUserId` instead of `id`
    -   `sendEmail` now requires a new `recipeUserId` as part of the user info
    -   `getEmailForUserId` config option was renamed to `getEmailForRecipeUserId`
    -   `verifyEmailPOST`, `generateEmailVerifyTokenPOST`: returns an optional `newSession` in case the current user session needs to be updated
-   Passwordless:
    -   removed `getUserById`, `getUserByEmail`, `getUserByPhoneNumber`
    -   `updateUser` :
        -   now takes `recipeUserId` instead of `userId`
        -   can return `"EMAIL_CHANGE_NOT_ALLOWED_ERROR` and `PHONE_NUMBER_CHANGE_NOT_ALLOWED_ERROR` statuses
    -   `createCodePOST` and `consumeCodePOST` can now return `SIGN_IN_UP_NOT_ALLOWED`
-   Session:
    -   access tokens and session objects now contain the recipe user id
    -   Support for new access token version
    -   `recipeUserId` is now added to the payload of the `TOKEN_THEFT_DETECTED` error
    -   `createNewSession`: now takes `recipeUserId` instead of `userId`
    -   Removed `validateClaimsInJWTPayload`
    -   `revokeAllSessionsForUser` now takes an optional `revokeSessionsForLinkedAccounts` param
    -   `getAllSessionHandlesForUser` now takes an optional `fetchSessionsForAllLinkedAccounts` param
    -   `regenerateAccessToken` return value now includes `recipeUserId`
    -   `getGlobalClaimValidators` and `validateClaims` now get a new `recipeUserId` param
    -   Added `getRecipeUserId` to the session class
-   ThirdParty:
    -   The `signInUp` override:
        -   gets a new `isVerified` param
        -   can return new status: `SIGN_IN_UP_NOT_ALLOWED`
    -   `manuallyCreateOrUpdateUser`:
        -   gets a new `isVerified` param
        -   can return new statuses: `EMAIL_CHANGE_NOT_ALLOWED_ERROR`, `SIGN_IN_UP_NOT_ALLOWED`
    -   Removed `getUserByThirdPartyInfo`, `getUsersByEmail`, `getUserById`
    -   `signInUpPOST` can now return `SIGN_IN_UP_NOT_ALLOWED`
-   ThirdPartyEmailPassword:
    -   Removed `getUserByThirdPartyInfo`, `getUsersByEmail`, `getUserById`
    -   `thirdPartyManuallyCreateOrUpdateUser`:
        -   now get a new `isVerified` param
        -   can return new statuses: `EMAIL_CHANGE_NOT_ALLOWED_ERROR`, `SIGN_IN_UP_NOT_ALLOWED`
    -   The `thirdPartySignInUp` override:
        -   now get a new `isVerified` param
        -   can return new status: `SIGN_IN_UP_NOT_ALLOWED`
    -   `email` was added to the input of `createResetPasswordToken` , `sendResetPasswordEmail`, `createResetPasswordLink`
    -   added an overrideable `createNewEmailPasswordRecipeUser` function that is called during email password sign up and in the “invitation link” flow
    -   added `consumePasswordResetToken`
    -   `updateEmailOrPassword` :
        -   now takes `recipeUserId` instead of `userId`
        -   can return the new `EMAIL_CHANGE_NOT_ALLOWED_ERROR` status
    -   `resetPasswordUsingToken`:
        -   removed from the recipe interface, making it no longer overrideable (directly)
        -   the related function in the index files now call `consumePasswordResetToken` and `updateEmailOrPassword`
        -   any necessary behaviour changes can be achieved by overriding those two function instead
    -   added an overrideable `createNewEmailPasswordRecipeUser` function that is called during sign up and in the “invitation link” flow
    -   `emailPasswordSignIn`:
        -   returns new `recipeUserId` prop in the `status: OK` case
    -   `emailPasswordSignUp`:
        -   returns new `recipeUserId` prop in the `status: OK` case
    -   `emailPasswordSignInPOST`:
        -   can return status `SIGN_IN_NOT_ALLOWED`
    -   `emailPasswordSignUpPOST`:
        -   can return status `SIGN_UP_NOT_ALLOWED`
    -   `generatePasswordResetTokenPOST`:
        -   can now return `PASSWORD_RESET_NOT_ALLOWED`
    -   `passwordResetPOST`:
        -   now returns the `user` and the `email` whose password was reset
        -   can now return `PASSWORD_POLICY_VIOLATED_ERROR`
    -   `thirdPartySignInUpPOST` can now return `SIGN_IN_UP_NOT_ALLOWED`
-   ThirdPartyPasswordless:
    -   Removed `getUserByThirdPartyInfo`, `getUsersByEmail`, `getUserByPhoneNumber`, `getUserById`
    -   `thirdPartyManuallyCreateOrUpdateUser`:
        -   gets a new `isVerified` param
        -   can return new statuses: `EMAIL_CHANGE_NOT_ALLOWED_ERROR`, `SIGN_IN_UP_NOT_ALLOWED`
    -   The `thirdPartySignInUp` override:
        -   gets a new `isVerified` param
        -   can return new status: `SIGN_IN_UP_NOT_ALLOWED`
    -   `updatePasswordlessUser`:
        -   now takes `recipeUserId` instead of `userId`
        -   can return `"EMAIL_CHANGE_NOT_ALLOWED_ERROR` and `PHONE_NUMBER_CHANGE_NOT_ALLOWED_ERROR` statuses
    -   `thirdPartySignInUpPOST` can now return `SIGN_IN_UP_NOT_ALLOWED`
    -   `createCodePOST` and `consumeCodePOST` can now return `SIGN_IN_UP_NOT_ALLOWED`
-   Multitenancy:
    -   `associateUserToTenant` can now return `ASSOCIATION_NOT_ALLOWED_ERROR`
    -   `associateUserToTenant` and `disassociateUserFromTenant` now take `RecipeUserId` instead of a string user id

### Changes

-   Added `RecipeUserId` and a generic `User` class
-   Added `getUser`, `listUsersByAccountInfo`, `convertToRecipeUserId` to the main exports
-   Updated compilation target of typescript to ES2017 to make debugging easier.
-   Added account-linking recipe

### Migration guide

#### New User structure

We've added a generic `User` class instead of the old recipe specific ones. The mapping of old props to new in case you are not using account-linking:

-   `user.id` stays `user.id` (or `user.loginMethods[0].recipeUserId` in case you need `RecipeUserId`)
-   `user.email` becomes `user.emails[0]`
-   `user.phoneNumber` becomes `user.phoneNumbers[0]`
-   `user.thirdParty` becomes `user.thirdParty[0]`
-   `user.timeJoined` is still `user.timeJoined`
-   `user.tenantIds` is still `user.tenantIds`

#### RecipeUserId

Some functions now require you to pass a `RecipeUserId` instead of a string user id. If you are using our auth recipes, you can find the recipeUserId as: `user.loginMethods[0].recipeUserId` (you'll need to worry about selecting the right login method after enabling account linking). Alternatively, if you already have a string user id you can convert it to a `RecipeUserId` using `supertokens.convertToRecipeUserId(userIdString)`

#### Checking if a user signed up or signed in

-   In the passwordless consumeCode / social login signinup APIs, you can check if a user signed up by:

```
    // Here res refers to the result the function/api functions mentioned above.
    const isNewUser = res.createdNewRecipeUser && res.user.loginMethods.length === 1;
```

-   In the emailpassword sign up API, you can check if a user signed up by:

```
    const isNewUser = res.user.loginMethods.length === 1;
```

#### Changing user emails

-   We recommend that you check if the email change of a user is allowed, before calling the update function
    -   Check [here](https://supertokens.com/docs/thirdpartyemailpassword/common-customizations/change-email-post-login) for more information

```
import {isEmailChangeAllowed} from "supertokens-node/recipe/accountlinking";
/// ...
app.post("/change-email", verifySession(), async (req: SessionRequest, res: express.Response) => {
    let session = req.session!;
    let email = req.body.email;

    // ...
    if (!(await isEmailChangeAllowed(session.getRecipeUserId(), email, false))) {
        // this can come here if you have enabled the account linking feature, and
        // if there is a security risk in changing this user's email.
    }

    // Update the email
    let resp = await ThirdPartyEmailPassword.updateEmailOrPassword({
        recipeUserId: session.getRecipeUserId(),
        email: email,
    });
    // ...
});
```

## [15.2.1] - 2023-09-22

### Fixes

-   Fixes an issue where the response for the JWKs API would contain additional properties

## [15.2.0] - 2023-09-11

### Added

-   The Dashboard recipe now accepts a new `admins` property which can be used to give Dashboard Users write privileges for the user dashboard.

### Changes

-   Dashboard APIs now return a status code `403` for all non-GET requests if the currently logged in Dashboard User is not listed in the `admins` array

## [15.1.1] - 2023-08-14

### Fixes

-   Improve edge function compatibility by removing our `raw-body` dependency.

## [15.1.0] - 2023-08-14

### Changes

-   Added a `Cache-Control` header to `/jwt/jwks.json` (`getJWKSGET`)
-   Added `validityInSeconds` to the return value of the overrideable `getJWKS` function.
    -   This can be used to control the `Cache-Control` header mentioned above.
    -   It defaults to `60` or the value set in the cache-control header returned by the core
    -   This is optional (so you are not required to update your overrides). Returning undefined means that the header is not set.

## [15.0.4] - 2023-08-11

-   Fixes apple redirect

## [15.0.3] - 2023-08-10

-   Adds logic to retry network calls if the core returns status 429

## [15.0.2] - 2023-07-31

-   Fixes an issue where the user management dashboard would incorrectly show an email as unverified even if it was verified

## [15.0.1] - 2023-07-19

-   Passes missing `tenantId` to claim build function

## [15.0.0] - 2023-07-19

### Added

-   Added Multitenancy Recipe & always initialized by default.
-   Adds Multitenancy support to all the recipes
-   Added new Social login providers - LinkedIn
-   Added new Multi-tenant SSO providers - Okta, Active Directory, Boxy SAML
-   All APIs handled by Supertokens middleware can have an optional `tenantId` prefixed in the path. e.g. <basePath>/<tenantId>/signinup
-   Following recipe functions have been added:
    -   `EmailPassword.createResetPasswordLink`
    -   `EmailPassword.sendResetPasswordEmail`
    -   `EmailVerification.createEmailVerificationLink`
    -   `EmailVerification.sendEmailVerificationEmail`
    -   `ThirdParty.getProvider`
    -   `ThirdPartyEmailPassword.thirdPartyGetProvider`
    -   `ThirdPartyEmailPassword.createResetPasswordLink`
    -   `ThirdPartyEmailPassword.sendResetPasswordEmail`
    -   `ThirdPartyPasswordless.thirdPartyGetProvider`
    -   `ThirdPartyPasswordless.createResetPasswordLink`
    -   `ThirdPartyPasswordless.sendResetPasswordEmail`

### Breaking changes

-   Only supporting FDI 1.17
-   Core must be upgraded to 6.0
-   `getUsersOldestFirst` & `getUsersNewestFirst` has mandatory parameter `tenantId`. Pass `'public'` if not using multitenancy.
-   Added mandatory field `tenantId` to `EmailDeliveryInterface` and `SmsDeliveryInterface`. Pass `'public'` if not using multitenancy.
-   Removed deprecated config `createAndSendCustomEmail` and `createAndSendCustomTextMessage`.
-   EmailPassword recipe changes:
    -   Added mandatory `tenantId` field to `TypeEmailPasswordPasswordResetEmailDeliveryInput`
    -   Removed `resetPasswordUsingTokenFeature` from `TypeInput`
    -   Added `tenantId` param to `validate` function in `TypeInputFormField`
    -   Added mandatory `tenantId` as first parameter to the following recipe index functions:
        -   `signUp`
        -   `signIn`
        -   `getUserByEmail`
        -   `createResetPasswordToken`
        -   `resetPasswordUsingToken`
    -   Added mandatory `tenantId` in the input for the following recipe interface functions. If any of these functions are overridden, they need to be updated accordingly:
        -   `signUp`
        -   `signIn`
        -   `getUserByEmail`
        -   `createResetPasswordToken`
        -   `resetPasswordUsingToken`
        -   `updateEmailOrPassword`
    -   Added mandatory `tenantId` in the input for the following API interface functions. If any of these functions are overridden, they need to be updated accordingly:
        -   `emailExistsGET`
        -   `generatePasswordResetTokenPOST`
        -   `passwordResetPOST`
        -   `signInPOST`
        -   `signUpPOST`
-   EmailVerification recipe changes:
    -   Added mandatory `tenantId` field to `TypeEmailVerificationEmailDeliveryInput`
    -   Added mandatory `tenantId` as first parameter to the following recipe index functions:
        -   `createEmailVerificationToken`
        -   `verifyEmailUsingToken`
        -   `revokeEmailVerificationTokens`
    -   Added mandatory `tenantId` in the input for the following recipe interface functions. If any of these functions are overridden, they need to be updated accordingly:
        -   `createEmailVerificationToken`
        -   `verifyEmailUsingToken`
        -   `revokeEmailVerificationTokens`
    -   Added mandatory `tenantId` in the input for the following API interface functions. If any of these functions are overridden, they need to be updated accordingly:
        -   `verifyEmailPOST`
-   Passwordless recipe changes:
    -   Added `tenantId` param to `validateEmailAddress`, `validatePhoneNumber` and `getCustomUserInputCode` functions in `TypeInput`
    -   Added mandatory `tenantId` field to `TypePasswordlessEmailDeliveryInput` and `TypePasswordlessSmsDeliveryInput`
    -   Added mandatory `tenantId` in the input to the following recipe index functions:
        -   `createCode`
        -   `createNewCodeForDevice`
        -   `getUserByEmail`
        -   `getUserByPhoneNumber`
        -   `updateUser`
        -   `revokeCode`
        -   `listCodesByEmail`
        -   `listCodesByPhoneNumber`
        -   `listCodesByDeviceId`
        -   `listCodesByPreAuthSessionId`
        -   `signInUp`
    -   Added mandatory `tenantId` in the input for the following recipe interface functions. If any of these functions are overridden, they need to be updated accordingly:
        -   `createCode`
        -   `createNewCodeForDevice`
        -   `consumeCode`
        -   `getUserByEmail`
        -   `getUserByPhoneNumber`
        -   `revokeAllCodes`
        -   `revokeCode`
        -   `listCodesByEmail`
        -   `listCodesByPhoneNumber`
        -   `listCodesByDeviceId`
        -   `listCodesByPreAuthSessionId`
    -   Added mandatory `tenantId` in the input for the following API interface functions. If any of these functions are overridden, they need to be updated accordingly:
        -   `createCodePOST`
        -   `resendCodePOST`
        -   `consumeCodePOST`
        -   `emailExistsGET`
        -   `phoneNumberExistsGET`
-   ThirdParty recipe changes
    -   The providers array in `signInUpFeature` accepts `[]ProviderInput` instead of `[]TypeProvider`. TypeProvider interface is re-written. Refer migration section for more info.
    -   Removed `signInUp` and added `manuallyCreateOrUpdateUser` instead in the recipe index functions.
    -   Added `manuallyCreateOrUpdateUser` to recipe interface which is being called by the function mentioned above.
        -   `manuallyCreateOrUpdateUser` recipe interface function should not be overridden as it is not going to be called by the SDK in the sign in/up flow.
        -   `signInUp` recipe interface functions is not removed and is being used by the sign in/up flow.
    -   Added mandatory `tenantId` as first parameter to the following recipe index functions:
        -   `getUsersByEmail`
        -   `getUserByThirdPartyInfo`
    -   Added mandatory `tenantId` in the input for the following recipe interface functions. If any of these functions are overridden, they need to be updated accordingly:
        -   `getUsersByEmail`
        -   `getUserByThirdPartyInfo`
        -   `signInUp`
    -   Added mandatory `tenantId` in the input for the following API interface functions. If any of these functions are overridden, they need to be updated accordingly:
        -   `authorisationUrlGET`
        -   `signInUpPOST`
    -   Updated `signInUp` recipe interface function in thirdparty with new parameters:
        -   `oAuthTokens` - contains all the tokens (access_token, id_token, etc.) as returned by the provider
        -   `rawUserInfoFromProvider` - contains all the user profile info as returned by the provider
    -   Updated `authorisationUrlGET` API
        -   Changed: Doesn't accept `clientId` anymore and accepts `clientType` instead to determine the matching config
        -   Added: optional `pkceCodeVerifier` in the response, to support PKCE
    -   Updated `signInUpPOST` API
        -   Removed: `clientId`, `redirectURI`, `authCodeResponse` and `code` from the input
        -   Instead,
            -   accepts `clientType` to determine the matching config
            -   One of redirectURIInfo (for code flow) or oAuthTokens (for token flow) is required
    -   Updated `appleRedirectHandlerPOST`
        -   to accept all the form fields instead of just the code
        -   to use redirect URI encoded in the `state` parameter instead of using the websiteDomain config.
        -   to use HTTP 303 instead of javascript based redirection.
-   Session recipe changes
    -   Added mandatory `tenantId` as first parameter to the following recipe index functions:
        -   `createNewSession`
        -   `createNewSessionWithoutRequestResponse`
        -   `validateClaimsInJWTPayload`
    -   Added mandatory `tenantId` in the input for the following recipe interface functions. If any of these functions are overridden, they need to be updated accordingly:
        -   `createNewSession`
        -   `getGlobalClaimValidators`
    -   Added `tenantId` and `revokeAcrossAllTenants` params to `revokeAllSessionsForUser` in the recipe interface.
    -   Added `tenantId` and `fetchAcrossAllTenants` params to `getAllSessionHandlesForUser` in the recipe interface.
    -   Added `getTenantId` function to `SessionContainerInterface`
    -   Added `tenantId` to `fetchValue` function in `PrimitiveClaim`, `PrimitiveArrayClaim`.
-   UserRoles recipe changes
    -   Added mandatory `tenantId` as first parameter to the following recipe index functions:
        -   `addRoleToUser`
        -   `removeUserRole`
        -   `getRolesForUser`
        -   `getUsersThatHaveRole`
    -   Added mandatory `tenantId` in the input for the following recipe interface functions. If any of these functions are overridden, they need to be updated accordingly:
        -   `addRoleToUser`
        -   `removeUserRole`
        -   `getRolesForUser`
        -   `getRolesForUser`
-   Similar changes in combination recipes (thirdpartyemailpassword and thirdpartypasswordless) have been made
-   Even if thirdpartyemailpassword and thirdpartpasswordless recipes do not have a providers array as an input, they will still expose the third party recipe routes to the frontend.
-   Returns 400 status code in emailpassword APIs if the input email or password are not of type string.

### Changes

-   Recipe function changes:
    -   Added optional `tenantIdForPasswordPolicy` param to `EmailPassword.updateEmailOrPassword`, `ThirdPartyEmailPassword.updateEmailOrPassword`
    -   Added optional param `tenantId` to `Session.revokeAllSessionsForUser`. If tenantId is undefined, sessions are revoked across all tenants
    -   Added optional param `tenantId` to `Session.getAllSessionHandlesForUser`. If tenantId is undefined, sessions handles across all tenants are returned
-   Adds optional param `tenantId` to `getUserCount` which returns total count across all tenants if not passed.
-   Adds protected prop `tId` to the accessToken payload
-   Adds `includesAny` claim validator to `PrimitiveArrayClaim`

### Fixes

-   Fixed an issue where certain Dashboard API routes would return a 404 for Hapi

### Migration

-   To call any recipe function that has `tenantId` added to it, pass `'public`'

    Before:

    ```ts
    EmailPassword.signUp("test@example.com", "password");
    ```

    After:

    ```ts
    EmailPassword.signUp("public", "test@example.com", "password");
    ```

-   Input for provider array change as follows:

    Before:

    ```ts
    let googleProvider = thirdParty.Google({
        clientID: "...",
        clientSecret: "...",
    });
    ```

    After:

    ```ts
    let googleProvider = {
        config: {
            thirdPartyId: "google",
            clients: [{ clientId: "...", clientSecret: "..." }],
        },
    };
    ```

-   Single instance with multiple clients of each provider instead of multiple instances of them. Also use `clientType` to differentiate them. `clientType` passed from the frontend will be used to determine the right config. `isDefault` option has been removed and `clientType` is expected to be passed when there are more than one client. If there is only one client, `clientType` is optional and will be used by default.

    Before:

    ```ts
    let providers = [
        thirdParty.Google({
            isDefault: true,
            clientID: "clientid1",
            clientSecret: "...",
        }),
        thirdParty.Google({
            clientID: "clientid2",
            clientSecret: "...",
        }),
    ];
    ```

    After:

    ```ts
    let providers = [
        {
            config: {
                thirdPartyId: "google",
                clients: [
                    { clientType: "web", clientId: "clientid1", clientSecret: "..." },
                    { clientType: "mobile", clientId: "clientid2", clientSecret: "..." },
                ],
            },
        },
    ];
    ```

-   Change in the implementation of custom providers

    -   All config is part of `ProviderInput`
    -   To provide implementation for `getProfileInfo`
        -   either use `userInfoEndpoint`, `userInfoEndpointQueryParams` and `userInfoMap` to fetch the user info from the provider
        -   or specify custom implementation in an override for `getUserInfo` (override example in the next section)

    Before:

    ```ts
    let customProvider = {
        id: "custom",
        get: (redirectURI, authCodeFromRequest) => {
            return {
                accessTokenAPI: {
                    url: "...",
                    params: {},
                },
                authorisationRedirect: {
                    url: "...",
                    params: {},
                },
                getClientId: () => {
                    return "...";
                },
                getProfileInfo: async (accessTokenAPIResponse) => {
                    return {
                        id: "...",
                        email: {
                            id: "...",
                            isVerified: true,
                        },
                    };
                },
            };
        },
    };
    ```

    After:

    ```ts
    let customProvider = {
        config: {
            thirdPartyId: "custom",
            clients: [
                {
                    clientId: "...",
                    clientSecret: "...",
                },
            ],
            authorizationEndpoint: "...",
            authorizationEndpointQueryParams: {},
            tokenEndpoint: "...",
            tokenEndpointBodyParams: {},
            userInfoEndpoint: "...",
            userInfoEndpointQueryParams: {},
            userInfoMap: {
                fromUserInfoAPI: {
                    userId: "id",
                    email: "email",
                    emailVerified: "email_verified",
                },
            },
        },
    };
    ```

    Also, if the custom provider supports openid, it can automatically discover the endpoints

    ```ts
    let customProvider = {
        config: {
            thirdPartyId: "custom",
            clients: [
                {
                    clientId: "...",
                    clientSecret: "...",
                },
            ],
            oidcDiscoveryEndpoint: "...",
            userInfoMap: {
                fromUserInfoAPI: {
                    userId: "id",
                    email: "email",
                    emailVerified: "email_verified",
                },
            },
        },
    };
    ```

    Note: The SDK will fetch the oauth2 endpoints from the provider's OIDC discovery endpoint. No need to `/.well-known/openid-configuration` to the `oidcDiscoveryEndpoint` config. For eg. if `oidcDiscoveryEndpoint` is set to `"https://accounts.google.com/"`, the SDK will fetch the endpoints from `"https://accounts.google.com/.well-known/openid-configuration"`

-   Any of the functions in the TypeProvider can be overridden for custom implementation

    -   Overrides can do the following:
        -   update params, headers dynamically for the authorization redirect url or in the exchange of code to tokens
        -   add custom logic to exchange code to tokens
        -   add custom logic to get the user info

    ```ts
    let customProvider = {
        config: {
            thirdPartyId: "custom",
            clients: [
                {
                    clientId: "...",
                    clientSecret: "...",
                },
            ],
            oidcDiscoveryEndpoint: "...",
            userInfoMap: {
                fromUserInfoAPI: {
                    userId: "id",
                    email: "email",
                    emailVerified: "email_verified",
                },
            },
        },
        override: (originalImplementation) => {
            return {
                ...originalImplementation,
                getAuthorisationRedirectURL: async (input) => {
                    let result = await originalImplementation.getAuthorisationRedirectURL(input);
                    // ...
                    return result;
                },

                exchangeAuthCodeForOAuthTokens: async (input) => {
                    let result = await originalImplementation.exchangeAuthCodeForOAuthTokens(input);
                    // ...
                    return result;
                },

                getUserInfo: async (input) => {
                    let result = await originalImplementation.getUserInfo(input);
                    // ...
                    return result;
                },
            };
        },
    };
    ```

-   To get access token and raw user info from the provider, override the signInUp function

    ```ts
    ThirdParty.init({
        override: {
            functions: (oI) => {
                return {
                    ...oI,
                    signInUp: async (input) => {
                        let result = await oI.signInUp(input);
                        // result.oAuthTokens.access_token
                        // result.oAuthTokens.id_token
                        // result.rawUserInfoFromProvider.fromUserInfoAPI
                        // result.rawUserInfoFromProvider.fromIdTokenPayload
                        return result;
                    },
                };
            },
        },
    });
    ```

-   Request body of thirdparty signinup API has changed

    -   If using auth code:

        Before:

        ```json
        {
            "thirdPartyId": "...",
            "clientId": "...",
            "redirectURI": "...", // optional
            "code": "..."
        }
        ```

        After:

        ```json
        {
            "thirdPartyId": "...",
            "clientType": "...",
            "redirectURIInfo": {
                "redirectURIOnProviderDashboard": "...", // required
                "redirectURIQueryParams": {
                    "code": "...",
                    "state": "..."
                    // ... all callback query params
                },
                "pkceCodeVerifier": "..." // optional, use this if using PKCE flow
            }
        }
        ```

    -   If using tokens:

        Before:

        ```json
        {
            "thirdPartyId": "...",
            "clientId": "...",
            "redirectURI": "...",
            "authCodeResponse": {
                "access_token": "...", // required
                "id_token": "..."
            }
        }
        ```

        After:

        ```json
        {
            "thirdPartyId": "...",
            "clientType": "...",
            "oAuthTokens": {
                "access_token": "...", // now optional
                "id_token": "..."
                // rest of the oAuthTokens as returned by the provider
            }
        }
        ```

### SDK and core compatibility

-   Compatible with Core>=6.0.0 (CDI 4.0)
-   Compatible with frontend SDKs:
    -   supertokens-auth-react@0.34.0
    -   supertokens-web-js@0.7.0
    -   supertokens-website@17.0.2

## [14.1.3] - 2023-07-03

### Changes

-   Updated/replaced dependencies & refactored to be compatible with vercel edge runtimes.

### Fixes

-   Now properly ignoring missing anti-csrf tokens in optional session validation

## [14.1.2] - 2023-06-07

### Fixes

-   Fixed email templates to fix an issue with styling on some email clients

### Changes

-   Minor internal refactors & additional tests
-   Now assuming latest token version if the claim is missing from the header
-   Make `verifySession` send the appropriate response instead of throwing (and sending 500) if session validation fails in koa, hapi and loopback (already happening in other frameworks).

## [14.1.1] - 2023-05-24

### Added

-   Adds additional debug logs whenever the SDK throws a `TRY_REFRESH_TOKEN` or `UNAUTHORISED` error to make debugging easier

## [14.1.0] - 2023-05-23

### Changes

-   Added a new `getRequestFromUserContext` function that can be used to read the original network request from the user context in overridden APIs and recipe functions

## [14.0.2] - 2023-05-11

### Changes

-   Made the access token string optional in the overrideable `getSession` function
-   Moved checking if the access token is defined into the overrideable `getSession` function

## [14.0.1] - 2023-05-11

-   Fixes an issue where API key based login with dashboard would return invalid API key even if the entered API key was valid

## [14.0.0] - 2023-05-04

### Breaking Changes

-   Added support for CDI version `2.21`
-   Dropped support for CDI version `2.8`-`2.20`
-   Changed the interface and configuration of the Session recipe, see below for details. If you do not use the Session recipe directly and do not provide custom configuration, then no migration is necessary.
-   `getAccessTokenPayload` will now return standard (`sub`, `iat`, `exp`) claims and some SuperTokens specific claims along the user defined ones in `getAccessTokenPayload`.
-   Some claim names are now prohibited in the root level of the access token payload
    -   They are: `sub`, `iat`, `exp`, `sessionHandle`, `parentRefreshTokenHash1`, `refreshTokenHash1`, `antiCsrfToken`
    -   If you used these in the root level of the access token payload, then you'll need to migrate your sessions or they will be logged out during the next refresh
    -   These props should be renamed (e.g., by adding a prefix) or moved inside an object in the access token payload
    -   You can migrate these sessions by updating their payload to match your new structure, by calling `mergeIntoAccessTokenPayload`
-   New access tokens are valid JWTs now
    -   They can be used directly (i.e.: by calling `getAccessToken` on the session) if you need a JWT
    -   The `jwt` prop in the access token payload is removed
-   Changed the Session recipe interface - createNewSession, getSession and refreshSession overrides now do not take response and request and return status instead of throwing
-   Renamed `accessTokenPayload` to `customClaimsInAccessTokenPayload` in `SessionInformation` (the return value of `getSessionInformation`). This reflects the fact that it doesn't contain some default claims (`sub`, `iat`, etc.)

### Configuration changes

-   Added `useDynamicAccessTokenSigningKey` (defaults to `true`) option to the Session recipe config
-   Added `exposeAccessTokenToFrontendInCookieBasedAuth` (defaults to `false`) option to the Session recipe config
-   JWT and OpenId related configuration has been removed from the Session recipe config. If necessary, they can be added by initializing the OpenId recipe before the Session recipe.

### Interface changes

-   Renamed `getSessionData` to `getSessionDataFromDatabase` to clarify that it always hits the DB
-   Renamed `updateSessionData` to `updateSessionDataInDatabase`
-   Renamed `sessionData` to `sessionDataInDatabase` in `SessionInformation` and the input to `createNewSession`
-   Added new `checkDatabase` param to `verifySession` and `getSession`
-   Removed `status` from `getJWKS` output (function & API)
-   Added new optional `useStaticSigningKey` param to `createJWT`
-   Removed deprecated `updateAccessTokenPayload` and `regenerateAccessToken` from the Session recipe interface
-   Removed `getAccessTokenLifeTimeMS` and `getRefreshTokenLifeTimeMS` functions

## Changes

-   The Session recipe now always initializes the OpenID recipe if it hasn't been initialized.
-   Refactored how access token validation is done
-   Removed the handshake call to improve start-up times
-   Added support for new access token version
-   Added optional password policy check in `updateEmailOrPassword`

### Added

-   Added `createNewSessionWithoutRequestResponse`, `getSessionWithoutRequestResponse`, `refreshSessionWithoutRequestResponse` to the Session recipe.
-   Added `getAllSessionTokensDangerously` to session objects (`SessionContainerInterface`)
-   Added `attachToRequestResponse` to session objects (`SessionContainerInterface`)

### Migration

#### If self-hosting core

1. You need to update the core version
2. There are manual migration steps needed. Check out the core changelogs for more details.

#### If you used the jwt feature of the session recipe

1. Add `exposeAccessTokenToFrontendInCookieBasedAuth: true` to the Session recipe config on the backend if you need to access the JWT on the frontend.
2. Choose a prop from the following list. We'll use `sub` in the code below, but you can replace it with another from the list if you used it in a custom access token payload.
    - `sub`
    - `iat`
    - `exp`
    - `sessionHandle`
3. On the frontend where you accessed the JWT before by: `(await Session.getAccessTokenPayloadSecurely()).jwt` update to:

```tsx
let jwt = null;
const accessTokenPayload = await Session.getAccessTokenPayloadSecurely();
if (accessTokenPayload.sub !== undefined) {
    jwt = await Session.getAccessToken();
} else {
    // This branch is only required if there are valid access tokens created before the update
    // It can be removed after the validity period ends
    jwt = accessTokenPayload.jwt;
}
```

4. On the backend if you accessed the JWT before by `session.getAccessTokenPayload().jwt` please update to:

```tsx
let jwt = null;
const accessTokenPayload = await session.getAccessTokenPayload();
if (accessTokenPayload.sub !== undefined) {
    jwt = await session.getAccessToken();
} else {
    // This branch is only required if there are valid access tokens created before the update
    // It can be removed after the validity period ends
    jwt = accessTokenPayload.jwt;
}
```

#### If you used to set an issuer in the session recipe `jwt` configuration

-   You can add an issuer claim to access tokens by overriding the `createNewSession` function in the session recipe init.
    -   Check out https://supertokens.com/docs/passwordless/common-customizations/sessions/claims/access-token-payload#during-session-creation for more information
-   You can add an issuer claim to JWTs created by the JWT recipe by passing the `iss` claim as part of the payload.
-   You can set the OpenId discovery configuration as follows:

Before:

```tsx
import SuperTokens from "supertokens-node";
import Session from "supertokens-node/recipe/session";

SuperTokens.init({
    appInfo: {
        apiDomain: "...",
        appName: "...",
        websiteDomain: "...",
    },
    recipeList: [
        Session.init({
            jwt: {
                enable: true,
                issuer: "...",
            },
        }),
    ],
});
```

After:

```tsx
import SuperTokens from "supertokens-node";
import Session from "supertokens-node/recipe/session";

SuperTokens.init({
    appInfo: {
        apiDomain: "...",
        appName: "...",
        websiteDomain: "...",
    },
    recipeList: [
        Session.init({
            getTokenTransferMethod: () => "header",
            override: {
                openIdFeature: {
                    functions: originalImplementation => ({
                        ...originalImplementation,
                        getOpenIdDiscoveryConfiguration: async (input) => ({
                            issuer: "your issuer",
                            jwks_uri: "https://your.api.domain/auth/jwt/jwks.json",
                            status: "OK"
                        }),
                    })
                }
            }
        });
    ],
});
```

#### If you used `sessionData` (not `accessTokenPayload`)

Related functions/prop names have changes (`sessionData` became `sessionDataFromDatabase`):

-   Renamed `getSessionData` to `getSessionDataFromDatabase` to clarify that it always hits the DB
-   Renamed `updateSessionData` to `updateSessionDataInDatabase`
-   Renamed `sessionData` to `sessionDataInDatabase` in `SessionInformation` and the input to `createNewSession`

#### If you used to set `access_token_blacklisting` in the core config

-   You should now set `checkDatabase` to true in the verifySession params.

#### If you used to set `access_token_signing_key_dynamic` in the core config

-   You should now set `useDynamicAccessTokenSigningKey` in the Session recipe config.

#### If you used to use standard/protected props in the access token payload root:

1. Update you application logic to rename those props (e.g., by adding a prefix)
2. Update the session recipe config (in this example `sub` is the protected property we are updating by adding the `app` prefix):

Before:

```tsx
Session.init({
    override: {
        functions: (oI) => ({
            ...oI,
            createNewSession: async (input) => {
                return oI.createNewSession({
                    ...input,
                    accessTokenPayload: {
                        ...input.accessTokenPayload,
                        sub: input.userId + "!!!",
                    },
                });
            },
        }),
    },
});
```

After:

```tsx
Session.init({
    override: {
        functions: (oI) => ({
            ...oI,
            getSession: async (input) => {
                const result = await oI.getSession(input);
                if (result) {
                    const origPayload = result.getAccessTokenPayload();
                    if (origPayload.appSub === undefined) {
                        await result.mergeIntoAccessTokenPayload({ appSub: origPayload.sub, sub: null });
                    }
                }
                return result;
            },
            createNewSession: async (input) => {
                return oI.createNewSession({
                    ...input,
                    accessTokenPayload: {
                        ...input.accessTokenPayload,
                        appSub: input.userId + "!!!",
                    },
                });
            },
        }),
    },
});
```

#### If you added an override for `createNewSession`/`refreshSession`/`getSession`:

This example uses `getSession`, but the changes required for the other ones are very similar. Before:

```tsx
Session.init({
    override: {
        functions: (oI) => ({
            ...oI,
            getSession: async (input) => {
                const req = input.req;
                console.log(req);

                try {
                    const session = await oI.getSession(input);
                    console.log(session);
                    return session;
                } catch (error) {
                    console.log(error);
                    throw error;
                }
            },
        }),
    },
});
```

After:

```tsx
Session.init({
    override: {
        functions: (oI) => ({
            ...oI,
            getSession: async (input) => {
                const req = input.userContext._default.request;
                console.log(req);

                const resp = await oI.getSession(input);

                if (resp.status === "OK") {
                    console.log(resp.session);
                } else {
                    console.log(resp.status);
                    console.log(resp.error);
                }

                return resp;
            },
        }),
    },
});
```

## [13.6.0] - 2023-04-26

-   Added missing arguments from `getUsersNewestFirst` and `getUsersOldestFirst`

## [13.5.0] - 2023-04-22

-   Adds new config to change the access token's path

## [13.4.2] - 2023-04-11

-   Modified email templates to make them render fine in gmail.

## [13.4.1] - 2023-04-11

-   Modified email templates to make them render fine in outlook.

## [13.4.0] - 2023-03-31

-   Adds APIs to enable search functionality to the dashboard recipe

## [13.3.0] - 2023-03-30

### Added

-   Adds a telemetry API to the dashboard recipe

## [13.2.0] - 2023-03-29

### Changed

-   Updates the example app to also initialise the dashboard

### Added

-   Login with bitbucket and gitlab (single tenant only)

## [13.1.5] - 2023-03-17

### Fixes

-   Fixed an issue where BaseRequest implmentations for frameworks such as AWS Lambda would not consider case sensitivity when fetching request headers
-   Fixes an issue where dashboard recipe APIs would return 404 for Hapi

## [13.1.4] - 2023-03-16

### Fixes

-   Fixes an issue where importing recipes without importing the package index file would cause crashes

## [13.1.3] - 2023-03-08

### Changed

-   The dashboard recipe is no longer intialised automatically

## [13.1.2] - 2023-02-27

### Fixes

-   Fixed request parsing issue during third-party (Apple) sign in in NextJS

## [13.1.1] - 2023-02-24

-   Refactor dashboard recipe to use auth mode instead of manually checking for api key

## [13.1.0] - 2023-02-22

-   Adds APIs and logic to the dashboard recipe to enable email password based login

## [13.0.2] - 2023-02-10

-   Package version update for twilio to ^4.7.2 and verify-apple-id-token to ^3.0.1
-   Package typescript version changed to 4.2

## [13.0.1] - 2023-02-08

-   Email template updates

## [13.0.0] - 2023-02-01

### Breaking changes

-   The frontend SDK should be updated to a version supporting the header-based sessions!
    -   supertokens-auth-react: >= 0.31.0
    -   supertokens-web-js: >= 0.5.0
    -   supertokens-website: >= 16.0.0
    -   supertokens-react-native: >= 4.0.0
    -   supertokens-ios >= 0.2.0
    -   supertokens-android >= 0.3.0
    -   supertokens-flutter >= 0.1.0
-   `createNewSession` now requires passing the request as well as the response.
    -   This only requires a change if you manually created sessions (e.g.: during testing)
    -   There is a migration example added below. It uses express, but the same principle applies for other supported frameworks.
-   Only supporting FDI 1.16

### Added

-   Added support for authorizing requests using the `Authorization` header instead of cookies
    -   Added `getTokenTransferMethod` config option
    -   Check out https://supertokens.com/docs/thirdpartyemailpassword/common-customizations/sessions/token-transfer-method for more information

### Migration

This example uses express, but the same principle applies for other supported frameworks.

Before:

```
const app = express();
app.post("/create", async (req, res) => {
    await Session.createNewSession(res, "testing-userId", {}, {});
    res.status(200).json({ message: true });
});
```

After the update:

```
const app = express();
app.post("/create", async (req, res) => {
    await Session.createNewSession(req, res, "testing-userId", {}, {});
    res.status(200).json({ message: true });
});
```

## [12.1.6] - 2023-01-22

-   Updates jsonwebtoken dependency to version 9.0.0 to fix vulnerability in it's `verify` function.

## [12.1.5] - 2022-12-10

-   Fixes Content-type header in AWS lambda framework

## [12.1.4] - 2022-12-26

-   Updates dashboard version
-   Updates user GET API for the dashboard recipe

## [12.1.3] - 2022-12-12

-   Updates some dependencies cause of `npm audit`

## [12.1.2] - 2022-12-06

-   Fixes issue where if sendEmail is overridden with a different email, it will reset that email.

## [12.1.1] - 2022-11-25

-   Fixed an issue with importing the wrong recipe in the dashboard APIs

## [12.1.0] - 2022-11-17

### Added:

-   Adds APIs for user details to the dashboard recipe

### Changed:

-   Updates dashboard version to 0.2

## [12.0.6] - 2022-11-09

### Fixes

-   Adds updating of session claims in email verification token generation API in case the session claims are outdated.
-   Fixed mergeIntoAccessTokenPayload not updating the JWT payload

## [12.0.5] - 2022-10-17

-   Updated google token endpoint.

## [12.0.4] - 2022-10-14

### Changed:

-   Removed default defaultMaxAge from session claim base classes
-   Added a 5 minute defaultMaxAge to UserRoleClaim, PermissionClaim and EmailVerificationClaim

## [12.0.3] - 2022-09-29

### Refactor:

-   clear cookies logic refactored for unauthorised error response

## [12.0.2] - 2022-09-22

### Bug fix:

-   Properly rethrowing generic errors in email verification endpoints.

## [12.0.1] - 2022-09-22

### Changed

-   Email verification endpoints will now clear the session if called by a deleted/unknown user

## [12.0.0] - 2022-09-14

### Bug fix:

-   Makes `SuperTokensError` extend the built-in `Error` class to fix serialization issues.

### Changed

-   Made the `email` parameter option in `unverifyEmail`, `revokeEmailVerificationTokens`, `isEmailVerified`, `verifyEmailUsingToken`, `createEmailVerificationToken` of the `EmailVerification` recipe.

### Added

-   Support for FDI 1.15
-   Added support for session claims with related interfaces and classes.
-   Added `onInvalidClaim` optional error handler to send InvalidClaim error responses.
-   Added `INVALID_CLAIMS` to `SessionErrors`.
-   Added `invalidClaimStatusCode` optional config to set the status code of InvalidClaim errors.
-   Added `overrideGlobalClaimValidators` to options of `getSession` and `verifySession`.
-   Added `mergeIntoAccessTokenPayload` to the Session recipe and session objects which should be preferred to the now deprecated `updateAccessTokenPayload`.
-   Added `EmailVerificationClaim`, `UserRoleClaim` and `PermissionClaim`. These claims are now added to the access token payload by default by their respective recipes.
-   Added `assertClaims`, `validateClaimsForSessionHandle`, `validateClaimsInJWTPayload` to the Session recipe to support validation of the newly added claims.
-   Added `fetchAndSetClaim`, `getClaimValue`, `setClaimValue` and `removeClaim` to the Session recipe to manage claims.
-   Added `assertClaims`, `fetchAndSetClaim`, `getClaimValue`, `setClaimValue` and `removeClaim` to session objects to manage claims.
-   Added session to the input of `generateEmailVerifyTokenPOST`, `verifyEmailPOST`, `isEmailVerifiedGET`.
-   Adds default userContext for verifySession calls that contains the request object.

### Breaking changes

-   Removes support for FDI < 1.15
-   Changed `signInUp` third party recipe function to accept an email string instead of an object that takes `{id: string, isVerified: boolean}`.
-   Renames `STMP` to `SMTP` everywhere (typo).
-   The frontend SDK should be updated to a version supporting session claims!
    -   supertokens-auth-react: >= 0.25.0
    -   supertokens-web-js: >= 0.2.0
-   `EmailVerification` recipe is now not initialized as part of auth recipes, it should be added to the `recipeList` directly instead.
-   Email verification related overrides (`emailVerificationFeature` prop of `override`) moved from auth recipes into the `EmailVerification` recipe config.
-   Email verificitaion related configs (`emailVerificationFeature` props) moved from auth recipes into the `EmailVerification` config object root.
-   ThirdParty recipe no longer takes emailDelivery config -> use emailverification recipe's emailDelivery instead.
-   Moved email verification related configs from the `emailDelivery` config of auth recipes into a separate `EmailVerification` email delivery config.
-   Updated return type of `getEmailForUserId` in the `EmailVerification` recipe config. It should now return an object with status.
-   Removed `getResetPasswordURL`, `getEmailVerificationURL`, `getLinkDomainAndPath`. Changing these urls can be done in the email delivery configs instead.
-   Removed `unverifyEmail`, `revokeEmailVerificationTokens`, `isEmailVerified`, `verifyEmailUsingToken` and `createEmailVerificationToken` from auth recipes. These should be called on the `EmailVerification` recipe instead.
-   Changed function signature for email verification APIs to accept a session as an input.
-   Changed Session API interface functions:
    -   `refreshPOST` now returns a Session container object.
    -   `signOutPOST` now takes in an optional session object as a parameter.

### Migration

Before:

```
SuperTokens.init({
    appInfo: {
        apiDomain: "...",
        appName: "...",
        websiteDomain: "...",
    },
    recipeList: [
        EmailPassword.init({
            emailVerificationFeature: {
                // these options should be moved into the config of the EmailVerification recipe
            },
            override: {
                emailVerificationFeature: {
                    // these overrides should be moved into the overrides of the EmailVerification recipe
                }
            }
        })
    ]
})
```

After the update:

```
SuperTokens.init({
    appInfo: {
        apiDomain: "...",
        appName: "...",
        websiteDomain: "...",
    },
    recipeList: [
        EmailVerification.init({
            // all config should be moved here from the emailVerificationFeature prop of the EmailPassword recipe config
            override: {
                // move the overrides from the emailVerificationFeature prop of the override config in the EmailPassword init here
            }
        }),
        EmailPassword.init()
    ]
})
```

#### Passwordless users and email verification

If you turn on email verification your email-based passwordless users may be redirected to an email verification screen in their existing session.
Logging out and logging in again will solve this problem or they could click the link in the email to verify themselves.

You can avoid this by running a script that will:

1. list all users of passwordless
2. create an emailverification token for each of them if they have email addresses
3. user the token to verify their address

Something similar to this script:

```ts
const SuperTokens = require("supertokens-node");
const Session = require("supertokens-node/recipe/session");
const Passwordless = require("supertokens-node/recipe/passwordless");
const EmailVerification = require("supertokens-node/recipe/emailverification");

SuperTokens.init({
    supertokens: {
        // TODO: This is a core hosted for demo purposes. You can use this, but make sure to change it to your core instance URI eventually.
        connectionURI: "https://try.supertokens.com",
        apiKey: "<REQUIRED FOR MANAGED SERVICE, ELSE YOU CAN REMOVE THIS FIELD>",
    },
    appInfo: {
        apiDomain: "...",
        appName: "...",
        websiteDomain: "...",
    },
    recipeList: [
        EmailVerification.init({
            mode: "REQUIRED",
        }),
        Passwordless.init({
            contactMethod: "EMAIL_OR_PHONE",
            flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
        }),
        Session.init(),
    ],
});

async function main() {
    let paginationToken = undefined;
    let done = false;
    while (!done) {
        const userList = await SuperTokens.getUsersNewestFirst({
            includeRecipeIds: ["passwordless"],
            limit: 100,
            paginationToken,
        });

        for (const { recipeId, user } of userList.users) {
            if (recipeId === "passwordless" && user.email) {
                const tokenResp = await EmailVerification.createEmailVerificationToken(user.id, user.email);
                if (tokenResp.status === "OK") {
                    await EmailVerification.verifyEmailUsingToken(tokenResp.token);
                }
            }
        }

        done = userList.nextPaginationToken !== undefined;
        if (!done) {
            paginationToken = userList.nextPaginationToken;
        }
    }
}

main().then(console.log, console.error);
```

#### User roles

The UserRoles recipe now adds role and permission information into the access token payload by default. If you are already doing this manually, this will result in duplicate data in the access token.

-   You can disable this behaviour by setting `skipAddingRolesToAccessToken` and `skipAddingPermissionsToAccessToken` to true in the recipe init.
-   Check how to use the new claims in our user roles docs on our website.

#### Next.js integration

-   Since a new exception type has been added, there is a required change in SRR (`getServerSideProps`). You should handle the new (`INVALID_CLAIMS`) exception in the same way as you handle `UNAUTHORISED`
-   Please check our updated guide on our website

#### AWS integration

-   The new exception type and error code requires changes if you are using SuperTokens as as an Authorizer in API Gateways.
-   You need to handle the new exception type in the authorizer code.
-   You need to configure the "Access Denied" response.
-   Please check our updated guide on our website

## [11.3.0] - 2022-08-30

### Added:

-   `authUsername` option in smtp config for when email is different than the username for auth.

## [11.2.0] - 2022-08-26

### Adds:

-   Adds a Dashboard recipe

## [11.1.2] - 2022-08-25

### Type fix:

-   Makes `userContext` optional in `sendEmail` and `sendSms` function in all recipe exposed functions.

## [11.1.1] - 2022-08-11

### Bug fix:

-   Adds missing `force` param from `createUserIdMapping` and `deleteUserIdMapping` functions

## [11.1.0] - 2022-08-11

### Adds:

-   UserId Mapping functionality and compatibility with CDI 2.15
-   Adds `createUserIdMapping`, `getUserIdMapping`, `deleteUserIdMapping`, `updateOrDeleteUserIdMappingInfo` functions

## [11.0.3] - 2022-08-05

### Bug fix:

-   Fixes overrides not applying correctly in methods called on SessionContainer instances

## [11.0.2] - 2022-08-02

### Bug fix:

-   Solves the issue of request getting stuck in non returning state while parsing form data for nextjs request

## [11.0.1] - 2022-07-18

### Fixes

-   Fixed fastify issue where same cookie was getting set multiple times on the response object

### Adds:

-   Improved type definitions for `SessionWrapper.getSession`.

## [11.0.0] - 2022-07-05

### Breaking change:

-   Changes session function recipe interfaces to not throw an UNAUTHORISED error when the input is a sessionHandle: https://github.com/supertokens/backend/issues/83
    -   `getSessionInformation` now returns `undefined` is the session does not exist
    -   `updateSessionData` now returns `false` if the input `sessionHandle` does not exist.
    -   `updateAccessTokenPayload` now returns `false` if the input `sessionHandle` does not exist.
    -   `regenerateAccessToken` now returns `undefined` if the input access token's `sessionHandle` does not exist.
    -   The sessionClass functions have not changed in behaviour and still throw UNAUTHORISED. This works cause the sessionClass works on the current session and not some other session.

### Bug fix:

-   Clears cookies when revokeSession is called using the session container, even if the session did not exist from before: https://github.com/supertokens/supertokens-node/issues/343

## [10.0.1] - 2022-06-28

### Fixes

-   Fixed handling of unicode characters in usermetadata (and emails, roles, session/access token payload data)

### Adds:

-   Adds default userContext for API calls that contains the request object. It can be used in APIs / functions override like so:

```ts
signIn: async function (input) {
    if (input.userContext._default && input.userContext._default.request) {
        // do something here with the request object
    }
}
```

## [10.0.0] - 2022-06-2

### Breaking change

-   https://github.com/supertokens/supertokens-node/issues/220
    -   Adds `{status: "GENERAL_ERROR", message: string}` as a possible output to all the APIs.
    -   Changes `FIELD_ERROR` output status in third party recipe API to be `GENERAL_ERROR`.
    -   Replaced `FIELD_ERROR` status type in third party signinup API with `GENERAL_ERROR`.
    -   Removed `FIELD_ERROR` status type from third party signinup recipe function.
-   If sms or email sending failed in passwordless recipe APIs, we now throw a regular JS error from the API as opposed to returning a `GENERAL_ERROR` to the client.
-   If there is an error whilst getting the profile info about a user from a third party provider (in /signinup POST API), then we throw a regular JS error instead of returning a `GENERAL_ERROR` to the client.
-   Changes SuperTokensSMS service to take an API key directly as opposed to take an object that takes an API key
-   Passes only base request and base response objects to session recipe implementation functions. Normalisation of raw res and raw response is now done in the session's index.ts file
-   Removes support for faunadb session recipe modifier.
-   Removes support for FDI < 1.14

### Changes

-   Fixes Cookie sameSite config validation.
-   Fixes a few typos
-   Changes `getEmailForUserIdForEmailVerification` function inside thirdpartypasswordless to take into account passwordless emails and return an empty string in case a passwordless email doesn't exist. This helps situations where the dev wants to customise the email verification functions in the thirdpartypasswordless recipe.

### Fixes

-   Fixes email undefined error when resending the passwordless login email.

## [9.3.0] - 2022-06-17

### Added

-   Adds User Roles recipe and compatibility with CDI 2.14
-   `emailDelivery` user config for Emailpassword, Thirdparty, ThirdpartyEmailpassword, Passwordless and ThirdpartyPasswordless recipes.
-   `smsDelivery` user config for Passwordless and ThirdpartyPasswordless recipes.
-   `Twilio` service integartion for smsDelivery ingredient.
-   `SMTP` service integration for emailDelivery ingredient.
-   `Supertokens` service integration for smsDelivery ingredient.

### Deprecated

-   For Emailpassword recipe input config, `resetPasswordUsingTokenFeature.createAndSendCustomEmail` and `emailVerificationFeature.createAndSendCustomEmail` have been deprecated.
-   For Thirdparty recipe input config, `emailVerificationFeature.createAndSendCustomEmail` has been deprecated.
-   For ThirdpartyEmailpassword recipe input config, `resetPasswordUsingTokenFeature.createAndSendCustomEmail` and `emailVerificationFeature.createAndSendCustomEmail` have been deprecated.
-   For Passwordless recipe input config, `createAndSendCustomEmail` and `createAndSendCustomTextMessage` have been deprecated.
-   For ThirdpartyPasswordless recipe input config, `createAndSendCustomEmail`, `createAndSendCustomTextMessage` and `emailVerificationFeature.createAndSendCustomEmail` have been deprecated.

### Migration

Following is an example of ThirdpartyPasswordless recipe migration. If your existing code looks like

```ts
import SuperTokens from "supertokens-auth-react";
import ThirdpartyPasswordless from "supertokens-auth-react/recipe/thirdpartypasswordless";

SuperTokens.init({
    appInfo: {
        apiDomain: "...",
        appName: "...",
        websiteDomain: "...",
    },
    recipeList: [
        ThirdpartyPasswordless.init({
            contactMethod: "EMAIL_OR_PHONE",
            createAndSendCustomEmail: async (input, userContext) => {
                // some custom logic
            },
            createAndSendCustomTextMessage: async (input, userContext) => {
                // some custom logic
            },
            flowType: "...",
            emailVerificationFeature: {
                createAndSendCustomEmail: async (user, emailVerificationURLWithToken, userContext) => {
                    // some custom logic
                },
            },
        }),
    ],
});
```

After migration to using new `emailDelivery` and `smsDelivery` config, your code would look like:

```ts
import SuperTokens from "supertokens-auth-react";
import ThirdpartyPasswordless from "supertokens-auth-react/recipe/thirdpartypasswordless";

SuperTokens.init({
    appInfo: {
        apiDomain: "...",
        appName: "...",
        websiteDomain: "..."
    },
    recipeList: [
        ThirdpartyPasswordless.init({
            contactMethod: "EMAIL_OR_PHONE",
            emailDelivery: {
                service: {
                    sendEmail: async (input) => {
                        let userContext = input.userContext;
                        if(input.type === "EMAIL_VERIFICATION") {
                            // some custom logic
                        } else if (input.type === "PASSWORDLESS_LOGIN") {
                            // some custom logic
                        }
                    }
                }
            },
            smsDelivery: {
                service: {
                    sendSms: async (input) => {
                        // some custom logic for sending passwordless login SMS
                    }
                }
            }
            flowType: "..."
        })
    ]
})
```

## [9.2.3] - 2022-06-03

-   Changes `getUserMetadata` to return `any` type for metadata so that it's easier to use.

## [9.2.2] - 2022-05-24

### Fixes:

-   Calling the setImmediate function inside assertThatBodyParserHasBeenUsedForExpressLikeRequest only if the function is getting executed in NextJS env. Fixes #313

## [9.2.1] - 2022-05-19

### Fixes:

-   Fixes the routes issue for Hapi framework plugin

## [9.2.0] - 2022-04-18

# Adds

-   Adds UserMetadata recipe
-   Fixes debug log statement when custom header is not passed during refresh session

## [9.1.2] - 2022-04-01

### Added

-   Adds debug logging functionality
-   removed jsonschema dependency

## [9.1.1] - 2022-03-24

### Fixes:

-   Changes Github and Discord providers to check if email is `undefined` or not before assigning the email object to the profile info.

## [9.1.0] - 2022-03-17

-   Added `ThirdPartyPasswordless` recipe + tests

## [9.0.1] - 2022-03-02

-   Fixes #269. The json body parser will additionally be used to parse the request body if the request body is of type `{}`
-   `init` function will throw error if there are empty items in recipeList when passing the config

## [9.0.0] - 2022-02-20

### Breaking Change

-   Adds user context to all functions exposed to the user, and to API and Recipe interface functions. This is a non breaking change for User exposed function calls, but a breaking change if you are using the Recipe or APIs override feature
-   Returns session from API interface functions that create a session
-   Renames functions in ThirdPartyEmailPassword recipe (https://github.com/supertokens/supertokens-node/issues/219):
    -   Recipe Interface:
        -   `signInUp` -> `thirdPartySignInUp`
        -   `signUp` -> `emailPasswordSignUp`
        -   `signIn` -> `emailPasswordSignIn`
    -   API Interface:
        -   `emailExistsGET` -> `emailPasswordEmailExistsGET`
    -   User exposed functions (in `recipe/thirdpartyemailpassword/index.ts`)
        -   `signInUp` -> `thirdPartySignInUp`
        -   `signUp` -> `emailPasswordSignUp`
        -   `signIn` -> `emailPasswordSignIn`

### Change:

-   Uses recipe interface inside session class so that any modification to those get reflected in the session class functions too.

## [8.6.1] - 2022-02-09

### Refactor

-   Removes unused property from session recipe

## [8.6.0] - 2022-01-31

### Changed

-   Added userId as an optional property to the response of `recipe/user/password/reset` (compatibility with CDI 2.12).
-   Fixes https://github.com/supertokens/supertokens-node/issues/244 - throws an error if a user tries to update email / password of a third party login user.

### Added

-   Adds ability to give a path for each of the hostnames in the connectionURI: https://github.com/supertokens/supertokens-node/issues/252
-   add workflow to verify if pr title follows conventional commits
-   Added `regenerateAccessToken` as a new recipe function for the session recipe.

### Breaking changes:

-   Allows passing of custom user context everywhere: https://github.com/supertokens/supertokens-node/issues/215
-   Returns session object from API interface functions which create a new session: https://github.com/supertokens/supertokens-node/issues/215

## [8.5.0] - 2022-01-14

### Added

-   Adds passwordless recipe
-   Adds compatibility with FDI 1.12 and CDI 2.11
-   Adds passwordless tests

## [8.4.0] - 2021-12-20

### Added

-   Delete user functionality

## [8.3.1] - 2021-12-20

### Added

-   Exposes all essential `types` files. Fixes [#230](https://github.com/supertokens/supertokens-node/issues/230)

## [8.3.0] - 2021-12-08

### Added

-   The ability to enable JWT creation with session management, this allows easier integration with services that require JWT based authentication: https://github.com/supertokens/supertokens-core/issues/250

## [8.2.1] - 2021-12-07

### Fixes

-   Removes use of apiGatewayPath from apple's redirect URI since that is already there in the apiBasePath

## [8.2.0] - 2021-11-15

### Added

-   Sign in with Discord, Google workspaces.
-   If `getProfileInfo` throws an error, then it is sent as a FIELD_ERROR to the frontend

### Changed

-   Changes `sendJSONResponse to not allow setting of result if it has already been set
-   AWS lambda middleware will return `404` response if the API route is not served by the middleware and user has not passed a handler.

## [8.1.2] - 2021-11-15

-   Uses supertokens-js-override from npm

## [8.1.1] - 2021-11-08

### Changes

-   When routing, ignores `rid` value `"anti-csrf"`: https://github.com/supertokens/supertokens-node/issues/202

## [8.1.0] - 2021-10-29

### Added

-   Support for FDI 1.10:
    -   Allow thirdparty `/signinup POST` API to take `authCodeResponse` XOR `code` so that it can supprt OAuth via PKCE
    -   Adds apple sign in callback API
-   Optional `getRedirectURI` function added to social providers in case we set the `redirect_uri` on the backend.
-   Adds optional `isDefault` param to auth providers so that they can be reused with different credentials.
-   Verifies ID Token sent for sign in with apple as per https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_rest_api/verifying_a_user
-   `sendHTMLResponse` and `getFormData` functions for frameworks

## [8.0.4] - 2021-10-28

### Fixes

-   Uses `accessTokenPayload` instead of `jwtPayload` when creating SessionInformation object

## [8.0.3] - 2021-10-27

### Changes

-   Removes `SessionRequest` as an exported member of session recipe's index file

## [8.0.2] - 2021-10-27

### Changes

-   Uses non arrow functions in api and recipe interface impl to allow for "true" inheritance in override: https://github.com/supertokens/supertokens-node/issues/199
-   Uses `bind(this)` when calling original implementation

## [8.0.1] - 2021-10-22

### Changed

-   Trying to handle errors closer to the source in middlewares instead of relying on the global error handler.

## [8.0.0] - 2021-10-20

### Breaking change

-   Removes `signInUpPost` from thirdpartyemailpassword API interface and replaces it with three APIs: `emailPasswordSignInPOST`, `emailPasswordSignUpPOST` and `thirdPartySignInUpPOST`: https://github.com/supertokens/supertokens-node/issues/192
-   Removes all deprecated functions
-   Renames all "JWT" related functions in session recipe to use "AccessToken" instead
-   Removes support for CDI 2.7 (which used some of the new deprecated APIs in the core)

## [7.3.1] - 2021-10-18

### Changed

-   Changes implementation such that actual client IDs are not in the SDK, removes imports for OAuth dev related code.

### Fixed

-   URL protocol is being taken into account when determining the value of cookie same site: https://github.com/supertokens/supertokens-golang/issues/36

## [7.3.0] - 2021-10-11

### Added

-   Adds OAuth development keys for Google and Github for faster recipe implementation.

## [7.2.1] - 2021-10-02

### Changed

-   Updated dependencies.

## [7.2.0]

### Added

-   JWT recipe to create signed JWT tokens
-   New API to fetch keys used for JWT verification using JWKS

## [7.1.0]

### Added

-   Support for multiple access token signing keys: https://github.com/supertokens/supertokens-core/issues/305
-   Supporting CDI 2.9
-   Header `"content-type": "application/json; charset=utf-8"` when querying the core

### Removed

-   Unnecessary serverless optimisation

# [7.0.2] - 2021-09-16

### Fixes

-   fixes issue #180 where user was required to have all frameworks as depedencies or else use `compilerOptions.skipLibCheck` in their tsconfig.json
-   `verifySession` middleware ts issue fix for Hapi framework
-   ts import for `verifySession` fix for koa

## [7.0.1] - 2021-09-10

### Breaking Change

-   Removed redwood support

### Fixes

-   fixes issue #175 regarding making error handlers async, session error callabacks async and making VerifySessionOptions optional for verifySession middleware.

## [7.0.0] - 2021-07-31

### Added

-   Multiple framework support. Currently supporting express, koa, hapi, fastify, awsLambda and loopback
-   BaseRequest and BaseResponse interface added which will be used inside recipe instead of previously used express.Request and express.Response
-   `framework` config option. Default value is `express`.
-   basic tests for all frameworks.

### Changed

-   Following functions are changed in default SuperTokens class (supertokens.ts):
    -   middleware: instead of taking no option and returning an express middleware, it now takes 2 parameters: BaseRequest and BaseResponse and returns a boolean. If response was send by the middleware, it returns true, else false
    -   handleAPI: no longer take `next` parameter. Also the request and response parameter will be of type BaseRequest and BaseResponse.
    -   errorHandler: instead of taking no option and returning an express error middleware, it now takes 3 parameters: error object, BaseRequest and BaseResponse
-   Cookie and Header handling will part be delegated to specific framework.
-   Request and Response parameters passwed in functions `createNewSession`, `getSession` and `refreshSession` can by of any type and not `express.Request` and `express.Response`.
-   middleware, errorHandler should be imported from specific framework (i.e. `import {middleware, errorHandler} from "supertokens-node/framework/express"`). Also, errorHandler may not be there for few frameworksas it may not be required.
-   verifySession should be imported from specific framework, from session recipe (i.e. `import {verifySession} from "supertokens-node/recipe/session/framework/express"`).
-   `handleAPIRequest` in recipe modules will no longer take `next` parameter. Also the request and response parameter will be of type BaseRequest and BaseResponse.
-   `handleAPIRequest` in recipe modules will return boolean. If the response is sent from `handleAPIRequest`, the function will return true else it will return false.
-   `handleError` in recipe modules will no longer take `next` parameter. Also the request and response parameter will be of type BaseRequest and BaseResponse. If error is not handled by the function, it will rethrow the error.
-   All the API implementation functions should return a boolean. If response is sent, `true` will be returned else false.
-   `verifySession` which was defined in `middleware.ts` file is now removed.
-   Changed `UNKNOWN_USER_ID` to `UNKNOWN_USER_ID_ERROR` to make it more consistent with other status types: https://github.com/supertokens/supertokens-node/issues/166

### Deprecated

-   middleware, errorHandler imported directly from supertokens-node (i.e. `import {middleware, errorHandler} from "supertokens-node"`)
-   verifySession imported directly from session recipe (i.e. `import {verifySession} from "supertokens-node/recipe/session"`)

### Breaking changes

-   In `ThirdParty` recipe, for type `TypeProviderGetResponse`, the field `authorisationRedirect.params` will be of type `{ [key: string]: string | ((request: BaseRequest) => string) }`. Earlier, the request was of type express.Request.
-   For all the recipes' `APIOptions`, their will be no `next` parameter. Also the request and response parameter will be of type BaseRequest and BaseResponse.
-   Updated minimum Oauth scopes required for various thirdparty providers.
-   For thirdparty providers, if the scope array is passed by the user, the default scopes will not be used.
-   Changes to emailpassword, emailverification, thirdpartyemailpassword and thirdparty functions to not return errors implicitly: https://github.com/supertokens/supertokens-node/issues/167
-   The req and res objects in the error handlers config for session recipe are not of type express anymore, but are of type BaseResponse and BaseRequest

### Fixes

-   https://github.com/supertokens/supertokens-node/issues/156

## [6.1.1] - 2021-09-08

## Fixes

-   updated function `getUserByEmail` in `recipe/thirdpartyemailpassword/recipeImplementation/emailPasswordRecipeImplementation.ts` to use `getUsersByEmail` instead of `getUserByEmail`

## [6.1.0] - 2021-06-24

### Changes

-   To how pagination and use count is done: https://github.com/supertokens/supertokens-core/issues/259
-   Deprecates (instead, use `supertokens.getUserCount`, `supertokens.getUsersNewestFirst` or `supertokens.getUsersOldestFirst`):
    -   `ThirdParty.getUserCount()`, `ThirdParty.getUsersNewestFirst()`, `ThirdParty.getUsersOldestFirst`
    -   `EmailPassword.getUserCount()`, `EmailPassword.getUsersNewestFirst()`, `EmailPassword.getUsersOldestFirst`
    -   `ThirdPartyEmailPassword.getUserCount()`, `ThirdPartyEmailPassword.getUsersNewestFirst()`, `ThirdPartyEmailPassword.getUsersOldestFirst`
-   Deprecates (instead use `Session.getSessionInformation()`)
    -   `Session.getSessionData()`, `Session.getJWTPayload()`
-   Adds email verification function calls in thirdparty sign in up API as per https://github.com/supertokens/supertokens-core/issues/295
-   Adds `emailVerificationRecipeImplementation` in all auth recipe `APIOptions` so that APIs can access the email verification implementation.
-   Add recipe function to fetch third party users https://github.com/supertokens/supertokens-core/issues/277
-   Deprecates `getUserByEmail` in thirdpartyemailpassword and replaces it with `getUsersByEmail`.
-   Adds `updateEmailOrPassword` recipe function to emailpassword and thirdpartyemailpassword recipes: https://github.com/supertokens/supertokens-core/issues/275
-   Adds emailverification recipe functions to all recipes: https://github.com/supertokens/supertokens-core/issues/270

## [6.0.4] - 2021-07-29

### Fixes

-   Fixes typescript issue with default imports. (Related to https://github.com/supertokens/supertokens-auth-react/issues/297)

## [6.0.3] - 2021-07-08

### Fixes

-   signInUpPOST default implementation will return accessToken api response data instead of axios response

## [6.0.2] - 2021-06-28

### Fixes

-   https://github.com/supertokens/supertokens-node/issues/141

## [6.0.1] - 2021-06-19

### Fixes

-   https://github.com/supertokens/supertokens-node/issues/136

## [6.0.0] - 2021-06-18

-   Uses `getSession` function instead of `verifySession` middleware in prebuilt APIs
-   Refactor code to use recipeImplementations that can be override by the user
-   `getSession` third param is no longer a boolean
-   Provides FaunaDB's session implementation as a modification to the original session recipe.
-   Removes deprecated `handleCustomFormFieldsPostSignUp`.
-   Removes `superTokensMiddleware` from NextJS as it is no longer needed and was deprecated.
-   Fixes NextJS type for `superTokensNextWrapper` function
-   `setJwtPayload` and `setSessionData` get all `formFields` param
-   Adds API interfaces to all recipes
-   Provides a way to override API logic easily.
-   Replaces `disableDefaultImplementation` with setting functions in `override > apis` to `undefined`.
-   Removes explicit post API callback functions since now users can override apis and emulate post api callbacks easily.
-   Removes the use of GENERAL_ERROR and throws a normal JS Error instead.
-   Allows recipes to be passed in constructor so that child recipes do not create multiple instances of the same recipe.
-   Removes checking of duplicate APIs since we are now using interfaces for APIs which won't allow for duplicates anyway...
-   Removes duplicate signout APIs from all auth recipes since it's already exposed from the session recipe.
-   Marked `setJwtPayload` and `setSessionData` as deprecated.

## [5.1.0] - 2021-06-13

### Fixes:

-   https://github.com/supertokens/supertokens-node/pull/135: In serverless env, waits for email to be sent before returning the response cause sometimes, serverless envs quite the process early on.
-   https://github.com/supertokens/supertokens-node/issues/127: In serverless env, sends telemetry with a 30% probability.

## [5.0.1] - 2021-05-06

### Fixes:

-   https://github.com/supertokens/supertokens-node/issues/122: Calling verifySession in another file (via router), before the init function is called throws a not initialized error.

## [5.0.0] - 2021-05-02

### Breaking change:

-   Uses custom header as a measure to prevent CSRF attacks - unless the user explicitly enables anti-csrf tokens.
-   new FDI 1.8
-   changes `enableAntiCsrf` config to `antiCsrf`.
-   removes deprecated `apiWebProxyPath` config. Use `appInfo -> apiGatewayPath` instead.

## [4.4.1] - 2021-04-29

### Fixed:

-   Runs JSON body parser only if `req.body` is `undefined` or if it is buffer

## [4.4.0] - 2021-04-28

### Added:

-   `apiGatewayPath` in `appInfo` during `init`. This deprecates `apiWebProxyPath`.

## [4.3.3] - 2021-04-25

### Changed:

-   Fixes case when bodyParser is not used in serverless functions - We now attempt to use bodyParser even if `req.body` is not `undefined` - as long as it's not a valid JSON.

## [4.3.2] - 2021-04-24

### Changed:

-   Complies with FDI 1.7.1 for issue https://github.com/supertokens/supertokens-core/issues/233

## [4.3.1] - 2021-04-17

### Fixed

-   Issue https://github.com/supertokens/supertokens-node/issues/113: If the `idRefreshToken` is present in the request, but the refresh token is missing, we clear the `idRefreshToken` as well.

## [4.3.0] - 2021-04-15

### Changed

-   verifySession now accepts an object as a parameter. Two valid parameters are sessionRequired and antiCsrfCheck. sessionRequired can be given by users if they intend to make the session requirement optional for an API.
-   updated type of handlePostSignIn parameter in signInFeature for thirdpartyemailpassword

### Added

-   handlePostSignUp parameter in signUpFeature for emailpassword recipe.
-   deprecation warning for handleCustomFormFieldsPostSignUp parameter.
-   handlePostSignIn parameter in signInFeature for emailpassword recipe.

## [4.2.0] - 2021-03-09

### Added

-   Optimization for serverless execution
-   Config to enable serverless optimisation
-   apiWebProxyPath config added. This will allow user to config proxy path which would be used by browser while making request to the api-server. This enables to set correct value for the refreshTokenPath.

### Changed

-   allowing empty string to be passed in request body
-   doAntiCsrfCheck parameter for getSession in FaunaDB is now optional
-   Sign out API for session recipe
-   verifySession now accepts an object as a parameter. Two valid parameters are sessionRequired and antiCsrfCheck. sessionRequired can be by user if they intends to make the session requirement optional for the API.
-   Allows ";" at the end of connectionURI to core

## [4.1.3] - 2021-03-19

### Changed

-   Fixes bug in NextJS wrapper which called resolve even though there was an error

## [4.1.2] - 2021-03-05

### Changed

-   Fix Domain normalisation with "/.netlify/functions/api"

## [4.1.1] - 2021-03-05

### Changed

-   Fix Path normalisation with "/.netlify/functions/api"

## [4.1.0] - 2021-02-23

### Added

-   ThirdartyEmailpassword recipe added
-   sessionFeature config that allows user to set jwtPayload and sessionData during signup or signin
-   Changed error handling

## [4.0.1] - 2021-03-01

### Changed

-   Type of authorisationRedirect params to include a function

## [4.0.0] - 2021-02-02

### Changed

-   using jsonschema to validate user config input (https://github.com/supertokens/supertokens-node/issues/73)
-   Fixed https://github.com/supertokens/supertokens-node/issues/77
-   Extracts email verification into its own recipe
-   Implements thirdparty recipe
-   Sends telemetryId for telemetry

## [3.4.2] - 2021-01-09

## Added

-   Telemetry as per https://github.com/supertokens/supertokens-node/issues/85

## [3.4.1] - 2021-02-06

## Added

-   Allow users to pass FaunaDB client directly when using Session.init
-   Fixes https://github.com/supertokens/supertokens-node/issues/83

## [3.4.0] - 2021-01-28

### Changed

-   enableAntiCsrf as config parameter in session recipe
-   enableAntiCsrf boolean in session create,verify and refresh APIs if CDI version is 2.6
-   cookieSecure to true by default if the apiDomain has https
-   if the apiDomain and websiteDomain values are different (no common top level domain), then cookieSameSite will be set to none by default, else set it to lax
-   Fixed https://github.com/supertokens/supertokens-node/issues/63

## [3.3.2] - 2021-01-29

### Fixed

-   Always sets httpOnly flag to be true for session cookies regardless of if secure flag is on or off.

## [3.3.1] - 2021-01-20

### Changed

-   Update superTokensNextWrapper to add a return value.

## [3.3.0] - 2021-01-13

### Added

-   Email verification feature
-   Change the User object to include timeJoined
-   Sends emails to our APIs only if not testing mode
-   Add superTokensNextWrapper generic express middleware wrapper
-   getUsersNewestFirst, getUsersOldestFirst and getUserCount functions

### Fixed

-   Bump axios from 0.19 to 0.21 to fix Critical Dependency

## [3.2.2] - 2020-12-18

### Fixed

-   Removes the need for Proxy in NextJS so that if a session is created manually by the user, it still works

## [3.2.1] - 2020-12-16

### Fixed

-   Fixes bug for missing return in nextjs helper
-   Changed name from supertokenMiddleware to superTokensMiddleware

## [3.2.0] - 2020-12-13

### Changed

-   Add NextJS helper

## [3.1.1] - 2020-12-12

### Changed

-   If `init` is called multiple times, it does not throw an error

## [3.1.0] - 2020-11-26

### Added

-   Added changes as per new FDI: https://github.com/supertokens/frontend-driver-interface/issues/3
    -   API to check if an email exists

## [3.0.0] - 2020-11-18

### Added

-   EmailPassword login features
    -   https://github.com/supertokens/supertokens-node/pull/29

### Changed

-   Restructures sessions to be its own recipe
-   Other changes:
    -   https://github.com/supertokens/supertokens-node/pull/24
    -   https://github.com/supertokens/supertokens-node/pull/25
    -   https://github.com/supertokens/supertokens-node/pull/45

## [2.5.0] - 2020-09-19

### Added

-   FaunaDB integration

## [2.4.1] - 2020-10-15

### Fixed

-   Issue #17 - Do not clear cookies if they do not exist in the first place

## [2.4.0] - 2020-09-10

### Added

-   Support for CDI 2.3 and FDI 1.2
-   Fixes issue #7
-   Remove compatibility with CDI 1.0

## [2.3.0] - 2020-08-05

### Added

-   auth0Handler function
-   `getCORSAllowedHeaders` function to be used by `cors` middleware
-   Automatically adds a refresh API if the user calls the `init` function inside `app.use()`
-   Support for CDI 2.2

## [2.2.2] - 2020-07-30

### Fixed

-   Fixes #2 - Prevents duplicate `Access-Control-Allow-Credentials` header value

## [2.2.1] - 2020-07-14

### Fixed

-   Fixed typo in exported typescript type

## [2.2.0] - 2020-06-29

### Addition

-   Support for API key
-   Compatibility with CDI 2.1

## [2.1.0] - 2020-06-18

### Changes

-   config changes and code refactor

## [2.0.0] - 2020-05-04

### Added

-   Middleware for verification, refreshing and error handling
-   `revokeMultipleSessions` function
-   `updateJWTPayload` function

### Changes

-   Code refactor

### Breaking changes

-   Changed `revokeSessionUsingSessionHandle` => `revokeSession`

## [1.1.0] - 2020-04-19

### Added

-   Support for [CDI version 2.0](https://github.com/supertokens/core-driver-interface/blob/master/v2.0.0.txt)
