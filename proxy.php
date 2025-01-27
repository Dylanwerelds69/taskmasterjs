<?php

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // Get the target URL
    $csurl = isset($_GET['csurl']) ? $_GET['csurl'] : '';
    if (empty($csurl)) {
        throw new Exception('No target URL specified');
    }

    // Ensure URL starts with slash
    if (strpos($csurl, '/') !== 0) {
        $csurl = '/' . $csurl;
    }

    $api_url = 'https://pmarcelis.mid-ica.nl/v1' . $csurl;
    $rawBody = file_get_contents('php://input');

    // Debug logging
    error_log("API URL: " . $api_url);
    error_log("Raw Body: " . $rawBody);

    $ch = curl_init($api_url);

    if (!$ch) {
        throw new Exception('Failed to initialize cURL');
    }

    // Start with basic headers
    $headers = ['Content-Type: application/json'];

    // Get Authorization header
    $authHeader = null;
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    } else {
        $allHeaders = getallheaders();
        if (isset($allHeaders['Authorization'])) {
            $authHeader = $allHeaders['Authorization'];
        }
    }

    // Debug logging
    error_log("Auth Header: " . ($authHeader ?? 'none'));

    // Add Authorization header if present
    if ($authHeader) {
        $headers[] = 'Authorization: ' . $authHeader;
    }

    // Debug logging
    error_log("Request Headers: " . print_r($headers, true));

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_CUSTOMREQUEST => $_SERVER['REQUEST_METHOD'],
        CURLOPT_POSTFIELDS => $rawBody,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_VERBOSE => true
    ]);

    // Debug logging for cURL
    $verbose = fopen('php://temp', 'w+');
    curl_setopt($ch, CURLOPT_STDERR, $verbose);

    $response = curl_exec($ch);

    // Debug logging
    error_log("cURL Response: " . $response);

    if (curl_errno($ch)) {
        throw new Exception('cURL Error: ' . curl_error($ch));
    }

    // Get verbose debug information
    rewind($verbose);
    $verboseLog = stream_get_contents($verbose);
    error_log("Verbose log: " . $verboseLog);

    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    // If it's a login or token refresh response, modify it to include expiration time
    // if ($csurl === '/sessions' || $csurl === '/sessions/') {
    //     $responseData = json_decode($response, true);
    //     if ($responseData && isset($responseData['success']) && $responseData['success']) {
    //         // Add expires_in field (20 minutes for access token)
    //         $responseData['data']['expires_in'] = 1200; // 20 minutes in seconds
    //         $response = json_encode($responseData);
    //     }
    // }

    // Set the same status code
    http_response_code($httpCode);
    echo $response;

} catch (Exception $e) {
    error_log("Proxy Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
