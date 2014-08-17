<?php

require_once dirname(__FILE__) . DIRECTORY_SEPARATOR . 'recursive_file_find.php5';

class css_image_encoder {

	private $folders	= array();
	private $imgs		= array(
		"file"		=> array(),
		"encode"	=> array()
	);
	private $type		= array('jpg', 'gif', 'png');
	private $style		= array();
	private $css		= '';

	function __construct() {
	}

	function add_css_file($s) {
		$this->style[]=$s;
	}

	function get_img_pattern() {
		$pattern = '/\.(?:' . implode('|', $this->type) . ')$/i';
		return $pattern;
	}

	function get_css_dir($d) {
		return dirname($d);
	}

	function base64_encode_image ($imagefile) {
		$filetype = strtolower(pathinfo($imagefile, PATHINFO_EXTENSION));
		if (in_array($filetype, $this->type)){
			$imgbinary = fread(fopen($imagefile, "r"), filesize($imagefile));
		}
		else {
			return $imagefile;
		}
		return 'data:image/'.$filetype.';base64,'.base64_encode($imgbinary);
	}

	function encode_images_in_dirtree($c) {
		$folder		= $this->get_css_dir($c);

		// have the images under this folder already been encoded?
		if (array_key_exists($folder, $this->folders)){return;}

		// leave a breadcrumb
		$this->folders[$folder] = true;

		$pattern	= $this->get_img_pattern();
		$images		= rsearch($folder, $pattern);

		foreach ($images as $file_path) {
			$relative_path				= str_replace(($folder . DIRECTORY_SEPARATOR), '', $file_path);

			if (DIRECTORY_SEPARATOR !== '/'){
				$relative_path			= str_replace(DIRECTORY_SEPARATOR, '/', $relative_path);
			}

			// check that this file isn't already encoded
			if (in_array($relative_path, $this->imgs['file'], true)){continue;}

			array_push($this->imgs['file'],   $relative_path);
			array_push($this->imgs['encode'], $this->base64_encode_image($file_path));
		}
	}

	function print_css($is_server_response=true, $minify=true) {
		if ($is_server_response){
			header("Content-type: text/css");
		}
		$this->process_all_css_files($minify);
		echo $this->css;
		if ($is_server_response){
			exit();
		}
	}

	function process_all_css_files ($minify=true) {
		if (count($this->style) < 1 ) return ;
		foreach ($this->style as $s) {
			$css=@file_get_contents($s);
			if ($minify){
				$css=$this->minify_css($css);
			}
			$this->encode_images_in_dirtree($s);
			if (
				(! empty($this->imgs['file']))   &&
				(! empty($this->imgs['encode'])) &&
				(count($this->imgs['file']) === count($this->imgs['encode']))
			){
				$this->css .= str_replace($this->imgs['file'], $this->imgs['encode'], $css);
			}
			else {
				$this->css .= $css;
			}
		}
		return;
	}

	function minify_css($buffer) {
		/* remove comments */
		$buffer = preg_replace('!/\*[^*]*\*+([^/][^*]*\*+)*/!', '', $buffer);
		/* remove tabs, spaces, newlines, etc. */
		$buffer = str_replace(array("\r\n", "\r", "\n", "\t", '  ', '    ', '    '), '', $buffer);
		return $buffer;
	}

}

?>