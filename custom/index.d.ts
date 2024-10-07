export * from "../lib/build/customFramework";
/**
 * 'export *' does not re-export a default.
 * import CustomFramework from "supertokens-node/custom";
 * the above import statement won't be possible unless either
 * - user add "esModuleInterop": true in their tsconfig.json file
 * - we do the following change:
 */

import * as _default from "../lib/build/customFramework";
export default _default;
