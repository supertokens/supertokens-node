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

echo "Testing with frontend auth-react: $2, node tag: $3, FREE core: $coreVersion, plugin-interface: $pluginInterfaceVersion"

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
git clone git@github.com:supertokens/supertokens-auth-react.git
cd supertokens-auth-react
git checkout $2
npm run init
(cd ./examples/for-tests && npm run link) # this is there because in linux machine, postinstall in npm doesn't work..
cd ./test/server/

# We do not update the node-SDK in the test server we have in the auth-react repo because:
#  1. it's only supposed to be used for test setup related things (e.g.: starting/configuring core)
#  2. the current version may have an incompatible interface with it (this is problem esp with removed/changed recipes & configs)
# npm i git+https://github.com:supertokens/supertokens-node.git#$3

npm i
cd ../../
cd ../project/test/auth-react-server
npm i
mkdir -p ~/test_report

apiPort=8083

echo "Testing with frontend auth-react: $2, node tag: $3, FREE core: $coreVersion, plugin-interface: $pluginInterfaceVersion" >> ~/test_report/backend.log
NODE_PORT=$apiPort DEBUG=com.supertokens TEST_MODE=testing node . >> ~/test_report/backend.log 2>&1 &
pid=$!
cd ../../../supertokens-auth-react/

# Exit script from startEndToEnd func.
trap "exit 1" TERM
export EXIT_PID=$$

function killServers () {
    if [[ "${SERVER_STARTED}" != "true" ]]; then
        echo "Kill servers."
        lsof -i tcp:8082 | grep -m 1 node | awk '{printf $2}' | cut -c 1- | xargs -I {} kill -9 {} > /dev/null 2>&1
        lsof -i tcp:3031 | grep -m 1 node | awk '{printf $2}' | cut -c 1- | xargs -I {} kill -9 {} > /dev/null 2>&1
    else
        echo "Leaving servers running because SERVER_STARTED=true"
    fi
}

#
# Run.
#

trap "killServers" EXIT # Trap to execute on script shutdown


# Start by killing any servers up on 8082 and 3031 if any.
killServers

mkdir -p ~/test_report/logs
mkdir -p ~/test_report/react-logs
mkdir -p ~/test_report/screenshots

echo "Running tests with React 18"
# Run node server in background.
if [[ "${SERVER_STARTED}" != "true" ]]; then
    (cd test/server/ && TEST_MODE=testing INSTALL_PATH=../../../supertokens-root NODE_PORT=8082 node . >> ~/test_report/react-logs/backend.log 2>&1 &)

    (cd ./examples/for-tests/ && cat | CI=true BROWSER=none PORT=3031 REACT_APP_API_PORT=$apiPort npm run start >> ~/test_report/react-logs/frontend.log 2>&1 &)
fi
# Start front end test app and run tests.

# Wait for the test app to be up before running tests.
while ! curl -s localhost:3031 > /dev/null 2>&1
do
    echo "Waiting for front end test application to start..."
    sleep 5
done

while ! curl -s localhost:8082 > /dev/null 2>&1
do
    echo "Waiting for backend test application to start..."
    sleep 5
done

sleep 2 # Because the server is responding does not mean the app is ready. Let's wait another 2secs to make sure the app is up.
echo "Start mocha testing"

if ! [[ -z "${CI}" ]]; then
    export SPEC_FILES=$(circleci tests glob 'test/end-to-end/**/*.test.js' 'test/unit/**/*.test.js')
    echo "Selected spec files: $SPEC_FILES, $CIRCLE_NODE_TOTAL/$CIRCLE_NODE_INDEX"
fi

SCREENSHOT_ROOT=~/test_report/screenshots APP_SERVER=$apiPort TEST_MODE=testing mocha --bail=$BAIL --require @babel/register --require test/test.mocha.env --timeout 40000 --no-config $SPEC_FILES
testPassed=$?;
if ! [[ -z "${CI}" ]]; then
    cp ../supertokens-root/logs/error.log ~/test_report/logs/core_error.log
    cp ../supertokens-root/logs/info.log ~/test_report/logs/core_info.log
fi
echo "testPassed exit code: $testPassed"
killServers

if [[ $testPassed -ne 0 ]]
then
    echo "test failed... exiting!"
    rm -rf ./test/server/node_modules/supertokens-node
    git checkout HEAD -- ./test/server/package.json
    kill -9 $pid
    exit 1
fi
rm -rf ./test/server/node_modules/supertokens-node
git checkout HEAD -- ./test/server/package.json
kill -9 $pid