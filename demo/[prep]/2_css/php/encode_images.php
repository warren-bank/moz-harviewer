<?php

define('CURRENT_DIR',dirname(__FILE__));

require_once CURRENT_DIR . DIRECTORY_SEPARATOR . 'lib' . DIRECTORY_SEPARATOR . 'css_image_encoder.php';

// sanity check
if ( (empty($argc)) || ($argc < 3) ){
	print 'required input parameter(s) are missing:';
	print 'usage: php script.php /path/to/file.css /path/to/css/images/root/directory [minify?]';
	exit();
}

$css_file				= $argv[1];
$css_images_root_dir	= $argv[2];
$css_encoder			= new css_image_encoder();

$is_server_response		= false;
$minify					= (! empty($argv[3]));

$css_encoder->add_css_file($css_file);
$css_encoder->encode_images_in_dirtree($css_images_root_dir . '/file.css');
$css_encoder->print_css($is_server_response, $minify);

?>