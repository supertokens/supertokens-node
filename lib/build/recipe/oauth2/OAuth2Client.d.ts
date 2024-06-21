// @ts-nocheck
import { OAuth2ClientOptions } from "./types";
export declare class OAuth2Client {
    /**
     * OAuth 2.0 Client ID
     * The ID is immutable. If no ID is provided, a UUID4 will be generated.
     */
    clientId: string;
    /**
     * OAuth 2.0 Client Secret
     * The secret will be included in the create request as cleartext, and then
     * never again. The secret is kept in hashed format and is not recoverable once lost.
     */
    clientSecret: string;
    /**
     * OAuth 2.0 Client Name
     * The human-readable name of the client to be presented to the end-user during authorization.
     */
    clientName: string;
    /**
     * OAuth 2.0 Client Scope
     * Scope is a string containing a space-separated list of scope values that the client
     * can use when requesting access tokens.
     */
    scope: string;
    /**
     * Array of redirect URIs
     * StringSliceJSONFormat represents []string{} which is encoded to/from JSON for SQL storage.
     */
    redirectUris: string[] | null;
    /**
     * Authorization Code Grant Access Token Lifespan
     * NullDuration - ^[0-9]+(ns|us|ms|s|m|h)$
     */
    authorizationCodeGrantAccessTokenLifespan: string | null;
    /**
     * Authorization Code Grant ID Token Lifespan
     * NullDuration - ^[0-9]+(ns|us|ms|s|m|h)$
     */
    authorizationCodeGrantIdTokenLifespan: string | null;
    /**
     * Authorization Code Grant Refresh Token Lifespan
     * NullDuration - ^[0-9]+(ns|us|ms|s|m|h)$
     */
    authorizationCodeGrantRefreshTokenLifespan: string | null;
    /**
     * Client Credentials Grant Access Token Lifespan
     * NullDuration - ^[0-9]+(ns|us|ms|s|m|h)$
     */
    clientCredentialsGrantAccessTokenLifespan: string | null;
    /**
     * Implicit Grant Access Token Lifespan
     * NullDuration - ^[0-9]+(ns|us|ms|s|m|h)$
     */
    implicitGrantAccessTokenLifespan: string | null;
    /**
     * Implicit Grant ID Token Lifespan
     * NullDuration - ^[0-9]+(ns|us|ms|s|m|h)$
     */
    implicitGrantIdTokenLifespan: string | null;
    /**
     * JWT Bearer Grant Access Token Lifespan
     * NullDuration - ^[0-9]+(ns|us|ms|s|m|h)$
     */
    jwtBearerGrantAccessTokenLifespan: string | null;
    /**
     * Refresh Token Grant Access Token Lifespan
     * NullDuration - ^[0-9]+(ns|us|ms|s|m|h)$
     */
    refreshTokenGrantAccessTokenLifespan: string | null;
    /**
     * Refresh Token Grant ID Token Lifespan
     * NullDuration - ^[0-9]+(ns|us|ms|s|m|h)$
     */
    refreshTokenGrantIdTokenLifespan: string | null;
    /**
     * Refresh Token Grant Refresh Token Lifespan
     * NullDuration - ^[0-9]+(ns|us|ms|s|m|h)$
     */
    refreshTokenGrantRefreshTokenLifespan: string | null;
    /**
     * OAuth 2.0 Token Endpoint Authentication Method
     * Requested Client Authentication method for the Token Endpoint.
     */
    tokenEndpointAuthMethod: string;
    /**
     * OAuth 2.0 Token Endpoint Signing Algorithm
     * Requested Client Authentication signing algorithm for the Token Endpoint.
     */
    tokenEndpointAuthSigningAlg?: string;
    /**
     * OAuth 2.0 Access Token Strategy
     * AccessTokenStrategy is the strategy used to generate access tokens.
     * Valid options are jwt and opaque.
     */
    accessTokenStrategy?: "jwt" | "opaque";
    /**
     * OpenID Connect Back-Channel Logout Session Required
     * Boolean value specifying whether the RP requires that a sid (session ID) Claim be included in the Logout
     * Token to identify the RP session with the OP when the backchannel_logout_uri is used.
     * If omitted, the default value is false.
     */
    backchannelLogoutSessionRequired?: boolean;
    /**
     * OpenID Connect Back-Channel Logout URI
     * RP URL that will cause the RP to log itself out when sent a Logout Token by the OP.
     */
    backchannelLogoutUri?: string;
    /**
     * OpenID Connect Front-Channel Logout Session Required
     * Boolean value specifying whether the RP requires that iss (issuer) and sid (session ID) query parameters be
     * included to identify the RP session with the OP when the frontchannel_logout_uri is used.
     * If omitted, the default value is false.
     */
    frontchannelLogoutSessionRequired?: boolean;
    /**
     * OpenID Connect Front-Channel Logout URI
     * RP URL that will cause the RP to log itself out when rendered in an iframe by the OP.
     */
    frontchannelLogoutUri?: string;
    /**
     * OpenID Connect Request Object Signing Algorithm
     * JWS alg algorithm that MUST be used for signing Request Objects sent to the OP. All Request Objects
     * from this Client MUST be rejected, if not signed with this algorithm.
     */
    requestObjectSigningAlg?: string;
    /**
     * OpenID Connect Sector Identifier URI
     * URL using the https scheme to be used in calculating Pseudonymous Identifiers by the OP. The URL references a
     * file with a single JSON array of redirect_uri values.
     */
    sectorIdentifierUri?: string;
    /**
     * OpenID Connect Request Userinfo Signed Response Algorithm
     * JWS alg algorithm REQUIRED for signing UserInfo Responses. If this is specified, the response will be JWT
     * serialized, and signed using JWS.
     */
    userinfoSignedResponseAlg: string;
    /**
     * OAuth 2.0 Client JSON Web Key Set
     * Client's JSON Web Key Set [JWK] document, passed by value.
     */
    jwks: Record<any, any>;
    /**
     * OAuth 2.0 Client JSON Web Key Set URL
     * URL for the Client's JSON Web Key Set [JWK] document.
     */
    jwksUri?: string;
    /**
     * OAuth 2.0 Client Owner
     * Owner is a string identifying the owner of the OAuth 2.0 Client.
     */
    owner: string;
    /**
     * OAuth 2.0 Client URI
     * ClientURI is a URL string of a web page providing information about the client.
     */
    clientUri: string;
    /**
     * Array of allowed CORS origins
     * StringSliceJSONFormat represents []string{} which is encoded to/from JSON for SQL storage.
     */
    allowedCorsOrigins: string[];
    /**
     * Array of audiences
     * StringSliceJSONFormat represents []string{} which is encoded to/from JSON for SQL storage.
     */
    audience: string[];
    /**
     * Array of grant types
     * StringSliceJSONFormat represents []string{} which is encoded to/from JSON for SQL storage.
     */
    grantTypes: string[] | null;
    /**
     * Array of post-logout redirect URIs
     * StringSliceJSONFormat represents []string{} which is encoded to/from JSON for SQL storage.
     */
    postLogoutRedirectUris?: string[];
    /**
     * Array of request URIs
     * StringSliceJSONFormat represents []string{} which is encoded to/from JSON for SQL storage.
     */
    requestUris?: string[];
    /**
     * Array of response types
     * StringSliceJSONFormat represents []string{} which is encoded to/from JSON for SQL storage.
     */
    responseTypes: string[] | null;
    /**
     * Array of contacts
     * StringSliceJSONFormat represents []string{} which is encoded to/from JSON for SQL storage.
     */
    contacts: string[] | null;
    /**
     * OAuth 2.0 Client Logo URI
     * A URL string referencing the client's logo.
     */
    logoUri: string;
    /**
     * OAuth 2.0 Client Policy URI
     * PolicyURI is a URL string that points to a human-readable privacy policy document
     * that describes how the deployment organization collects, uses,
     * retains, and discloses personal data.
     */
    policyUri: string;
    /**
     * OAuth 2.0 Client Terms of Service URI
     * A URL string pointing to a human-readable terms of service
     * document for the client that describes a contractual relationship
     * between the end-user and the client that the end-user accepts when
     * authorizing the client.
     */
    tosUri: string;
    /**
     * SkipConsent skips the consent screen for this client. This field can only
     * be set from the admin API.
     */
    skipConsent: boolean;
    /**
     * SkipLogoutConsent skips the logout consent screen for this client. This field can only
     * be set from the admin API.
     */
    skipLogoutConsent: boolean | null;
    /**
     * OpenID Connect Subject Type
     * Valid types include pairwise and public.
     */
    subjectType: string;
    /**
     * OAuth 2.0 Client Creation Date
     * CreatedAt returns the timestamp of the client's creation.
     */
    createdAt: string;
    /**
     * OAuth 2.0 Client Last Update Date
     * UpdatedAt returns the timestamp of the last update.
     */
    updatedAt: string;
    /**
     * OpenID Connect Dynamic Client Registration Access Token
     * RegistrationAccessToken can be used to update, get, or delete the OAuth2 Client. It is sent when creating a client
     * using Dynamic Client Registration.
     */
    registrationAccessToken: string;
    /**
     * OpenID Connect Dynamic Client Registration URL
     * RegistrationClientURI is the URL used to update, get, or delete the OAuth2 Client.
     */
    registrationClientUri: string;
    /**
     * Metadata - JSON object
     * JSONRawMessage represents a json.RawMessage that works well with JSON, SQL, and Swagger.
     */
    metadata: Record<string, any>;
    constructor({
        clientId,
        clientSecret,
        clientName,
        scope,
        redirectUris,
        authorizationCodeGrantAccessTokenLifespan,
        authorizationCodeGrantIdTokenLifespan,
        authorizationCodeGrantRefreshTokenLifespan,
        clientCredentialsGrantAccessTokenLifespan,
        implicitGrantAccessTokenLifespan,
        implicitGrantIdTokenLifespan,
        jwtBearerGrantAccessTokenLifespan,
        refreshTokenGrantAccessTokenLifespan,
        refreshTokenGrantIdTokenLifespan,
        refreshTokenGrantRefreshTokenLifespan,
        tokenEndpointAuthMethod,
        tokenEndpointAuthSigningAlg,
        accessTokenStrategy,
        backchannelLogoutSessionRequired,
        backchannelLogoutUri,
        frontchannelLogoutSessionRequired,
        frontchannelLogoutUri,
        requestObjectSigningAlg,
        sectorIdentifierUri,
        userinfoSignedResponseAlg,
        jwks,
        jwksUri,
        owner,
        clientUri,
        allowedCorsOrigins,
        audience,
        grantTypes,
        postLogoutRedirectUris,
        requestUris,
        responseTypes,
        contacts,
        logoUri,
        policyUri,
        tosUri,
        skipConsent,
        skipLogoutConsent,
        subjectType,
        createdAt,
        updatedAt,
        registrationAccessToken,
        registrationClientUri,
        metadata,
    }: OAuth2ClientOptions);
    static fromAPIResponse(response: any): OAuth2Client;
}
