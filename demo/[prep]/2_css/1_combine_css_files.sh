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

# configure loop behavior
IFS='
'

tmp_output_dir=$DIR/temp

# ensure that the temp directory exists, and is empty
if [ -d "$tmp_output_dir" ]; then
	rm -rf "$tmp_output_dir"
fi;
mkdir "$tmp_output_dir"

demo_css_dir=$DIR/../../css
css_dir=$DIR/../../../css
additional_css_dir=$DIR/manual_css_edits

# demo_css_dir=$( realpath "$demo_css_dir" )
# css_dir=$( realpath "$css_dir" )
# additional_css_dir=$( realpath "$additional_css_dir" )

nonimage_css_files=(
	"$demo_css_dir/quirks.css"
	"$css_dir/harView.css"
	"$css_dir/tabView.css"
	"$css_dir/toolbar.css"
	"$css_dir/infoTip.css"
	"$css_dir/popupMenu.css"
	"$css_dir/pageList.css"
	"$css_dir/requestList.css"
	"$css_dir/requestBody.css"
	"$css_dir/pageStats.css"
	"$css_dir/pageTimeline.css"
	"$css_dir/validationError.css"
	"$css_dir/previewTab.css"
	"$css_dir/SyntaxHighlighter.css"
	"$css_dir/dragdrop.css"
)

hasimage_css_file=$additional_css_dir/all_image_urls.css

css_url_pattern=$(cat << 'EOF'
url\(['"]?[^'"\)]*['"]?\)
EOF
)

# echo $css_url_pattern; exit;

for css_file in ${nonimage_css_files[@]}; do
	# echo $css_file
	cat "$css_file" | sed -r "s/$css_url_pattern/none/g" >>"$tmp_output_dir\1_combined.css"
	echo -n -e "\n" >>"$tmp_output_dir\1_combined.css"
done

cat "$hasimage_css_file" >>"$tmp_output_dir\1_combined.css"
