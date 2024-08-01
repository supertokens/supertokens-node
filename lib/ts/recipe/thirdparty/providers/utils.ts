import { ProviderConfigForClientType } from "../types";
import { getOIDCDiscoveryInfo } from "../../../thirdpartyUtils";
import NormalisedURLDomain from "../../../normalisedURLDomain";
import NormalisedURLPath from "../../../normalisedURLPath";

export async function discoverOIDCEndpoints(config: ProviderConfigForClientType): Promise<void> {
    if (config.oidcDiscoveryEndpoint !== undefined) {
        const oidcInfo = await getOIDCDiscoveryInfo(config.oidcDiscoveryEndpoint);

        if (oidcInfo.authorization_endpoint !== undefined && config.authorizationEndpoint === undefined) {
            config.authorizationEndpoint = oidcInfo.authorization_endpoint;
        }

        if (oidcInfo.token_endpoint !== undefined && config.tokenEndpoint === undefined) {
            config.tokenEndpoint = oidcInfo.token_endpoint;
        }

        if (oidcInfo.userinfo_endpoint !== undefined && config.userInfoEndpoint === undefined) {
            config.userInfoEndpoint = oidcInfo.userinfo_endpoint;
        }

        if (oidcInfo.jwks_uri !== undefined && config.jwksURI === undefined) {
            config.jwksURI = oidcInfo.jwks_uri;
        }
    }
}

export function normaliseOIDCEndpointToIncludeWellKnown(url: string): string {
    // we call this only for built-in providers that use OIDC. We no longer generically add well-known in the custom provider
    if (url.endsWith("/.well-known/openid-configuration") === true) {
        return url;
    }

    const normalisedDomain = new NormalisedURLDomain(url);
    const normalisedPath = new NormalisedURLPath(url);
    const normalisedWellKnownPath = new NormalisedURLPath("/.well-known/openid-configuration");

    return (
        normalisedDomain.getAsStringDangerous() +
        normalisedPath.getAsStringDangerous() +
        normalisedWellKnownPath.getAsStringDangerous()
    );
}
