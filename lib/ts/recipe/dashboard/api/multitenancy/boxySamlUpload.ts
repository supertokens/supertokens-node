/* Copyright (c) 2024, VRAI Labs and/or its affiliates. All rights reserved.
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
import { APIInterface, APIOptions } from "../../types";
import Multitenancy from "../../../multitenancy";
import SuperTokensError from "../../../../error";
import { doFetch } from "../../../../utils";

export type Response =
    | {
          status: "THIRD_PARTY_PROVIDER_DOES_NOT_EXIST" | "INVALID_SAML_METADATA_URL";
      }
    | {
          status: "OK";
          createdNew: boolean;
      }
    | {
          status: "BOXY_ERROR";
          message: string;
      };

export default async function boxySamlUpload(
    _: APIInterface,
    __: string,
    options: APIOptions,
    userContext: any
): Promise<Response> {
    const requestBody = await options.req.getJSONBody();
    const {
        tenantId,
        boxyURL,
        boxyAPIKey,
        product,
        name,
        description,
        base64EncodedSAMLMetadata,
        SAMLMetadataURL,
        redirectURI,
        thirdPartyIdSuffix,
        clientType,
    } = requestBody;

    if (typeof tenantId !== "string" || tenantId === "") {
        throw new SuperTokensError({
            message: "Missing required parameter 'tenantId'",
            type: SuperTokensError.BAD_INPUT_ERROR,
        });
    }

    if (typeof boxyURL !== "string" || boxyURL === "") {
        throw new SuperTokensError({
            message: "Missing required parameter 'boxyURL'",
            type: SuperTokensError.BAD_INPUT_ERROR,
        });
    }

    if (typeof boxyAPIKey !== "string" || boxyAPIKey === "") {
        throw new SuperTokensError({
            message: "Missing required parameter 'boxyAPIKey'",
            type: SuperTokensError.BAD_INPUT_ERROR,
        });
    }

    if (typeof product !== "string" || product === "") {
        throw new SuperTokensError({
            message: "Missing required parameter 'product'",
            type: SuperTokensError.BAD_INPUT_ERROR,
        });
    }

    if (typeof name !== "string" || name === "") {
        throw new SuperTokensError({
            message: "Missing required parameter 'name'",
            type: SuperTokensError.BAD_INPUT_ERROR,
        });
    }

    if (typeof description !== "string" || description === "") {
        throw new SuperTokensError({
            message: "Missing required parameter 'description'",
            type: SuperTokensError.BAD_INPUT_ERROR,
        });
    }

    if (typeof redirectURI !== "string" || redirectURI === "") {
        throw new SuperTokensError({
            message: "Missing required parameter 'redirectURI'",
            type: SuperTokensError.BAD_INPUT_ERROR,
        });
    }

    if (
        (typeof base64EncodedSAMLMetadata !== "string" || base64EncodedSAMLMetadata === "") &&
        (typeof SAMLMetadataURL !== "string" || SAMLMetadataURL === "")
    ) {
        throw new SuperTokensError({
            message: "Missing required parameter 'base64EncodedSAMLMetadata' or 'SAMLMetadataURL'",
            type: SuperTokensError.BAD_INPUT_ERROR,
        });
    }

    let encodedMetadata = base64EncodedSAMLMetadata;

    const thirdPartyId = `boxy-saml${thirdPartyIdSuffix ? `-${thirdPartyIdSuffix}` : ""}`;

    const tenant = await Multitenancy.getTenant(tenantId, userContext);
    const thirdPartyProvider = tenant?.thirdParty?.providers?.find(
        (provider) => provider.thirdPartyId === thirdPartyId
    );

    if (!thirdPartyProvider) {
        return {
            status: "THIRD_PARTY_PROVIDER_DOES_NOT_EXIST",
        };
    }

    if (!encodedMetadata && typeof SAMLMetadataURL === "string") {
        try {
            const response = await doFetch(SAMLMetadataURL, {
                method: "get",
            });
            if (response.status >= 400) {
                throw response;
            }
            const xml = await response.text();
            console.log(xml);
            encodedMetadata = Buffer.from(xml).toString("base64");
        } catch (e) {
            return {
                status: "INVALID_SAML_METADATA_URL",
            };
        }
    }

    try {
        const response = await doFetch(`${boxyURL}/api/v1/saml/config`, {
            method: "post",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Api-Key ${boxyAPIKey}`,
            },
            body: new URLSearchParams({
                product,
                name,
                description,
                tenant: tenantId,
                defaultRedirectUrl: redirectURI,
                encodedRawMetadata: encodedMetadata,
                redirectUrl: `${new URL(redirectURI).origin}/*`,
            }),
        });

        if (response.status >= 400) {
            throw response;
        }

        const { clientID, clientSecret } = await response.json();

        const alreadyHasClientId = thirdPartyProvider?.clients?.map((client) => client.clientId).includes(clientID);

        if (alreadyHasClientId) {
            await Multitenancy.createOrUpdateThirdPartyConfig(tenantId, {
                ...thirdPartyProvider,
                clients: thirdPartyProvider.clients?.map((client) => {
                    if (client.clientId === clientID) {
                        return {
                            ...client,
                            clientSecret,
                            clientType,
                            additionalConfig: {
                                ...client.additionalConfig,
                                boxyURL,
                            },
                        };
                    }
                    return client;
                }),
            });

            return {
                status: "OK",
                createdNew: false,
            };
        } else {
            if (
                ((thirdPartyProvider.clients?.length ?? 0) > 0 && typeof clientType !== "string") ||
                clientType === ""
            ) {
                throw new SuperTokensError({
                    message: "Missing required parameter 'clientType' when there are existing clients",
                    type: SuperTokensError.BAD_INPUT_ERROR,
                });
            }

            await Multitenancy.createOrUpdateThirdPartyConfig(tenantId, {
                ...thirdPartyProvider,
                clients: [
                    ...(thirdPartyProvider.clients ?? []),
                    {
                        clientId: clientID,
                        clientSecret,
                        clientType,
                        additionalConfig: {
                            boxyURL,
                        },
                    },
                ],
            });

            return {
                status: "OK",
                createdNew: true,
            };
        }
    } catch (e) {
        return {
            status: "BOXY_ERROR",
            message: (e as Error).message,
        };
    }
}
