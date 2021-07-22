export * from "../../lib/build/recipe/thirdparty";
/**
 * 'export *' does not re-export a default.
 * import ThirdParty from "supertokens-node/recipe/thirdparty";
 * the above import statement won't be possible unless either
 * - user add "esModuleInterop": true in their tsconfig.json file
 * - we do the following change:
 */

import * as _default from "../../lib/build/recipe/thirdparty";
export default _default;
