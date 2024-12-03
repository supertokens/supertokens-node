coreVersionXYParam=`echo $1 | tr -d '"'`
coreVersionXY=$coreVersionXYParam

if [ -f "cdi-core-map.json" ]
then
    coreTag=`cat cdi-core-map.json | jq '.["'$coreVersionXYParam'"]' | tr -d '"'`
    if [ "$coreTag" != "null" ]
    then
        coreVersion=$coreTag
        coreVersionXY=$coreTag
    fi
fi

if [ -z "$coreVersion" ]
then
    coreInfo=`curl -s -X GET \
    "https://api.supertokens.io/0/core/latest?password=$SUPERTOKENS_API_KEY&planType=FREE&mode=DEV&version=$1" \
    -H 'api-version: 0'`
    if [[ `echo $coreInfo | jq .tag` == "null" ]]
    then
        echo "fetching latest X.Y.Z version for core, X.Y version: $1, planType: FREE gave response: $coreInfo"
        exit 1
    fi
    coreTag=$(echo $coreInfo | jq .tag | tr -d '"')
    coreVersion=$(echo $coreInfo | jq .version | tr -d '"')
fi

if [ -f "cdi-plugin-interface-map.json" ]
then
    pluginInterfaceTag=`cat cdi-plugin-interface-map.json | jq '.["'$coreVersionXYParam'"]' | tr -d '"'`
    if [ "$pluginInterfaceTag" != "null" ]
    then
        pluginInterfaceVersionXY=$pluginInterfaceTag
        pluginInterfaceVersion=$pluginInterfaceTag
    fi
fi

if [ -z "$pluginInterfaceVersion" ]
then
    pluginInterfaceVersionXY=`curl -s -X GET \
    "https://api.supertokens.io/0/core/dependency/plugin-interface/latest?password=$SUPERTOKENS_API_KEY&planType=FREE&mode=DEV&version=$1" \
    -H 'api-version: 0'`
    if [[ `echo $pluginInterfaceVersionXY | jq .pluginInterface` == "null" ]]
    then
        echo "fetching latest X.Y version for plugin-interface, given core X.Y version: $1, planType: FREE gave response: $pluginInterfaceVersionXY"
        exit 1
    fi
    pluginInterfaceVersionXY=$(echo $pluginInterfaceVersionXY | jq .pluginInterface | tr -d '"')

    pluginInterfaceInfo=`curl -s -X GET \
    "https://api.supertokens.io/0/plugin-interface/latest?password=$SUPERTOKENS_API_KEY&planType=FREE&mode=DEV&version=$pluginInterfaceVersionXY" \
    -H 'api-version: 0'`
    if [[ `echo $pluginInterfaceInfo | jq .tag` == "null" ]]
    then
        echo "fetching latest X.Y.Z version for plugin-interface, X.Y version: $pluginInterfaceVersionXY, planType: FREE gave response: $pluginInterfaceInfo"
        exit 1
    fi
    pluginInterfaceTag=$(echo $pluginInterfaceInfo | jq .tag | tr -d '"')
    pluginInterfaceVersion=$(echo $pluginInterfaceInfo | jq .version | tr -d '"')
fi

echo "Testing with frontend website: $2, FREE core: $coreVersion, plugin-interface: $pluginInterfaceVersion"

mkdir -p ~/test_report

cd ../../
git clone git@github.com:supertokens/supertokens-root.git
cd supertokens-root
echo -e "core,$coreVersionXY\nplugin-interface,$pluginInterfaceVersionXY" > modules.txt
./loadModules --ssh
cd supertokens-core
git checkout $coreTag

# Update oauth provider config in devConfig.yaml
sed -i 's/# oauth_provider_public_service_url:/oauth_provider_public_service_url: "http:\/\/localhost:4444"/' devConfig.yaml
sed -i 's/# oauth_provider_admin_service_url:/oauth_provider_admin_service_url: "http:\/\/localhost:4445"/' devConfig.yaml
sed -i 's/# oauth_provider_consent_login_base_url:/oauth_provider_consent_login_base_url: "http:\/\/localhost:3001\/auth"/' devConfig.yaml
sed -i 's/# oauth_client_secret_encryption_key:/oauth_client_secret_encryption_key: "asdfasdfasdfasdfasdf"/' devConfig.yaml

cd ../supertokens-plugin-interface
git checkout $pluginInterfaceTag
cd ../
echo $SUPERTOKENS_API_KEY > apiPassword
./utils/setupTestEnvLocal
cd ../
git clone git@github.com:supertokens/supertokens-website.git
cd supertokens-website
git checkout $2
cd ../project/test/frontendIntegration/
npm i -d
TEST_MODE=testing node . &
pid=$!
TEST_MODE=testing NODE_PORT=8082 node . &
pid2=$!
cd ../../../supertokens-website/test/server
npm i git+https://github.com:supertokens/supertokens-node.git#$3
npm i
cd ../../
npm i -d

TEST_FILES=$(circleci tests glob "test/**/*.test.js")
TEST_MODE=testing SUPERTOKENS_CORE_TAG=$coreTag NODE_PORT=8081 INSTALL_PATH=../supertokens-root multi="spec=- mocha-junit-reporter=./junit-results.xml" echo "$TEST_FILES" | circleci tests run --command="xargs npx mocha mocha --node-option no-experimental-fetch -r test/fetch-polyfill.mjs --reporter mocha-multi --require @babel/register --require test/test.mocha.env --timeout 40000 --no-config" --verbose --split-by=timings

if [[ $? -ne 0 ]]
then
    echo "test failed... exiting!"
    rm -rf ./test/server/node_modules/supertokens-node
    git checkout HEAD -- ./test/server/package.json
    kill -9 $pid
    kill -9 $pid2
    exit 1
fi
rm -rf ./test/server/node_modules/supertokens-node
git checkout HEAD -- ./test/server/package.json
kill -9 $pid
kill -9 $pid2