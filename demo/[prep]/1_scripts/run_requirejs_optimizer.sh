#!/usr/bin/env bash

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

REQJS="${DIR}/r.js"
REQJS_native="$REQJS"

case "$(uname -s)" in
  CYGWIN*|MINGW32*|MSYS*|MINGW*)
    REQJS_native=$(cygpath -w "$REQJS")
    ;;
esac

# download require.js
#   https://requirejs.org/docs/download.html#rjs
if [ ! -e "$REQJS" ];then
  curl --insecure -o "$REQJS_native" "https://requirejs.org/docs/release/2.1.14/r.js"
fi

# update PATH to include node
if [ -e "${DIR}/../env.sh" ];then
  source "${DIR}/../env.sh"
fi

cd "${DIR}/../../../scripts"

node "$REQJS_native" -o "app.build.js" optimize=none out="../demo/scripts/harViewer.min.js"
