export * from "../../lib/build/recipe/webauthn";
/**
 * 'export *' does not re-export a default.
 * import NextJS from "supertokens-node/nextjs";
 * the above import statement won't be possible unless either
 * - user add "esModuleInterop": true in their tsconfig.json file
 * - we do the following change:
 */
import * as _default from "../../lib/build/recipe/webauthn";
export default _default;
