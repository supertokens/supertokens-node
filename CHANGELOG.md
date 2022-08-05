# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

## [unreleased]

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
