#!/bin/sh

TEST_PROJECT_DIR=./temp_test_exports

mkdir -p $TEST_PROJECT_DIR

npm pack || exit $?

mv supertokens-node-*.tgz $TEST_PROJECT_DIR
cd $TEST_PROJECT_DIR

npm init -y || exit $?

rm -f index.mjs
touch index.mjs
tar -t -f ./supertokens-node* | grep \\.js$ | sed 's/^package\/\(.*\)\.js$/import \"supertokens-node\/\1\";/' >> index.mjs
tar -t -f ./supertokens-node* | grep \\.js$ | sed 's/^package\/\(.*\)\.js$/import \"supertokens-node\/\1\.js";/' >> index.mjs
tar -t -f --exclude package/lib/build ./supertokens-node* | grep package/.*/index\\.js$ | sed 's/^package\/\(.*\)\/index\.js$/import \"supertokens-node\/\1\";/' >> index.mjs
echo 'import "supertokens-node";' >> index.mjs

mkdir -p node_modules/supertokens-node

tar -xvvf supertokens-node-*.tgz --strip-components=1 -C node_modules/supertokens-node package

node index.mjs
EXIT_CODE=$?

cd ..
rm -rf $TEST_PROJECT_DIR
exit $EXIT_CODE

