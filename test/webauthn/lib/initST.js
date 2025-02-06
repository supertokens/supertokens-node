const { startST, isCDIVersionCompatible } = require("../../utils");
let assert = require("assert");

let STExpress = require("../../../");
let Session = require("../../../recipe/session");
let WebAuthn = require("../../../recipe/webauthn");

const origin = "https://supertokens.io";
const rpId = "supertokens.io";
const rpName = "SuperTokens";

const initST = async (override = true) => {
    const connectionURI = await startST();

    STExpress.init({
        supertokens: {
            connectionURI,
        },
        appInfo: {
            apiDomain: "api.supertokens.io",
            appName: "SuperTokens",
            websiteDomain: "supertokens.io",
        },
        recipeList: [
            Session.init(),
            WebAuthn.init(
                override
                    ? {
                          getOrigin: async () => {
                              return origin;
                          },
                          getRelyingPartyId: async () => {
                              return rpId;
                          },
                          getRelyingPartyName: async () => {
                              return rpName;
                          },
                      }
                    : {}
            ),
        ],
    });

    // run test if current CDI version >= 2.11
    // todo update this to crrect version
    assert(await isCDIVersionCompatible("2.11"));
};

module.exports = { initST, origin, rpId, rpName };
