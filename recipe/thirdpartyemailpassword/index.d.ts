export * from "../../lib/build/recipe/thirdpartyemailpassword";
/**
 * 'export *' does not re-export a default.
 * import ThirdPartyEmailPassword from "supertokens-node/recipe/thirdpartyemailpassword";
 * the above import statement won't be possible unless either
 * - user add "esModuleInterop": true in their tsconfig.json file
 * - we do the following change:
 */
import * as _default from "../../lib/build/recipe/thirdpartyemailpassword";
export default _default;
