<?php

function rsearch($folder, $pattern) {
    $dir = new RecursiveDirectoryIterator($folder);
    $ite = new RecursiveIteratorIterator($dir);
    $files = new RegexIterator($ite, $pattern, RegexIterator::MATCH);
    $fileList = array();
    foreach($files as $file) {
        $fileList[] = $file->getPathname();
    }
    return $fileList;
}

?>