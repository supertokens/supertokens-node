"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const multitenancy_1 = __importDefault(require("../../../multitenancy"));
const error_1 = __importDefault(require("../../../../error"));
const utils_1 = require("../../../../utils");
async function boxySamlUpload(_, __, options, userContext) {
    var _a, _b, _c, _d, _e, _f, _g;
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
        throw new error_1.default({
            message: "Missing required parameter 'tenantId'",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    if (typeof boxyURL !== "string" || boxyURL === "") {
        throw new error_1.default({
            message: "Missing required parameter 'boxyURL'",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    if (typeof boxyAPIKey !== "string" || boxyAPIKey === "") {
        throw new error_1.default({
            message: "Missing required parameter 'boxyAPIKey'",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    if (typeof product !== "string" || product === "") {
        throw new error_1.default({
            message: "Missing required parameter 'product'",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    if (typeof name !== "string" || name === "") {
        throw new error_1.default({
            message: "Missing required parameter 'name'",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    if (typeof description !== "string" || description === "") {
        throw new error_1.default({
            message: "Missing required parameter 'description'",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    if (typeof redirectURI !== "string" || redirectURI === "") {
        throw new error_1.default({
            message: "Missing required parameter 'redirectURI'",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    if (
        (typeof base64EncodedSAMLMetadata !== "string" || base64EncodedSAMLMetadata === "") &&
        (typeof SAMLMetadataURL !== "string" || SAMLMetadataURL === "")
    ) {
        throw new error_1.default({
            message: "Missing required parameter 'base64EncodedSAMLMetadata' or 'SAMLMetadataURL'",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    let encodedMetadata = base64EncodedSAMLMetadata;
    const thirdPartyId = `boxy-saml${thirdPartyIdSuffix ? `-${thirdPartyIdSuffix}` : ""}`;
    const tenant = await multitenancy_1.default.getTenant(tenantId, userContext);
    const thirdPartyProvider =
        (_b =
            (_a = tenant === null || tenant === void 0 ? void 0 : tenant.thirdParty) === null || _a === void 0
                ? void 0
                : _a.providers) === null || _b === void 0
            ? void 0
            : _b.find((provider) => provider.thirdPartyId === thirdPartyId);
    if (!thirdPartyProvider) {
        return {
            status: "THIRD_PARTY_PROVIDER_DOES_NOT_EXIST",
        };
    }
    if (!encodedMetadata && typeof SAMLMetadataURL === "string") {
        try {
            const response = await utils_1.doFetch(SAMLMetadataURL, {
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
        const response = await utils_1.doFetch(`${boxyURL}/api/v1/saml/config`, {
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
        const alreadyHasClientId =
            (_c =
                thirdPartyProvider === null || thirdPartyProvider === void 0 ? void 0 : thirdPartyProvider.clients) ===
                null || _c === void 0
                ? void 0
                : _c.map((client) => client.clientId).includes(clientID);
        if (alreadyHasClientId) {
            await multitenancy_1.default.createOrUpdateThirdPartyConfig(
                tenantId,
                Object.assign(Object.assign({}, thirdPartyProvider), {
                    clients:
                        (_d = thirdPartyProvider.clients) === null || _d === void 0
                            ? void 0
                            : _d.map((client) => {
                                  if (client.clientId === clientID) {
                                      return Object.assign(Object.assign({}, client), {
                                          clientSecret,
                                          clientType,
                                          additionalConfig: Object.assign(Object.assign({}, client.additionalConfig), {
                                              boxyURL,
                                          }),
                                      });
                                  }
                                  return client;
                              }),
                })
            );
            return {
                status: "OK",
                createdNew: false,
            };
        } else {
            if (
                (((_f = (_e = thirdPartyProvider.clients) === null || _e === void 0 ? void 0 : _e.length) !== null &&
                _f !== void 0
                    ? _f
                    : 0) > 0 &&
                    typeof clientType !== "string") ||
                clientType === ""
            ) {
                throw new error_1.default({
                    message: "Missing required parameter 'clientType' when there are existing clients",
                    type: error_1.default.BAD_INPUT_ERROR,
                });
            }
            await multitenancy_1.default.createOrUpdateThirdPartyConfig(
                tenantId,
                Object.assign(Object.assign({}, thirdPartyProvider), {
                    clients: [
                        ...((_g = thirdPartyProvider.clients) !== null && _g !== void 0 ? _g : []),
                        {
                            clientId: clientID,
                            clientSecret,
                            clientType,
                            additionalConfig: {
                                boxyURL,
                            },
                        },
                    ],
                })
            );
            return {
                status: "OK",
                createdNew: true,
            };
        }
    } catch (e) {
        return {
            status: "BOXY_ERROR",
            message: e.message,
        };
    }
}
exports.default = boxySamlUpload;
