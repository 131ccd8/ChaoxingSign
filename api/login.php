<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

// 获取请求参数
$pass = isset($_GET['pass']) ? $_GET['pass'] : (isset($_POST['pass']) ? $_POST['pass'] : '');
$user = isset($_GET['user']) ? $_GET['user'] : (isset($_POST['user']) ? $_POST['user'] : '');

//超星登录加密接口
function encryptByAES($message, $key)
{
    return base64_encode(openssl_encrypt($message.str_repeat(chr(16 - (strlen($message) % 16)), 16 - (strlen($message) % 16)), 'AES-128-CBC', $key, OPENSSL_RAW_DATA, $key));
}

$postData = http_build_query(['fid' => '-1','uname' => encryptByAES($user, "u2oh6Vu^HWe4_AES"),'password' => encryptByAES($pass, "u2oh6Vu^HWe4_AES"),'refer' => '','t' => 'true','forbidotherlogin' => '0','validate' => '','doubleFactorLogin' => '0','independentId' => '0']);

$options = [
    'ssl' => ['verify_peer' => false,'verify_peer_name' => false,],
    'http' => ['header' => ["Content-type: application/x-www-form-urlencoded","Authorization: Bearer your_token_here","X-Custom-Header: custom_value",],
    'method'  => 'POST','content' => $postData,],
];

$response = @file_get_contents("https://passport2.chaoxing.com/fanyalogin", false, stream_context_create($options));

if ($response) {
    $data = json_decode($response, true);
    if ($data['status']) {
        if (file_exists($cookieFile)) {
            unlink(__DIR__.'/cookies/'.md5($user).".txt");
        }
        foreach ($http_response_header as $header) {
            if (preg_match('/^Set-Cookie:\s*([^;]+)/i', $header, $matches)) {
                file_put_contents(__DIR__.'/cookies/'.md5($user).".txt", $matches[1].';', FILE_APPEND);
            }
        }
    }
	$data['message'] = $data['msg2'] ? $data['msg2'] : '登录成功';
	unset($data['msg2']);
	unset($data['url']);
	//返回服务器响应
    echo json_encode($data);
} else {
    echo '{"status":false,"message":"网络连接错误"'.'}';
}
