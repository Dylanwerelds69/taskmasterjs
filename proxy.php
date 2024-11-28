<?php

error_reporting(E_ALL);
ini_set('display_errors', 1);


function Dlog($str)
{
    // file_put_contents(__DIR__ . '/proxy.log', $str . "\n", FILE_APPEND);
    // echo $str . "\n";
}


// proxy.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Debug logging
Dlog("Proxy request received: " . $_SERVER['REQUEST_METHOD']);

// Get target URL from query parameter
$target_url = isset($_GET['csurl']) ? $_GET['csurl'] : null;


if (!$target_url) {
    Dlog("No target URL specified");
    http_response_code(400);
    die(json_encode(['error' => 'No target URL specified']));
}

// Log the actual URL being called
Dlog("Forwarding to: " . $target_url);
$target_url = 'https://myriad-manifestation.nl/v1' . $target_url;

// Get the request body
$body = file_get_contents('php://input');
Dlog("Request body: " . $body);

// Initialize cURL
$ch = curl_init($target_url);

// Set cURL options
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);

// Forward the request body for POST/PUT
if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'PUT') {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

// Forward headers
$headers = getallheaders();
$forward_headers = [];
foreach ($headers as $name => $value) {
    if (strtolower($name) !== 'host') {
        $forward_headers[] = "$name: $value";
    }
}

curl_setopt($ch, CURLOPT_HTTPHEADER, $forward_headers);
curl_setopt($ch, CURLOPT_VERBOSE, true);

// Execute request
$response = curl_exec($ch);

// Log curl errors if any
if (curl_errno($ch)) {
    Dlog("cURL Error: " . curl_error($ch));
}

$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
Dlog("API Response code: " . $http_code);
Dlog("API Response: " . $response);

curl_close($ch);

// Forward response code and body
http_response_code($http_code);
echo $response;
