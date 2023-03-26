import { resolve } from 'path'
import { existsSync, rmSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'
import { afterAll, describe, it } from 'vitest'
import { getAllFilesInDirectory, printPath } from './utils'

const testFileName = 'importtest.js'
const testFilePath = resolve(process.cwd(), `./${testFileName}`)

describe(`importTests: ${printPath('[test/import.test.js]')}`, () => {
  afterAll(() => {
    // The exists check is just a precaution
    if (existsSync(testFilePath))
      rmSync(testFilePath)
  })

  /**
     * This test does the following:
     * 1. Gets a list of all files in the build folder recursively
     * 2. For each build file, creates a simple js file that imports the build file
     * 3. Runs the generated js file
     *
     * The test fails if there is any error thrown when trying to run any of the generated files.
     *
     * This is to prevent issues arising from circular imports where certain variables from the
     * default exports for recipes are not intialised correctly.
     * (Refer to: https://github.com/supertokens/supertokens-node/issues/513)
     */
  it('Test that importing all build files independently does not cause errors', () => {
    const fileNames = getAllFilesInDirectory(resolve(process.cwd(), './lib/build')).filter(
      i => !i.endsWith('.d.ts'),
    )

    fileNames.forEach((fileName: any) => {
      const relativeFilePath = fileName.replace(process.cwd(), '')
      writeFileSync(testFilePath, `require(".${relativeFilePath}")`)

      // This will throw an error if the command fails
      execSync(`node ${resolve(process.cwd(), `./${testFileName}`)}`)
    })
  })
})
