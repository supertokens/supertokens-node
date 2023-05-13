import type { Options } from 'tsup'

import pkg from './package.json'
const external = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
]

export default <Options>{
    entryPoints: [
        'lib/ts/**/*.ts',
    ],
    outDir: 'dist',
    format: ['esm', 'cjs'],
    target: 'node14',
    dts: true,
    external,
    clean: true,
    minify: true,
    esbuildOptions: (options) => {
        options.chunkNames = `__chunk/[name]-[hash]`;
    }
}