coreDriverJson=`cat ../coreDriverInterfaceSupported.json`
coreDriverLength=`echo $coreDriverJson | jq ".versions | length"`
coreDriverArray=`echo $coreDriverJson | jq ".versions"`
echo "got core driver relations"

frontendDriverJson=`cat ../frontendDriverInterfaceSupported.json`
frontendDriverLength=`echo $frontendDriverJson | jq ".versions | length"`
frontendDriverArray=`echo $frontendDriverJson | jq ".versions"`
echo "got frontend driver relations"

# get driver version
version=`cat ../package.json | grep -e '"version":'`
while IFS='"' read -ra ADDR; do
    counter=0
    for i in "${ADDR[@]}"; do
        if [ $counter == 3 ]
        then
            version=$i
        fi
        counter=$(($counter+1))
    done
done <<< "$version"

coreDriverVersion=`echo $coreDriverArray | jq ". | last"`
coreDriverVersion=`echo $coreDriverVersion | tr -d '"'`
coreFree="null"

if [ -f cdi-core-map.json ]
then
    cat cdi-core-map.json
    echo "coreDriverVersion: $coreDriverVersion"

    coreBranchName=`cat cdi-core-map.json | jq -r '.["'$coreDriverVersion'"]'`
    if [ "$coreBranchName" != "null" ]
    then
        coreFree=$coreDriverVersion
    fi
fi

if [ "$coreFree" == "null" ]
then
    coreFree=`curl -s -X GET \
    "https://api.supertokens.io/0/core-driver-interface/dependency/core/latest?password=$SUPERTOKENS_API_KEY&planType=FREE&mode=DEV&version=$coreDriverVersion&driverName=node" \
    -H 'api-version: 1'`
    if [[ `echo $coreFree | jq .core` == "null" ]]
    then
        echo "fetching latest X.Y version for core given core-driver-interface X.Y version: $coreDriverVersion, planType: FREE gave response: $coreFree. Please make sure all relevant cores have been pushed."
        exit 1
    fi
    coreFree=$(echo $coreFree | jq .core | tr -d '"')
fi

frontendDriverVersion=$1
frontendDriverVersion=`echo $frontendDriverVersion | tr -d '"'`

nodeTag="null"
if [ -f fdi-node-map.json ]
then
    nodeTag=`cat fdi-node-map.json | jq '.["'$frontendDriverVersion'"]' | tr -d '"'`
fi

if [ "$nodeTag" == "null" ]
then
    nodeVersionXY=`curl -s -X GET \
    "https://api.supertokens.io/0/frontend-driver-interface/dependency/driver/latest?password=$SUPERTOKENS_API_KEY&mode=DEV&version=$frontendDriverVersion&driverName=node&frontendName=auth-react" \
    -H 'api-version: 1'`
    if [[ `echo $nodeVersionXY | jq .driver` == "null" ]]
    then
        echo "fetching latest X.Y version for driver given frontend-driver-interface X.Y version: $frontendDriverVersion gave response: $nodeVersionXY. Please make sure all relevant drivers have been pushed."
        exit 1
    fi
    nodeVersionXY=$(echo $nodeVersionXY | jq .driver | tr -d '"')

    nodeInfo=`curl -s -X GET \
    "https://api.supertokens.io/0/driver/latest?password=$SUPERTOKENS_API_KEY&mode=DEV&version=$nodeVersionXY&name=node" \
    -H 'api-version: 0'`
    if [[ `echo $nodeInfo | jq .tag` == "null" ]]
    then
        echo "fetching latest X.Y.Z version for driver, X.Y version: $nodeVersionXY gave response: $nodeInfo"
        exit 1
    fi
    nodeTag=$(echo $nodeInfo | jq .tag | tr -d '"')
fi

frontendAuthReactTag="null"
if [ -f fdi-auth-react-map.json ]
then
    frontendAuthReactTag=`cat fdi-auth-react-map.json | jq '.["'$frontendDriverVersion'"]' | tr -d '"'`
fi

if [ "$frontendAuthReactTag" == "null" ]
then
    frontendAuthReactVersionXY=`curl -s -X GET \
    "https://api.supertokens.io/0/frontend-driver-interface/dependency/frontend/latest?password=$SUPERTOKENS_API_KEY&frontendName=auth-react&mode=DEV&version=$frontendDriverVersion&driverName=node" \
    -H 'api-version: 1'`
    if [[ `echo $frontendAuthReactVersionXY | jq .frontend` == "null" ]]
    then
        echo "fetching latest X.Y version for frontend given frontend-driver-interface X.Y version: $frontendDriverVersion, name: auth-react gave response: $frontend. Please make sure all relevant frontend libs have been pushed."
        exit 1
    fi
    frontendAuthReactVersionXY=$(echo $frontendAuthReactVersionXY | jq .frontend | tr -d '"')

    frontendAuthReactInfo=`curl -s -X GET \
    "https://api.supertokens.io/0/frontend/latest?password=$SUPERTOKENS_API_KEY&mode=DEV&version=$frontendAuthReactVersionXY&name=auth-react" \
    -H 'api-version: 0'`
    if [[ `echo $frontendAuthReactInfo | jq .tag` == "null" ]]
    then
        echo "fetching latest X.Y.Z version for frontend, X.Y version: $frontendAuthReactVersionXY gave response: $frontendAuthReactInfo"
        exit 1
    fi
    frontendAuthReactTag=$(echo $frontendAuthReactInfo | jq .tag | tr -d '"')
    frontendAuthReactVersion=$(echo $frontendAuthReactInfo | jq .version | tr -d '"')
fi

if [[ $frontendDriverVersion == '1.3' || $frontendDriverVersion == '1.8' ]]; then
    # we skip this since the tests for auth-react here are not reliable due to race conditions...
    
    # we skip 1.8 since the SDK with just 1.8 doesn't have the right scripts
    continue
else
    tries=1
    while [ $tries -le 3 ]
    do
        tries=$(( $tries + 1 ))
        ./setupAndTestWithAuthReact.sh $coreFree $frontendAuthReactTag $nodeTag
        if [[ $? -ne 0 ]]
        then
            if [[ $tries -le 3 ]]
            then
                rm -rf ../../supertokens-root
                rm -rf ../../supertokens-auth-react
                echo "failed test.. retrying!"
            else
                echo "test failed... exiting!"
                exit 1
            fi
        else
            rm -rf ../../supertokens-root
            rm -rf ../../supertokens-auth-react
            break
        fi
    done
fi
