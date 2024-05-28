import {
    ActiveDirectory,
    Apple,
    Bitbucket,
    BoxySAML,
    Discord,
    Facebook,
    Github,
    Gitlab,
    Google,
    GoogleWorkspaces,
    Linkedin,
    Okta,
    Twitter,
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

    await discoverOIDCEndpoints(config);

    Object.assign(provider.config, config);
}

function createProvider(input: ProviderInput): TypeProvider {
    const clonedInput = { ...input };
    if (clonedInput.config.thirdPartyId.startsWith("active-directory")) {
        return ActiveDirectory(clonedInput);
    } else if (clonedInput.config.thirdPartyId.startsWith("apple")) {
        return Apple(clonedInput);
    } else if (clonedInput.config.thirdPartyId.startsWith("bitbucket")) {
        return Bitbucket(clonedInput);
    } else if (clonedInput.config.thirdPartyId.startsWith("discord")) {
        return Discord(clonedInput);
    } else if (clonedInput.config.thirdPartyId.startsWith("facebook")) {
        return Facebook(clonedInput);
    } else if (clonedInput.config.thirdPartyId.startsWith("github")) {
        return Github(clonedInput);
    } else if (clonedInput.config.thirdPartyId.startsWith("gitlab")) {
        return Gitlab(clonedInput);
    } else if (clonedInput.config.thirdPartyId.startsWith("google-workspaces")) {
        return GoogleWorkspaces(clonedInput);
    } else if (clonedInput.config.thirdPartyId.startsWith("google")) {
        return Google(clonedInput);
    } else if (clonedInput.config.thirdPartyId.startsWith("okta")) {
        return Okta(clonedInput);
    } else if (clonedInput.config.thirdPartyId.startsWith("linkedin")) {
        return Linkedin(clonedInput);
    } else if (clonedInput.config.thirdPartyId.startsWith("twitter")) {
        return Twitter(clonedInput);
    } else if (clonedInput.config.thirdPartyId.startsWith("boxy-saml")) {
        return BoxySAML(clonedInput);
    }

    return NewProvider(clonedInput);
}

export async function findAndCreateProviderInstance(
    providers: ProviderInput[],
    thirdPartyId: string,
    clientType: string | undefined,
    userContext: any
): Promise<TypeProvider | undefined> {
    for (const providerInput of providers) {
        if (providerInput.config.thirdPartyId === thirdPartyId) {
            let providerInstance = createProvider(providerInput);
            await fetchAndSetConfig(providerInstance, clientType, userContext);
            return providerInstance;
        }
    }
    return undefined;
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

    const mergedClients = staticConfig.clients === undefined ? [] : [...staticConfig.clients];
    const coreConfigClients = coreConfig.clients === undefined ? [] : coreConfig.clients;

    for (const client of coreConfigClients) {
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
    providerConfigsFromCore: ProviderConfig[],
    providerInputsFromStatic: ProviderInput[]
): ProviderInput[] {
    const mergedProviders: ProviderInput[] = [];

    if (providerConfigsFromCore.length === 0) {
        for (const config of providerInputsFromStatic) {
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
