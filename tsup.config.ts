import type { Options } from 'tsup'

import pkg from './package.json'
const external = [
    ...Object.keys(pkg.dependencies || {}),
]

export default <Options>{
    entryPoints: [
        'src/index.ts', 
        'src/nextjs.ts',
        'src/framework/**/index.ts',
        'src/types.ts',

        'src/recipe/dashboard/index.ts',

        'src/recipe/emailpassword/index.ts',
        'src/recipe/emailpassword/emaildelivery/index.ts',
        'src/recipe/emailverification/index.ts',
        'src/recipe/emailverification/emaildelivery/index.ts',

        'src/recipe/jwt/index.ts',
        'src/recipe/openid/index.ts',

        'src/recipe/passwordless/index.ts',
        'src/recipe/passwordless/emaildelivery/index.ts',
        'src/recipe/passwordless/smsdelivery/index.ts',
        
        'src/recipe/session/framework/**',
        'src/recipe/session/claims.ts',
        'src/recipe/session/index.ts',

        'src/recipe/thirdparty/index.ts',
        'src/recipe/thirdparty/providers/**',

        'src/recipe/thirdpartyemailpassword/index.ts',
        'src/recipe/thirdpartyemailpassword/emaildelivery/index.ts',

        'src/recipe/thirdpartypasswordless/index.ts',
        'src/recipe/thirdpartypasswordless/emaildelivery/index.ts',
        'src/recipe/thirdpartypasswordless/smsdelivery/index.ts',
        
        'src/recipe/usermetadata/index.ts',
        'src/recipe/userroles/index.ts',
    ],
    outDir: 'dist',
    format: ['esm', 'cjs'],
    clean: true,
    dts: true,
    minify: true,
    external,
}