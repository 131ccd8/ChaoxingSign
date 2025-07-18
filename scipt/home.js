const username = JSON.parse(localStorage.getItem('chaoxingLogin')).username;
const API_URL = 'api/task.php';
const USER_API_URL = 'api/http.php';
const STATUS_CHECK_INTERVAL = 5000; // 3秒检查一次状态
const MAX_LOG_ENTRIES = 50;

let statusCheckTimer = null;
let isTaskRunning = false;

// 初始化任务管理器
function initTaskManager() {
	loadLogHistory();
	checkInitialStatus();
}

// 检查任务初始状态
async function checkInitialStatus() {
	try {
		const response = await fetch(API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				action: 'status',
				uname: username
			})
		});

		const data = await response.json();
		if (data.status === 'success') {
			isTaskRunning = data.data.task_status === 'running';
			updateButtonState();

			if (isTaskRunning) {
				startStatusChecker();
			}
		}
	} catch (error) {
		console.error('初始状态检查失败:', error);
		addLogEntry('初始状态检查失败', 'error');
	}
}

// 更新按钮状态
function updateButtonState() {
	const btn = document.getElementById('toggleTaskBtn');
	if (isTaskRunning) {
		btn.innerHTML = '<i class="bi bi-stop-fill"></i> 停止任务';
		btn.className = 'task-btn stop-btn';
	} else {
		btn.innerHTML = '<i class="bi bi-play-fill"></i> 启动任务';
		btn.className = 'task-btn start-btn';
	}
}

// 启动状态检查定时器
function startStatusChecker() {
	if (statusCheckTimer) clearInterval(statusCheckTimer);
	checkTaskStatus();
	statusCheckTimer = setInterval(checkTaskStatus, STATUS_CHECK_INTERVAL);
}

// 停止状态检查定时器
function stopStatusChecker() {
	if (statusCheckTimer) {
		clearInterval(statusCheckTimer);
		statusCheckTimer = null;
	}
}

// 检查任务状态
async function checkTaskStatus() {
	try {
		const response = await fetch(API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				action: 'status',
				uname: username
			})
		});

		const data = await response.json();
		if (data.status === 'success') {
			// 处理签到成功消息
			if (data.data.sign_in_status) {
				data.data.sign_in_status.split('\n')
					.filter(msg => msg.trim() && msg.includes('签到成功'))
					.forEach(msg => addLogEntry(msg.trim(), 'success'));
			}

			isTaskRunning = data.data.task_status === 'running';
			updateButtonState();

			if (!isTaskRunning) {
				stopStatusChecker();
			}
		}
	} catch (error) {}
}

async function toggleTask() {
    const action = isTaskRunning ? 'stop' : 'start';
    const actionText = isTaskRunning ? '停止' : '启动';

    const confirmed = await showModal({
        title: `${actionText}任务`,
        message: `确定要${actionText}自动签到任务吗？`,
        icon: isTaskRunning ? 'stop-circle' : 'play-circle',
        danger: isTaskRunning,
        confirmText: actionText,
        cancelText: '取消'
    });

    if (!confirmed) return;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action,
                uname: username
            })
        });

        // 首先检查响应是否成功
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP错误: ${response.status} - ${errorText}`);
        }

        // 检查响应内容类型
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            throw new Error(`无效的响应格式: ${text}`);
        }

        // 解析JSON响应
        let data;
        try {
            data = await response.json();
        } catch (jsonError) {
            const text = await response.text();
            throw new Error(`JSON解析失败: ${jsonError.message}, 响应内容: ${text}`);
        }

        if (data.status === 'success') {
            isTaskRunning = action === 'start';
            updateButtonState();
            
            if (isTaskRunning) {
                startStatusChecker();
            } else {
                stopStatusChecker();
            }
        } else {
            addLogEntry(`任务${actionText}失败: ${data.message || '未知错误'}`, 'error');
        }
    } catch (error) {
        console.error('任务操作错误:', error);
        addLogEntry(`任务${actionText}失败: ${error.message}`, 'error');
    }
}

// 日志管理函数
function addLogEntry(message, type = 'info') {
	const timestamp = new Date().toISOString();
	const logId = `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

	const logClass = type === 'success' ? 'log-success' :
		type === 'error' ? 'log-error' : 'log-default';

	const logElement = document.createElement('div');
	logElement.className = `log-entry ${logClass}`;
	logElement.dataset.logId = logId;

	// 初始序号设为0，后面会统一更新
	logElement.innerHTML = `
	    <div class="log-content">
	        <span class="log-number">0、</span>  <!-- 初始化也加顿号 -->
	        <span class=".message">${message}</span>
	    </div>
	    <button class="delete-log-btn" data-log-id="${logId}">
	        <i class="bi bi-trash"></i> 删除
	    </button>
	`;

	// 添加删除事件
	logElement.querySelector('.delete-log-btn').addEventListener('click', function(e) {
		e.stopPropagation();
		const logId = this.getAttribute('data-log-id');
		deleteLogEntry(logId);
	});

	const container = document.getElementById('taskStatusDisplay');
	container.prepend(logElement);

	// 保存到本地存储
	saveLogEntry({
		id: logId,
		timestamp,
		message,
		type
	});

	// 限制显示数量
	if (container.children.length > MAX_LOG_ENTRIES) {
		container.removeChild(container.lastChild);
	}

	// 更新所有日志的序号
	updateLogNumbers();
}

// 加载日志历史
function loadLogHistory() {
	if (!username) return;

	const key = `taskLogs_${username}`;
	let logs = JSON.parse(localStorage.getItem(key) || '[]');

	// 确保所有日志都有ID
	logs = logs.map(log => {
		if (!log.id) {
			return {
				...log,
				id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
			};
		}
		return log;
	});

	// 按时间排序（最新的在前）
	logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

	// 保存更新后的日志
	localStorage.setItem(key, JSON.stringify(logs));

	// 显示日志
	const container = document.getElementById('taskStatusDisplay');
	container.innerHTML = '';
	logs.slice(0, MAX_LOG_ENTRIES).forEach(log => {
		const logClass = log.type === 'success' ? 'log-success' :
			log.type === 'error' ? 'log-error' : 'log-default';

		const logElement = document.createElement('div');
		logElement.className = `log-entry ${logClass}`;
		logElement.dataset.logId = log.id;
		logElement.innerHTML = `
            <div class="log-content">
                <span class="log-number">0、</span>  <!-- 初始化也加顿号 -->
                <span class=".message">${log.message}</span>
            </div>
            <button class="delete-log-btn" data-log-id="${log.id}">
                <i class="bi bi-trash"></i> 删除
            </button>
        `;

		logElement.querySelector('.delete-log-btn').addEventListener('click', function(e) {
			e.stopPropagation();
			const logId = this.getAttribute('data-log-id');
			deleteLogEntry(logId);
		});

		container.appendChild(logElement);
	});

	// 加载完成后更新序号
	updateLogNumbers();
}

// 添加更新日志序号的函数
function updateLogNumbers() {
	const container = document.getElementById('taskStatusDisplay');
	const logs = container.children;

	// 从1开始正序编号，最新的日志序号最小（1），旧的递增
	for (let i = 0; i < logs.length; i++) {
		const numberSpan = logs[i].querySelector('.log-number');
		if (numberSpan) {
			numberSpan.textContent = `${i + 1}、`; // 添加顿号
		}
	}
}


// 保存日志条目
function saveLogEntry(entry) {
	if (!username) return;

	const key = `taskLogs_${username}`;
	let logs = JSON.parse(localStorage.getItem(key) || '[]');

	// 确保不重复添加相同的日志
	if (!logs.some(log => log.id === entry.id)) {
		logs.unshift(entry);
	}

	// 限制存储的日志数量
	if (logs.length > MAX_LOG_ENTRIES) {
		logs = logs.slice(0, MAX_LOG_ENTRIES);
	}

	localStorage.setItem(key, JSON.stringify(logs));
}

// 删除单条日志 - 修复的关键点
async function deleteLogEntry(logId) {
	const confirmed = await showModal({
		title: '删除日志',
		message: '确定要删除此条日志记录吗？',
		icon: 'trash',
		danger: true,
		confirmText: '删除',
		cancelText: '取消'
	});

	if (!confirmed) return;

	if (!username) return;

	const key = `taskLogs_${username}`;
	let logs = JSON.parse(localStorage.getItem(key) || '[]');
	const beforeDeleteCount = logs.length;

	// 过滤掉要删除的日志
	logs = logs.filter(log => log.id !== logId);

	// 检查是否真的删除了一个条目
	if (logs.length === beforeDeleteCount) {
		console.warn('未找到匹配的日志条目，ID:', logId);
		return;
	}

	// 更新存储
	localStorage.setItem(key, JSON.stringify(logs));

	// 从DOM中移除对应的日志元素
	const logElement = document.querySelector(`[data-log-id="${logId}"]`);
	if (logElement) {
		logElement.remove();
		// 删除后更新所有日志的序号
		updateLogNumbers();
	} else {
		// 如果DOM中没找到，重新加载整个日志列表
		loadLogHistory();
	}
}

// 清空所有日志
async function clearLogs() {

	if (!username) {
		showModal({
			title: '操作失败',
			message: '请先登录',
			icon: 'exclamation-circle',
			danger: true,
			confirmText: '确定',
			showCancel: false
		});
		return;
	}

	const confirmed = await showModal({
		title: '清空日志',
		message: '确定要清空所有任务日志吗？此操作不可恢复',
		icon: 'trash',
		danger: true,
		confirmText: '清空',
		cancelText: '取消'
	});

	if (confirmed) {
		localStorage.removeItem(`taskLogs_${username}`);
		document.getElementById('taskStatusDisplay').innerHTML = '';
	}
}

// 用户数据管理
async function fetchUserData() {
	try {
		const response = await fetch(
			`${USER_API_URL}?api=https://sso.chaoxing.com/apis/login/userLogin4Uname.do&user=${username}`
		);
		if (!response.ok) throw new Error('网络响应不正常');

		const data = await response.json();

		if (data.code === 200) {
			const user = data.msg;
			const avatarElement = document.getElementById('user-avatar');
			if (avatarElement) {
				avatarElement.src = user.pic || 'default-avatar.png';
			}

			// 更新用户信息显示
			document.getElementById('user-name').textContent = user.name;
			document.getElementById('user-id').textContent = `ID: ${user.uid}`;
			document.getElementById('user-school').textContent = `学校: ${user.schoolname || '未知'}`;
			document.getElementById('user-phone').textContent = user.phone;
			document.getElementById('user-studentcode').textContent = user.studentcode || '未设置';
			document.getElementById('user-acttime').textContent = user.acttime2;
			document.getElementById('library-status').textContent = user.bindOpac ? '已绑定' : '未绑定';
			document.getElementById('campus-card-status').textContent = user.bindFanya ? '已绑定' : '未绑定';
		} else {
			throw new Error(data.msg || '获取用户信息失败');
		}
	} catch (error) {}
}

// 用户退出登录
async function logout() {
	const confirmed = await showModal({
		title: '退出登录',
		message: '确定要退出当前账号吗？',
		icon: 'box-arrow-right',
		danger: false,
		confirmText: '退出',
		cancelText: '取消'
	});

	if (confirmed) {
		localStorage.removeItem('chaoxingLogin');
		window.location.replace('index.html');
	}
}

// 模态框管理
const modal = {
	overlay: document.getElementById('modal-overlay'),
	container: document.querySelector('.modal-container'),
	title: document.querySelector('.modal-title'),
	message: document.getElementById('modal-message'),
	icon: document.querySelector('.modal-icon i'),
	cancelBtn: document.querySelector('.modal-btn-cancel'),
	confirmBtn: document.querySelector('.modal-btn-confirm'),

	show: function(options) {
		this.title.textContent = options.title || '提示';
		this.message.textContent = options.message || '确认执行此操作吗？';
		this.icon.className = `bi bi-${options.icon || 'info-circle'}`;
		this.confirmBtn.textContent = options.confirmText || '确认';
		this.cancelBtn.textContent = options.cancelText || '取消';

		// 根据选项设置确认按钮样式
		if (options.danger) {
			this.confirmBtn.className = 'modal-btn modal-btn-danger';
		} else {
			this.confirmBtn.className = 'modal-btn modal-btn-confirm';
		}

		// 是否显示取消按钮
		if (options.showCancel === false) {
			this.cancelBtn.style.display = 'none';
		} else {
			this.cancelBtn.style.display = 'inline-block';
		}

		this.overlay.classList.add('active');

		return new Promise((resolve) => {
			const confirmHandler = () => {
				this.hide();
				resolve(true);
				this.removeEventListeners(confirmHandler, cancelHandler);
			};

			const cancelHandler = () => {
				this.hide();
				resolve(false);
				this.removeEventListeners(confirmHandler, cancelHandler);
			};

			this.confirmBtn.addEventListener('click', confirmHandler);
			this.cancelBtn.addEventListener('click', cancelHandler);
			this.overlay.querySelector('.modal-close').addEventListener('click', cancelHandler);
		});
	},

	hide: function() {
		this.overlay.classList.remove('active');
	},

	removeEventListeners: function(confirmHandler, cancelHandler) {
		this.confirmBtn.removeEventListener('click', confirmHandler);
		this.cancelBtn.removeEventListener('click', cancelHandler);
		this.overlay.querySelector('.modal-close').removeEventListener('click', cancelHandler);
	}
};

// 简化调用
function showModal(options) {
	return modal.show(options);
}

// 初始化页面
window.addEventListener('DOMContentLoaded', () => {
	fetchUserData();
	initTaskManager();

	// 绑定事件监听器
	document.getElementById('toggleTaskBtn').addEventListener('click', toggleTask);
	document.getElementById('clearLogsBtn').addEventListener('click', clearLogs);
	document.getElementById('logout-button').addEventListener('click', logout);

	// 点击遮罩层关闭弹窗
	modal.overlay.addEventListener('click', (e) => {
		if (e.target === modal.overlay) {
			modal.hide();
		}
	});
});