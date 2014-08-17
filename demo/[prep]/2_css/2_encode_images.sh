#!/bin/bash

# http://stackoverflow.com/questions/59895/can-a-bash-script-tell-what-directory-its-stored-in
# -----------------------------------------------
SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do # resolve $SOURCE until the file is no longer a symlink
  DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"
  SOURCE="$(readlink "$SOURCE")"
  [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE" # if $SOURCE was a relative symlink, we need to resolve it relative to the path where the symlink file was located
done
DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"
# -----------------------------------------------

# update PATH to include php
source "$DIR/../env.sh"

tmp_output_dir=$DIR/temp
combined_unencoded_css_file=$tmp_output_dir/1_combined.css
css_images_root_dir=$DIR/../../../css
php_script=$DIR/php/encode_images.php
minify=0

php "$php_script" "$combined_unencoded_css_file" "$css_images_root_dir" "$minify" >"$tmp_output_dir/2_encoded.css"
