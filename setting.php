<?php
class Config
{
    private $file;
    private $data;

    public function __construct($file = 'data.config')
    {
        $this->file = $file;
        $this->load();
    }

    private function load()
    {
        if (file_exists($this->file)) {
            $content = file_get_contents($this->file);
            $this->data = json_decode($content, true) ?: ['courses' => []];
        } else {
            $this->data = ['courses' => []];
        }
    }

    public function save()
    {
        return file_put_contents($this->file, json_encode($this->data, JSON_PRETTY_PRINT));
    }

    public function get($key = null)
    {
        if ($key === null) {
            return $this->data;
        }
        return $this->data[$key] ?? null;
    }

    public function set($key, $value)
    {
        $this->data[$key] = $value;
        return $this;
    }
}

$config = new Config('api/config.js');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    $courseName = trim($_POST['name']);
    
    switch ($action) {
        case 'add_course':
            $newCourse = [
                'latitude' => $_POST['latitude'],
                'longitude' => $_POST['longitude'],
                'signCode' => $_POST['signCode'],
                'address' => $_POST['address'] ?? ''
            ];
            $courses = $config->get('courses');
            $courses[$courseName] = $newCourse;
            $config->set('courses', $courses);
            $config->save();
            break;
            
        case 'update_course':
            $originalName = $_POST['originalName'];
            $courses = $config->get('courses');
            
            if (isset($courses[$originalName])) {
                if ($courseName !== $originalName) {
                    unset($courses[$originalName]);
                }
                
                $courses[$courseName] = [
                    'latitude' => $_POST['latitude'],
                    'longitude' => $_POST['longitude'],
                    'signCode' => $_POST['signCode'],
                    'address' => $_POST['address'] ?? ''
                ];
                
                $config->set('courses', $courses);
                $config->save();
            }
            break;
            
        case 'delete_course':
            $courseName = $_POST['name'];
            $courses = $config->get('courses');
            if (isset($courses[$courseName])) {
                unset($courses[$courseName]);
                $config->set('courses', $courses);
                $config->save();
            }
            break;
    }
    
    header("Location: ".$_SERVER['PHP_SELF']);
    exit;
}

$courses = $config->get('courses') ?: [];
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>签到参数设置</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css">
    <style>
        body { background-color: #f8f9fa; padding-top: 20px; }
        .card { border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); margin-bottom: 20px; }
        .course-item { border-left: 4px solid #0d6efd; margin-bottom: 15px; padding: 10px; background-color: white; }
    </style>
</head>
<body>
    <div class="container">
        <div class="row mb-4">
            <div class="col-12">
                <div class="card">
                    <div class="card-body">
                        <h1 class="card-title text-center">
                            <i class="bi bi-book"></i> 课程签到配置
                        </h1>
						<a href="https://github.com/131ccd8/" style="display: block;text-align: center;">© 2025 Copy Right Github 糕手</a>
                    </div>
                </div>
            </div>
        </div>

        <div class="row">
            <div class="col-md-4">
                <div class="card">
                    <div class="card-header bg-info text-white">
                        <i class="bi bi-plus-circle"></i> 添加/编辑课程
                    </div>
                    <div class="card-body">
                        <form id="courseForm" method="post">
                            <input type="hidden" name="action" id="formAction" value="add_course">
                            <input type="hidden" name="originalName" id="originalName" value="">
                            
                            <div class="mb-3">
                                <label for="name" class="form-label">课程名称*</label>
                                <input type="text" class="form-control" id="name" name="name" required>
                            </div>
                            
                            <div class="mb-3">
                                <label for="signCode" class="form-label">签到码*</label>
                                <input type="text" class="form-control" id="signCode" name="signCode" required>
                            </div>
                            
                            <div class="mb-3">
                                <label for="address" class="form-label">地址</label>
                                <textarea class="form-control" id="address" name="address" rows="2"></textarea>
                            </div>
                            
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label for="latitude" class="form-label">纬度*</label>
                                    <input type="number" step="any" class="form-control" id="latitude" name="latitude" required>
                                </div>
                                <div class="col-md-6">
                                    <label for="longitude" class="form-label">经度*</label>
                                    <input type="number" step="any" class="form-control" id="longitude" name="longitude" required>
                                </div>
                            </div>
                            
                            <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                                <a href="https://api.map.baidu.com/lbsapi/getpoint/index.html" style="color: white" class="btn btn-info me-md-2" target="_blank">
                                    <i class="bi bi-geo-alt"></i> 坐标拾取
                                </a>
                                <button type="button" id="cancelBtn" class="btn btn-secondary me-md-2" style="display: none;">
                                    <i class="bi bi-x-circle"></i> 取消
                                </button>
                                <button type="submit" class="btn btn-primary">
                                    <i class="bi bi-save"></i> 保存课程
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            
            <div class="col-md-8">
                <div class="card">
                    <div class="card-header bg-success text-white">
                        <i class="bi bi-list-ul"></i> 配置列表
                    </div>
                    <div class="card-body">
                        <?php if (empty($courses)): ?>
                            <div class="alert alert-info">暂无课程数据</div>
                        <?php else: ?>
                            <div id="courseList">
                                <?php foreach ($courses as $name => $course): ?>
                                    <div class="course-item" data-name="<?= htmlspecialchars($name) ?>">
                                        <div class="d-flex justify-content-between align-items-center">
                                            <div>
                                                <h5><?= htmlspecialchars($name) ?></h5>
                                                <div class="text-muted small">
                                                    坐标经纬度: <?= $course['latitude'] ?>, <?= $course['longitude'] ?>
                                                </div>
                                                <div class="text-muted small">
                                                    签到码/手势码: <?= htmlspecialchars($course['signCode']) ?>
                                                </div>
                                                <?php if (!empty($course['address'])): ?>
                                                <div class="text-muted small">
                                                    地址: <?= htmlspecialchars($course['address']) ?>
                                                </div>
                                                <?php endif; ?>
                                            </div>
                                            <div>
                                                <button class="btn btn-sm btn-warning edit-btn" data-name="<?= htmlspecialchars($name) ?>">
                                                    <i class="bi bi-pencil"></i> 编辑
                                                </button>
                                                <button class="btn btn-sm btn-danger delete-btn" data-name="<?= htmlspecialchars($name) ?>">
                                                    <i class="bi bi-trash"></i> 删除
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                <?php endforeach; ?>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>
    </div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
<script>
    document.addEventListener('DOMContentLoaded', function() {
        const courseForm = document.getElementById('courseForm');
        const formAction = document.getElementById('formAction');
        const originalName = document.getElementById('originalName');
        const cancelBtn = document.getElementById('cancelBtn');
        
        // 编辑按钮逻辑 - 修复版本
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const name = this.getAttribute('data-name');
                const courseItem = this.closest('.course-item');
                
                // 获取课程数据 - 直接从PHP生成的$courses数组中获取
                const courses = <?php echo json_encode($courses); ?>;
                const courseData = courses[name];
                
                // 填充表单字段
                document.getElementById('name').value = name;
                document.getElementById('originalName').value = name;
                document.getElementById('signCode').value = courseData.signCode;
                document.getElementById('latitude').value = courseData.latitude;
                document.getElementById('longitude').value = courseData.longitude;
                document.getElementById('address').value = courseData.address || '';
                
                // 设置表单为更新模式
                document.getElementById('formAction').value = 'update_course';
                document.getElementById('cancelBtn').style.display = 'block';
                
                // 滚动到表单区域
                document.querySelector('.col-md-4').scrollIntoView({ behavior: 'smooth' });
            });
        });
        
        // 删除按钮逻辑
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                if (confirm('确定要删除这个课程吗？')) {
                    const name = this.getAttribute('data-name');
                    
                    // 创建隐藏表单提交删除请求
                    const form = document.createElement('form');
                    form.method = 'post';
                    form.action = '';
                    
                    const actionInput = document.createElement('input');
                    actionInput.type = 'hidden';
                    actionInput.name = 'action';
                    actionInput.value = 'delete_course';
                    form.appendChild(actionInput);
                    
                    const nameInput = document.createElement('input');
                    nameInput.type = 'hidden';
                    nameInput.name = 'name';
                    nameInput.value = name;
                    form.appendChild(nameInput);
                    
                    document.body.appendChild(form);
                    form.submit();
                }
            });
        });
        
        // 取消按钮
        cancelBtn.addEventListener('click', function() {
            courseForm.reset();
            formAction.value = 'add_course';
            originalName.value = '';
            this.style.display = 'none';
        });
    });
</script>
</body>
</html>
