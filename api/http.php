<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

$user = $_POST['user'] ?? $_GET['user'] ?? '';
$api = $_POST['api'] ?? $_GET['api'] ?? '';

if (!file_exists('cookies/' . md5((string)$user) . '.txt')) {
	echo '{"status":false,"message":"用户不存在"'.'}';
    exit;
}

$cookie = file_get_contents('cookies/' . md5((string)$user) . '.txt');

$response = @file_get_contents($api, false, stream_context_create(['http' => ['header' => "Cookie: $cookie\r\n"]]));

if(strpos($api,"https://mooc2-ans.chaoxing.com/mooc2-ans/visit/courselistdata") !== false ){
	$data = [];
	$data['data'] = $response;
	echo json_encode($data);
	exit;
}

$status_code = 500;
if (isset($http_response_header)) {
    foreach ($http_response_header as $header) {
        if (preg_match('/HTTP\/\d\.\d (\d{3})/', $header, $matches)) {
            $status_code = (int)$matches[1];
            break;
        }
    }
}

if ($response) {
	$data = json_decode($response, true);
	$data['code'] = $status_code;
    echo json_encode($data);
} else {
    echo '{"status":false,"message":"网络连接错误"'.'}';
}
