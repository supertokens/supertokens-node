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
echo "Testing with FREE core: $coreVersion, plugin-interface: $pluginInterfaceVersion"

mkdir -p ~/test_report
cd ../../
git clone git@github.com:supertokens/supertokens-root.git
cd supertokens-root
if [[ $2 == "2.0" ]] || [[ $2 == "2.1" ]] || [[ $2 == "2.2" ]]
then
    git checkout 36e5af1b9a4e3b07247d0cf333cf82a071a78681
fi
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
cd ../project/
npm i mocha-multi mocha-junit-reporter

# Set the script to exit on error
set -e

export TEST_MODE=testing
export SUPERTOKENS_CORE_TAG=$coreTag
export NODE_PORT=8081
export INSTALL_PATH=../supertokens-root
export MOCHA_FILE=~/test_report/free-core-junit.xml
export multi="spec=- mocha-junit-reporter=$MOCHA_FILE"

TEST_FILES=$(circleci tests glob "test/**/*.test.js")
echo "$TEST_FILES" | circleci tests run --command="xargs npx mocha mocha --reporter mocha-multi --node-option no-experimental-fetch --timeout 40000 --no-config" --verbose --split-by=timings
