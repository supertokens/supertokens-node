import { paths as pathsV5_3 } from "./versions/5.3/schema";

// NOTE: Uncomment the following code if there
// are more than one CDI versions being used.
// E.g. usage: export type paths = MergePaths<pathsV1, pathsV2>;

// type MergePaths<P1, P2> = {
//     [K in keyof P1 | keyof P2]:
//       K extends keyof P1
//         ? K extends keyof P2
//           ? MergeMethods<P1[K], P2[K]>
//           : P1[K]
//         : K extends keyof P2
//           ? P2[K]
//           : never;
// };

// type MergeMethods<M1, M2> = {
//     [K in keyof M1 | keyof M2]:
//       K extends keyof M1
//         ? K extends keyof M2
//           ? M1[K] | M2[K]
//           : M1[K]
//         : K extends keyof M2
//           ? M2[K]
//           : never;
// };

export type paths = pathsV5_3;
