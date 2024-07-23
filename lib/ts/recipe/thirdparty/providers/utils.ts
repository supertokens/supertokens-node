import { ProviderConfigForClientType } from "../types";
import { getOIDCDiscoveryInfo } from "../../../thirdpartyUtils";

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
