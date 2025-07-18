// 全局变量
let currentWeek = 0;
let maxWeek = 0;
let firstWeekTimestamp = 0;
let timeSlots = [];
let semesterInfo = '';
let currentCourses = [];
let isLoading = false;
let loadingBar = null;
const userName = JSON.parse(localStorage.getItem('chaoxingLogin')).username;

// DOM元素引用
const timetableBody = document.getElementById('timetable-body');
const listView = document.getElementById('list-view');
const weekInfo = document.getElementById('week-info');
const weekTitle = document.getElementById('week-title');
const prevWeekBtn = document.getElementById('prev-week');
const nextWeekBtn = document.getElementById('next-week');
const gridViewBtn = document.getElementById('grid-view-btn');
const listViewBtn = document.getElementById('list-view-btn');
const timetableView = document.getElementById('timetable-view');
const weekSelect = document.getElementById('week-select');

// 初始化页面
document.addEventListener('DOMContentLoaded', () => {
	initializePage();
});

/**
 * 初始化页面
 */
function initializePage() {
	if (!userName) {
		showError('未提供用户名参数');
		return;
	}

	setupEventListeners();
	fetchInitialData();
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
	// 周导航按钮
	prevWeekBtn.addEventListener('click', () => navigateWeek(-1));
	nextWeekBtn.addEventListener('click', () => navigateWeek(1));

	// 视图切换按钮
	gridViewBtn.addEventListener('click', () => switchView('grid'));
	listViewBtn.addEventListener('click', () => switchView('list'));

	// 周选择器
	weekSelect.addEventListener('change', handleWeekSelectChange);
}

/**
 * 初始化加载条
 */
function initLoadingBar() {
	if (!document.getElementById('loading-container')) {
		const container = document.createElement('div');
		container.id = 'loading-container';
		container.className = 'loading-container';
		container.innerHTML = '<div class="loading-bar"></div>';
		document.body.appendChild(container);
	}
	loadingBar = document.querySelector('.loading-bar');
}

/**
 * 显示加载进度
 */
function showLoading() {
	if (isLoading) return;

	initLoadingBar();
	isLoading = true;

	// 使用requestAnimationFrame确保流畅动画
	requestAnimationFrame(() => {
		loadingBar.style.width = '0';
		loadingBar.style.left = '0';
		document.getElementById('loading-container').style.display = 'block';

		// 小延迟确保CSS重置生效
		setTimeout(() => {
			loadingBar.style.transition = 'none';
			loadingBar.style.width = '100%';
			loadingBar.style.left = '100%';
		}, 10);
	});
}

/**
 * 隐藏加载进度
 */
function hideLoading() {
	if (!isLoading) return;

	requestAnimationFrame(() => {
		loadingBar.style.transition = 'width 0.3s ease-out';
		loadingBar.style.width = '100%';

		setTimeout(() => {
			document.getElementById('loading-container').style.display = 'none';
			isLoading = false;
		}, 300);
	});
}

/**
 * 获取初始数据（学期信息、周数等）
 */
async function fetchInitialData() {
	try {
		showLoading();
		const response = await fetch(
			`api/http.php?api=https://kb.chaoxing.com/pc/curriculum/getMyLessons?curTime=${Date.now()}&user=${userName}`
		);

		if (!response.ok) throw new Error('网络响应不正常');

		const data = await response.json();

		if (data.code === 200) {
			processInitialData(data.data.curriculum);
		} else {
			throw new Error(data.msg || '获取课程数据失败');
		}
	} catch (error) {
		showError(error.message);
	} finally {
		// 确保无论成功失败都隐藏加载条
		setTimeout(hideLoading, 500);
	}
}

/**
 * 处理初始数据
 */
function processInitialData(curriculumData) {
	firstWeekTimestamp = curriculumData.firstWeekDateReal;
	currentWeek = curriculumData.currentWeek;
	maxWeek = curriculumData.maxWeek;
	timeSlots = curriculumData.lessonTimeConfigArray;

	// 设置学期信息
	const firstWeekDate = new Date(firstWeekTimestamp);
	const year = firstWeekDate.getFullYear();
	const month = firstWeekDate.getMonth() + 1;
	const semester = (month >= 2 && month <= 7) ? 2 : 1;
	semesterInfo = `${year}学年 第${semester}学期`;

	initWeekSelect();
	updateWeekInfo();
	fetchWeekData();
}

/**
 * 初始化周选择器
 */
function initWeekSelect() {
	weekSelect.innerHTML = '';
	for (let i = 1; i <= maxWeek; i++) {
		const option = document.createElement('option');
		option.value = i;
		option.textContent = `第${i}周`;
		if (i === currentWeek) option.selected = true;
		weekSelect.appendChild(option);
	}
}

/**
 * 获取指定周的课程数据
 */
async function fetchWeekData() {
	try {
		showLoading();
		const weekStartTimestamp = firstWeekTimestamp + (currentWeek - 1) * 7 * 24 * 60 * 60 * 1000;

		const response = await fetch(
			`api/http.php?api=https://kb.chaoxing.com/pc/curriculum/getMyLessons?week=${currentWeek}&curTime=${weekStartTimestamp}&user=${userName}`
		);

		if (!response.ok) throw new Error('网络响应不正常');

		const data = await response.json();

		if (data.code === 200) {
			currentCourses = data.data.lessonArray || [];
			renderCourses(currentCourses);
			weekSelect.value = currentWeek;
		} else {
			throw new Error(data.msg || '获取课程数据失败');
		}
	} catch (error) {
		showError(error.message);
	} finally {
		setTimeout(hideLoading, 500);
	}
}

/**
 * 更新周信息显示
 */
function updateWeekInfo() {
	if (currentWeek === 0) {
		weekInfo.textContent = '加载中...';
		weekTitle.textContent = semesterInfo || '加载中...';
		return;
	}

	const startDate = new Date(firstWeekTimestamp + (currentWeek - 1) * 7 * 24 * 60 * 60 * 1000);
	const endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);

	const formatDate = (date) => {
		return `${(date.getMonth() + 1).toString().padStart(2, '0')}月${date.getDate().toString().padStart(2, '0')}日`;
	};

	weekInfo.textContent = `第${currentWeek}周 (${formatDate(startDate)}-${formatDate(endDate)})`;
	weekTitle.textContent = `${semesterInfo} - 第${currentWeek}周`;

	// 更新导航按钮状态
	prevWeekBtn.disabled = currentWeek <= 1;
	nextWeekBtn.disabled = currentWeek >= maxWeek;
}

/**
 * 渲染课程表视图
 */
function renderCourses(weekCourses) {
	timetableBody.innerHTML = '';

	if (!weekCourses || weekCourses.length === 0) {
		timetableBody.innerHTML = '<div class="empty-message">本周没有课程</div>';
		return;
	}

	// 创建时间轴和课程格子
	for (let i = 0; i < timeSlots.length; i++) {
		// 时间单元格
		const timeCell = document.createElement('div');
		timeCell.className = 'time-cell';
		timeCell.textContent = timeSlots[i];
		timetableBody.appendChild(timeCell);

		// 每天的课程单元格
		for (let day = 1; day <= 5; day++) {
			const cell = document.createElement('div');
			cell.className = 'course-cell';

			// 查找这个时间段和这天的课程
			const courses = weekCourses.filter(course =>
				course.dayOfWeek === day && course.beginNumber === i + 1
			);

			if (courses.length > 0) {
				courses.forEach(course => {
					cell.appendChild(createCourseElement(course));
				});
			}

			timetableBody.appendChild(cell);
		}
	}
}

/**
 * 创建课程元素
 */
function createCourseElement(course) {
	const courseItem = document.createElement('div');
	courseItem.className = 'course-item';
	courseItem.innerHTML = `
                <div class="course-name">${course.name}</div>
                <div class="course-info">教师：${course.teacherName}</div>
                <div class="course-info">${course.className}</div>
                <div class="course-location">${course.location}</div>
            `;
	return courseItem;
}

/**
 * 渲染列表视图
 */
function renderListView(weekCourses) {
	listView.innerHTML = '';

	if (!weekCourses || weekCourses.length === 0) {
		listView.innerHTML = '<div class="empty-message">本周没有课程</div>';
		return;
	}

	// 按日期和时间排序
	weekCourses.sort((a, b) => {
		if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
		return a.beginNumber - b.beginNumber;
	});

	// 添加课程项
	weekCourses.forEach(course => {
		listView.appendChild(createListItem(course));
	});
}

/**
 * 创建列表项元素
 */
function createListItem(course) {
	const dayNames = ['', '周一', '周二', '周三', '周四', '周五'];
	const dayName = dayNames[course.dayOfWeek];
	const timeSlot = timeSlots[course.beginNumber - 1];

	const listItem = document.createElement('div');
	listItem.className = 'list-item';
	listItem.innerHTML = `
                <div class="list-day">${dayName}</div>
                <div>
                    <div class="course-name">${course.name}</div>
                    <div class="course-info">教师 · ${course.teacherName} · ${course.className}</div>
                </div>
                <div class="list-time">${timeSlot}</div>
                <div class="course-location">${course.location}</div>
            `;

	return listItem;
}

/**
 * 导航到上一周或下一周
 */
function navigateWeek(direction) {
	const newWeek = currentWeek + direction;
	if (newWeek >= 1 && newWeek <= maxWeek) {
		currentWeek = newWeek;
		updateWeekInfo();
		fetchWeekData();
	}
}

/**
 * 处理周选择器变化
 */
function handleWeekSelectChange(e) {
	const selectedWeek = parseInt(e.target.value);
	if (selectedWeek && selectedWeek !== currentWeek) {
		currentWeek = selectedWeek;
		updateWeekInfo();
		fetchWeekData();
	}
}

/**
 * 切换视图模式
 */
function switchView(viewType) {
	if (viewType === 'grid') {
		gridViewBtn.classList.add('active');
		listViewBtn.classList.remove('active');
		timetableView.style.display = 'block';
		listView.style.display = 'none';
	} else {
		listViewBtn.classList.add('active');
		gridViewBtn.classList.remove('active');
		timetableView.style.display = 'none';
		listView.style.display = 'block';
		renderListView(currentCourses);
	}
}

/**
 * 显示错误信息
 */
function showError(message) {
	hideLoading();

	timetableBody.innerHTML = `<div class="error-message">${message}</div>`;
	listView.innerHTML = `<div class="error-message">${message}</div>`;
}