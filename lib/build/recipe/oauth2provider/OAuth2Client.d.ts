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
    clientSecret?: string;
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
     * Array of response types
     * StringSliceJSONFormat represents []string{} which is encoded to/from JSON for SQL storage.
     */
    responseTypes: string[] | null;
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
        refreshTokenGrantAccessTokenLifespan,
        refreshTokenGrantIdTokenLifespan,
        refreshTokenGrantRefreshTokenLifespan,
        tokenEndpointAuthMethod,
        clientUri,
        allowedCorsOrigins,
        audience,
        grantTypes,
        responseTypes,
        logoUri,
        policyUri,
        tosUri,
        createdAt,
        updatedAt,
        metadata,
    }: OAuth2ClientOptions);
    static fromAPIResponse(response: any): OAuth2Client;
}