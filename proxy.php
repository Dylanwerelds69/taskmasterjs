<?php

error_reporting(E_ALL);
ini_set('display_errors', 0); // Disable HTML error output

function Dlog($str)
{
    $logFile = __DIR__ . '/proxy.log';
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] $str\n", FILE_APPEND);
}

try {
    // CORS headers
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');

    // Debug logging
    Dlog("Proxy request received: " . $_SERVER['REQUEST_METHOD']);

    // Handle preflight requests
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }

    // Get target URL from query parameter
    $target_url = isset($_GET['csurl']) ? $_GET['csurl'] : null;
    if (!$target_url) {
        throw new Exception('No target URL specified');
    }

    // Log the actual URL being called
    Dlog("Forwarding to: " . $target_url);
    $target_url = 'https://myriad-manifestation.nl/v1' . $target_url;

    // Get the request body
    $body = file_get_contents('php://input');
    Dlog("Request body: " . $body);

    // Initialize cURL
    $ch = curl_init($target_url);
    if ($ch === false) {
        throw new Exception('Failed to initialize cURL');
    }

    // Set cURL options
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);

    // Forward the request body for POST/PUT/PATCH
    if (in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT', 'PATCH']) && !empty($body)) {
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

    // Execute request
    $response = curl_exec($ch);
    if ($response === false) {
        throw new Exception('cURL error: ' . curl_error($ch));
    }

    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    Dlog("API Response code: " . $http_code);
    Dlog("API Response: " . $response);

    curl_close($ch);

    // Forward response code and body
    http_response_code($http_code);
    echo $response;

} catch (Exception $e) {
    Dlog("ERROR: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Proxy error: ' . $e->getMessage()
    ]);
}
