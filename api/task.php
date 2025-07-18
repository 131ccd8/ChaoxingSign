<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

$baseDir = __DIR__ . '/tasks';
if (!is_dir($baseDir)) {
    mkdir($baseDir, 0755, true);
}

$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

if (empty($input['uname'])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => '用户不存在']);
    exit;
}

if (empty($input['action'])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => '指令异常']);
    exit;
}

$uname = preg_replace('/[^a-zA-Z0-9_-]/', '', $input['uname']);
$userDir = $baseDir . '/' . $uname;
$action = $input['action'];

try {
    switch ($action) {
        case 'start':
            // 创建用户专属目录
            if (!is_dir($userDir)) {
                mkdir($userDir, 0755, true);
            }
            // 检查任务是否已运行
            $taskFile = $userDir . '/status.log';
            if (file_exists($taskFile)) {
                echo json_encode(['status' => 'error', 'message' => '签到任务已存在']);
                exit;
            }
            
            // 创建任务文件
            file_put_contents($taskFile, '');

            header('Content-Type: application/json');
            echo json_encode(['status' => 'success', 'action' => 'start']);
            startTaskLoop($uname, $userDir);
            break;
            
        case 'stop':
            // 检查用户目录是否存在
            if (!is_dir($userDir)) {
                echo json_encode(['status' => 'error', 'message' => '用户任务未运行']);
                exit;
            }
            
            $statusFile = $userDir . '/status.log';
            $pidFile = $userDir . '/runner.pid';
            $taskFile = $userDir . '/runner.php';
            
            // 设置停止标志
            file_put_contents($statusFile, 'stopping');
            
            // 强制终止进程
            if (file_exists($pidFile)) {
                $pid = (int)file_get_contents($pidFile);
                if ($pid > 0) {
                    if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                        exec("taskkill /PID $pid /F");
                    } else {
                        exec("kill -9 $pid");
                    }
                }
                @unlink($pidFile);
                @unlink($taskFile);
				@unlink($statusFile);
            }
            echo json_encode(['status' => 'success', 'action' => 'stop']);
            break;
            
        case 'status':
            // 检查用户目录是否存在
            if (!is_dir($userDir)) {
                echo json_encode([
                    'status' => 'success',
                    'data' => [
                        'action' => 'stopped',
                        'message' => '任务未运行',
                        'sign_in_status' => 'none'
                    ]
                ]);
                exit;
            }

            $statusFile = $userDir . '/status.log';
            
            $status = file_exists($statusFile) ? 'running' : 'stopped';
			
            $statusMessage = '';
            
            if (file_exists($statusFile)) {
                $statusMessage = trim(file_get_contents($statusFile));
            }

            $signInStatus = 'none';
            if (strpos($statusMessage, '签到成功') !== false) {
                $signInStatus = $statusMessage;
                file_put_contents($statusFile, '');
            }
            
            echo json_encode([
                'status' => 'success',
                'data' => [
                    'task_status' => $status,
                    'message' => $statusMessage ?: '暂无签到完成课程',
                    'sign_in_status' => $signInStatus
                ]
            ]);
            break;
            
        default:
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => '非法访问的请求']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Server error: ' . $e->getMessage()]);
}

function startTaskLoop($uname, $userDir)
{
    $taskFile = $userDir . '/runner.php';
    $pidFile = $userDir . '/runner.pid';
    
    $taskScript = <<<PHP
<?php
ignore_user_abort(true);
set_time_limit(0);

// 存储进程ID
file_put_contents('D:\Btsoft\web\chaoxing\api/tasks/{$uname}/runner.pid', getmypid());

class ChaoXingSigner
{
    public \$uname;
    public \$cookie;
    
    public function __construct(\$uname)
    {
        \$this->uname = \$uname;
        \$this->cookie = file_get_contents('../../cookies/'.md5(\$uname).'.txt');
    }
	//携带cookie发起请求
	private function sendHttpRequest(\$url, \$cookie) {
	    \$ch = curl_init();
	    curl_setopt(\$ch, CURLOPT_URL, \$url);
	    curl_setopt(\$ch, CURLOPT_RETURNTRANSFER, true);
	    curl_setopt(\$ch, CURLOPT_SSL_VERIFYPEER, false);
	    curl_setopt(\$ch, CURLOPT_FOLLOWLOCATION, true);
	    curl_setopt(\$ch, CURLOPT_COOKIE, \$cookie); 
	    \$response = curl_exec(\$ch);
	    curl_close(\$ch); 
	    return \$response;
	}
    //获取所有课程
    private function getAllCourses()
    {
		
		\$json1 = \$this->sendHttpRequest("http://mooc1-api.chaoxing.com/mycourse/backclazzdata?view=json&rss=1", \$this->cookie);
		\$json2 = \$this->sendHttpRequest("https://kb.chaoxing.com/pc/curriculum/getMyLessons?curTime=".time()."&uname={\$this->uname}", \$this->cookie);
		
		if(\$json1 === false || \$json2 === false){ return; }
		
		\$doc1 = json_decode(\$json1, true);
		\$doc2 = json_decode(\$json2, true);

		\$dayOfWeek = date('N', time());

		//建立课程映射
		\$courseMap = [];
		foreach (\$doc1['channelList'] as \$item) {
		    \$courseData = \$item['content']['course']['data'][0] ?? [];
		    if (!empty(\$courseData)) {
		        \$courseName = \$courseData['name'] ?? 0;
		        \$courseMap[\$courseName] = [
		            'name' => \$courseName ?? 'qq',
		            'class_id' => \$item['content']['id'] ?? 0,
					'course_id' => \$courseData['id'] ?? 0
		        ];
		    }
		}
		
		// 处理课表数据
		\$todayCourses = [];
		if (!empty(\$doc2['data']['lessonArray'])) {
			file_put_contents('culum.json',json_encode(\$doc2['data']['curriculum']['lessonTimeConfigArray']));
		    foreach (\$doc2['data']['lessonArray'] as \$lesson) {
		        if ((\$lesson['dayOfWeek'] ?? 0) == \$dayOfWeek || \$lesson['name'] == "课程教学示例") {
		            \$courseName = \$lesson['name'] ?? [];
		            \$courseInfo = \$courseMap[\$courseName] ?? null;
		            \$todayCourses[] = [
		                'courseId' => \$courseInfo['course_id'] ?? null,
		                'classId' => \$courseInfo['class_id'] ?? null,
		                'name' => \$courseInfo['name'] ?? \$lesson['name'] ?? '',
		                'time' => sprintf("%d", 
		                    \$lesson['beginNumber'] ?? 0, 
		                    \$lesson['length'] ?? 0
		                )
		            ];
		        }
		    }
		}
		return \$todayCourses;
    }
    //执行签到
    private function sign(\$matchedData,\$timeConfig)
    {
		\$classId = \$matchedData['classId'];
		\$courseId = \$matchedData['courseId'];
		\$times = explode(":",explode("-",\$timeConfig[intval(\$matchedData['time'])%2 ? intval(\$matchedData['time']) -1 : intval(\$matchedData['time'])])[0]);
		
		\$currentTime1 = date('H');
		\$currentTime2 = date('i');
		// 从配置中获取课程时间
		
		\$currentTime1 = '14';
		\$currentTime2 = 29;
		
		if(\$matchedData['name'] === "课程教学示例" || (\$currentTime1 === \$times[0] && abs(\$currentTime2 - \$times[1]) <= 3)){
			
			\$activeListUrl = "https://mobilelearn.chaoxing.com/v2/apis/active/student/activelist?" .
			    "fid=0&courseId={\$courseId}&classId={\$classId}&" . 
			    "showNotStartedActive=0&_=" . time();
			
			\$response = \$this->sendHttpRequest(\$activeListUrl,\$this->cookie);
			
			\$actionLess = json_decode(\$response,true);
			if (isset(\$actionLess['data']['activeList'][0])) {
			    \$action = \$actionLess['data']['activeList'][0];
			    \$actionId = \$action['id'];
				\$actionName = \$action['nameOne'];
			    
			    // 构建活动ID文件路径
			    \$activeIdFile =  '../active/' . \$actionId;
			    
			    // 检查是否已经签到过（文件存在表示已签到）
			    if (file_exists(\$activeIdFile)) {
			        return;
			    }
				
				// 检查是否在签到时间窗口内
				if (abs(\$action['startTime']/1000 - time()) <= 600) {
					// 获取用户ID
				    \$response = \$this->sendHttpRequest("https://sso.chaoxing.com/apis/login/userLogin4Uname.do",\$this->cookie);
					\$uninfo = json_decode(\$response,true);
					\$uid = json_encode(\$uninfo['msg']['uid']);
				    // 构建预签到和签到URL
				    \$preSignUrl = "https://mobilelearn.chaoxing.com/newsign/preSign?courseId={\$course['courseId']}&classId={\$course['classId']}&activePrimaryId={\$actionId}&uid={\$uid}&general=1&sys=1&ls=1&appType=15";
					
				    // 执行预签到和签到请求
				    \$newsingn = \$this->sendHttpRequest(\$preSignUrl,\$this->cookie);
					
					
					\$config = file_get_contents('../../config.js');
					\$configData = json_decode(\$config,true);
					
					//签到码和手势码
					\$signCode = \$configData['courses'][\$matchedData['name']]['signCode'];
					//签到地址名称，如果不知道精确的，必须留空
					\$address = \$configData['courses'][\$matchedData['name']]['address'];
					//经度
					\$latitude = \$configData['courses'][\$matchedData['name']]['latitude'];
					//纬度
					\$longitude = \$configData['courses'][\$matchedData['name']]['longitude'];
					
					\$signResponse = \$this->sendHttpRequest("https://mobilelearn.chaoxing.com/pptSign/stuSignajax?address={\$address}&signCode={\$signCode}&uid={\$uid}&activeId={\$actionId}&latitude={\$latitude}&longitude={\$longitude}&fid=0&appType=15&ifTiJiao=1", \$this->cookie);
					
					\$logMessage = "";
				    if(strpos(\$signResponse, '您已签到过了') !== false){
						// 创建活动ID文件标记已签到
						file_put_contents(\$activeIdFile, '');
					}else if (is_string(\$signResponse) && (strpos(\$signResponse, '签到成功') !== false || strpos(\$signResponse, 'success') !== false)) {
				        // 创建活动ID文件标记已签到
				        file_put_contents(\$activeIdFile, '');
						if(strpos(\$newsingn,"拍照") !== false){ \$actionName = "拍照签到"; }
						\$logMessage = date('Y-m-d H:i:s')." : [ {\$matchedData['name']} ({\$actionName}成功) ]";
				    } else {
				        // 记录失败日志
				        \$logMessage = date('Y-m-d H:i:s')." : [ {\$matchedData['name']} ({\$signResponse}) ]";
				    }
					file_put_contents('status.log', \$logMessage."\\n", FILE_APPEND);
				}
			}
		}
	}
    //运行任务
    public function run()
    {
        while (true) {
            try {
                // 检查停止标志
                if (file_exists('status.log') && trim(file_get_contents('status.log')) === 'stopping') {
                    exit(0); // 优雅退出
                }
				
                \$matchedData = \$this->getAllCourses();
				
				foreach (\$matchedData as \$course) {
				    \$this->sign(\$course,json_decode(file_get_contents('culum.json'),true));
				}
    
                file_put_contents('status.log', date('Y-m-d H:i:s').' : [ 任务运行中... ] '."\\n", FILE_APPEND);
                sleep(rand(15, 30));
            } catch (Exception \$e) {
                sleep(60);
            }
        }
    }
}
try {
    \$signer = new ChaoXingSigner($uname);
    \$signer->run();
} catch (Exception \$e) {
    file_put_contents('D:\Btsoft\web\chaoxing\api/tasks/{$uname}/error.log', date('Y-m-d H:i:s') . " - " . \$e->getMessage(), FILE_APPEND);
}
?>
PHP;
    
    file_put_contents($taskFile, $taskScript);
    
    $php = PHP_BINARY;
    $command = "$php $taskFile";
    
    if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
        pclose(popen("start /B $command > NUL", "r"));
    } else {
        exec("$command > /dev/null 2>&1 &");
    }
}
