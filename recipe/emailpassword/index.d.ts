export * from "../../lib/build/recipe/emailpassword";
/**
 * 'export *' does not re-export a default.
 * import EmailPassword from "supertokens-node/recipe/emailpassword";
 * the above import statement won't be possible unless either
 * - user add "esModuleInterop": true in their tsconfig.json file
 * - we do the following change:
 */

import * as _default from "../../lib/build/recipe/emailpassword";
export default _default;
