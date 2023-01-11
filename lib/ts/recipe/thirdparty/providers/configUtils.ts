import {
    ActiveDirectory,
    Apple,
    BoxySAML,
    Discord,
    Facebook,
    Github,
    Google,
    GoogleWorkspaces,
    Linkedin,
    Okta,
} from ".";
import {
    ProviderClientConfig,
    ProviderConfig,
    ProviderConfigForClientType,
    ProviderInput,
    TypeProvider,
} from "../types";
import NewProvider from "./custom";
import { discoverOIDCEndpoints } from "./utils";

export function getProviderConfigForClient(
    providerConfig: ProviderConfig,
    clientConfig: ProviderClientConfig
): ProviderConfigForClientType {
    return {
        ...providerConfig,
        ...clientConfig,
    };
}

async function fetchAndSetConfig(provider: TypeProvider, clientType: string | undefined, userContext: any) {
    let config = await provider.getConfigForClientType({ clientType, userContext });

    config = await discoverOIDCEndpoints(config);

    provider.config = config;
}

function createProvider(input: ProviderInput): TypeProvider {
    switch (input.config.thirdPartyId) {
        case "active-directory":
            return ActiveDirectory(input);
        case "apple":
            return Apple(input);
        case "discord":
            return Discord(input);
        case "facebook":
            return Facebook(input);
        case "github":
            return Github(input);
        case "google":
            return Google(input);
        case "google-workspaces":
            return GoogleWorkspaces(input);
        case "okta":
            return Okta(input);
        case "linkedin":
            return Linkedin(input);
        case "boxy-saml":
            return BoxySAML(input);
    }

    return NewProvider(input);
}

export async function findAndCreateProviderInstance(
    providers: ProviderInput[],
    thirdPartyId: string,
    clientType: string | undefined,
    userContext: any
): Promise<TypeProvider> {
    for (const providerInput of providers) {
        if (providerInput.config.thirdPartyId === thirdPartyId) {
            let providerInstance = createProvider(providerInput);
            await fetchAndSetConfig(providerInstance, clientType, userContext);
            return providerInstance;
        }
    }
    throw new Error(`the provider ${thirdPartyId} could not be found in the configuration`);
}

export function mergeConfig(staticConfig: ProviderConfig, coreConfig: ProviderConfig): ProviderConfig {
    const result = {
        ...staticConfig,
        ...coreConfig,
        userInfoMap: {
            fromIdTokenPayload: {
                ...staticConfig.userInfoMap?.fromIdTokenPayload,
                ...coreConfig.userInfoMap?.fromIdTokenPayload,
            },
            fromUserInfoAPI: {
                ...staticConfig.userInfoMap?.fromUserInfoAPI,
                ...coreConfig.userInfoMap?.fromUserInfoAPI,
            },
        },
    };

    const mergedClients = [...(staticConfig.clients || [])];
    for (const client of coreConfig.clients || []) {
        const index = mergedClients.findIndex((c) => c.clientType === client.clientType);
        if (index === -1) {
            mergedClients.push(client);
        } else {
            mergedClients[index] = {
                ...client,
            };
        }
    }
    result.clients = mergedClients;

    return result;
}

export function mergeProvidersFromCoreAndStatic(
    tenantId: string | undefined,
    providerConfigsFromCore: ProviderConfig[],
    providerInputsFromStatic: ProviderInput[]
): ProviderInput[] {
    const mergedProviders: ProviderInput[] = [];

    if (providerConfigsFromCore.length === 0) {
        for (const config of providerInputsFromStatic) {
            config.config.tenantId = tenantId;
            mergedProviders.push(config);
        }
    } else {
        for (const providerConfigFromCore of providerConfigsFromCore) {
            let mergedProviderInput: ProviderInput = {
                config: providerConfigFromCore,
            };

            for (const providerInputFromStatic of providerInputsFromStatic) {
                if (providerInputFromStatic.config.thirdPartyId == providerConfigFromCore.thirdPartyId) {
                    mergedProviderInput.config = mergeConfig(providerInputFromStatic.config, providerConfigFromCore);
                    mergedProviderInput.override = providerInputFromStatic.override;
                    break;
                }
            }

            mergedProviders.push(mergedProviderInput);
        }
    }

    return mergedProviders;
}
