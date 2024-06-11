#!/bin/sh

TEST_PROJECT_DIR=./temp_test_exports

mkdir -p $TEST_PROJECT_DIR

npm pack || exit $?

mv supertokens-node-*.tgz $TEST_PROJECT_DIR
cd $TEST_PROJECT_DIR

npm init -y || exit $?

rm -f index.mjs
touch index.mjs
# We test that all JS files we publish are importable without an extension
tar -t -f ./supertokens-node* | grep \\.js$ | sed 's/^package\/\(.*\)\.js$/import \"supertokens-node\/\1\";/' >> index.mjs
# We test that all JS files we publish are importable with the JS extension
tar -t -f ./supertokens-node* | grep \\.js$ | sed 's/^package\/\(.*\)\.js$/import \"supertokens-node\/\1\.js";/' >> index.mjs
# We test that all folders that have an index.js (outside of /lib/build) are importable as folders.
tar -t -f --exclude package/lib/build ./supertokens-node* | grep package/.*/index\\.js$ | sed 's/^package\/\(.*\)\/index\.js$/import \"supertokens-node\/\1\";/' >> index.mjs
# We also test that the sdk itself is importable
echo 'import "supertokens-node";' >> index.mjs

mkdir -p node_modules/supertokens-node

tar -xvvf supertokens-node-*.tgz --strip-components=1 -C node_modules/supertokens-node package

node index.mjs
EXIT_CODE=$?

cd ..
rm -rf $TEST_PROJECT_DIR
exit $EXIT_CODE

