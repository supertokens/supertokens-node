const { startST, isCDIVersionCompatible } = require("../../utils");
let assert = require("assert");

let STExpress = require("../../../");
let Session = require("../../../recipe/session");
let WebAuthn = require("../../../recipe/webauthn");

const _origin = "https://supertokens.io";
const _rpId = "supertokens.io";
const _rpName = "SuperTokens";

const initST = async ({
    origin = _origin,
    rpId = _rpId,
    rpName = _rpName,
    signInTimeout = 10000,
    registerTimeout = 10000,
} = {}) => {
    const connectionURI = await startST();

    const config = {
        override: {
            functions: (originalImplementation) => {
                return {
                    ...originalImplementation,
                    ...(signInTimeout
                        ? {
                              signInOptions: async (input) => {
                                  return originalImplementation.signInOptions({
                                      ...input,
                                      timeout: signInTimeout,
                                  });
                              },
                          }
                        : {}),
                    ...(registerTimeout
                        ? {
                              registerOptions: async (input) => {
                                  return originalImplementation.registerOptions({
                                      ...input,
                                      timeout: registerTimeout,
                                  });
                              },
                          }
                        : {}),
                };
            },
        },
        ...(origin
            ? {
                  getOrigin: async () => {
                      return origin;
                  },
              }
            : {
                  getOrigin: async () => {
                      return "https://api.supertokens.io"; // set it like this because the default value would actually use the origin and it would not match the default relying party id
                  },
              }),
        ...(rpId
            ? {
                  getRelyingPartyId: async () => {
                      return rpId;
                  },
              }
            : {}),
        ...(rpName
            ? {
                  getRelyingPartyName: async () => {
                      return rpName;
                  },
              }
            : {}),
    };

    STExpress.init({
        supertokens: {
            connectionURI,
        },
        appInfo: {
            apiDomain: "api.supertokens.io",
            appName: "SuperTokens",
            websiteDomain: "supertokens.io",
        },
        recipeList: [Session.init(), WebAuthn.init(config)],
    });

    // run test if current CDI version >= 2.11
    // todo update this to crrect version
    assert(await isCDIVersionCompatible("2.11"));
};

module.exports = { initST, origin: _origin, rpId: _rpId, rpName: _rpName };
