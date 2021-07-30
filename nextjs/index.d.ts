export * from "../lib/build/nextjs";
/**
 * 'export *' does not re-export a default.
 * import NextJS from "supertokens-node/nextjs";
 * the above import statement won't be possible unless either
 * - user add "esModuleInterop": true in their tsconfig.json file
 * - we do the following change:
 */

import * as _default from "../lib/build/nextjs";
export default _default;
