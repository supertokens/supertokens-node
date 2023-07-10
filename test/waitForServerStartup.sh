while
    [[ "$(curl -s -o /dev/null -w ''%{http_code}'' localhost:3000)" != "200" ]] &&
    [[ "$(curl -s -o /dev/null -w ''%{http_code}'' localhost:4200)" != "200" ]] &&
    [[ "$(curl -s -o /dev/null -w ''%{http_code}'' localhost:8080)" != "200" ]] &&
    [[ "$(curl -s -o /dev/null -w ''%{http_code}'' localhost:8888)" != "200" ]];
     do sleep 5; done
