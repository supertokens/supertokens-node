// @ts-nocheck
import { ProviderConfigForClientType } from "../types";
export declare function discoverOIDCEndpoints(config: ProviderConfigForClientType): Promise<void>;
export declare function normaliseOIDCEndpointToIncludeWellKnown(url: string): string;
