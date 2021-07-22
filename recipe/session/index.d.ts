export * from "../../lib/build/recipe/session";
/**
 * 'export *' does not re-export a default.
 * import Session from "supertokens-node/recipe/session";
 * the above import statement won't be possible unless either
 * - user add "esModuleInterop": true in their tsconfig.json file
 * - we do the following change:
 */

import * as _default from "../../lib/build/recipe/session";
export default _default;
