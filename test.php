<?php

error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Test basic PHP functionality
$testResponse = array(
    'success' => true,
    'php_version' => PHP_VERSION,
    'server_software' => $_SERVER['SERVER_SOFTWARE'],
    'modules' => get_loaded_extensions(),
    'curl_enabled' => function_exists('curl_init'),
    'json_enabled' => function_exists('json_encode'),
    'message' => 'PHP is working correctly'
);

echo json_encode($testResponse, JSON_PRETTY_PRINT);

phpinfo();
