const username = JSON.parse(localStorage.getItem('chaoxingLogin')).username;
// 获取课程进度数据
async function fetchCourseProgress(clazzPersonStr) {
    try {
        const clazzPersonParam = Array.isArray(clazzPersonStr) ? clazzPersonStr.join(',') : clazzPersonStr;
        const url = `api/http.php?user=${username}&api=${encodeURIComponent(`https://mooc2-ans.chaoxing.com/mooc2-ans/mycourse/stu-job-info?clazzPersonStr=${clazzPersonParam}`)}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const result = await response.json();

        // 构建课程进度映射表
        return result.jobArray.reduce((map, item) => {
            map[item.clazzId] = {
                rate: item.jobRate,
                finished: item.jobFinishCount,
                total: item.jobCount
            };
            return map;
        }, {});

    } catch (error) {
        console.error('获取课程进度失败:', error);
        return {};
    }
}

// 从接口获取课程数据
async function fetchCourses() {
    try {
        const response = await fetch(
            `api/http.php?api=${encodeURIComponent("https://mooc2-ans.chaoxing.com/mooc2-ans/visit/courselistdata?courseType=1&courseFolderId=0&query=&pageHeader=-1&single=0&superstarClass=0")}&user=${username}`
        );
        const data = await response.json();

        // 解析HTML内容获取课程信息
        const htmlDoc = new DOMParser().parseFromString(data.data, 'text/html');
        const courseElements = htmlDoc.querySelectorAll('.learnCourse');
        if (!courseElements.length) return [];

        // 收集所有课程的clazzPerson信息
        const clazzPersonArr = Array.from(courseElements).map(courseEl => 
            `${courseEl.querySelector('.clazzId').value}_${courseEl.querySelector('.curPersonId').value}`
        );

        // 获取所有课程的进度数据
        const progressMap = await fetchCourseProgress(clazzPersonArr.join(','));

        // 构建课程数据数组
        return Array.from(courseElements).map(courseEl => {
            const clazzId = courseEl.querySelector('.clazzId').value;
            const dateRange = courseEl.querySelector('.course-info p:last-child').textContent.trim();
            const dateMatch = dateRange.match(/(\d{4}-\d{2}-\d{2})～(\d{4}-\d{2}-\d{2})/);
            
            const course = {
                id: courseEl.id.split('_')[1],
                clazzId,
                courseId: courseEl.querySelector('.courseId').value,
                role: courseEl.querySelector('.role').value,
                curPersonId: courseEl.querySelector('.curPersonId').value,
                coverImage: courseEl.querySelector('.course-cover img').src,
                title: courseEl.querySelector('.course-name').textContent.trim(),
                teacher: courseEl.querySelector('.color3').textContent.trim(),
                school: courseEl.querySelector('.color2')?.textContent.trim() || '',
                dateRange,
                isEnded: courseEl.querySelector('.not-open-tip') !== null,
                progress: progressMap[clazzId] || { rate: 0, finished: 0, total: 0 }
            };

            // 设置课程时间状态
            if (dateMatch) {
                course.startDate = new Date(dateMatch[1]);
                course.endDate = new Date(dateMatch[2]);
                course.isActive = new Date() >= course.startDate && new Date() <= course.endDate;
            }

            return course;
        });

    } catch (error) {
        console.error('获取课程数据失败:', error);
        return [];
    }
}

// 渲染单个课程卡片
function renderCourseCard(course) {
    // 确定课程状态
    let statusBadge = '';
    let statusClass = '';
    
    if (course.isEnded) {
        statusBadge = '<span class="course-status badge-ended">已结束</span>';
        statusClass = 'ended';
    } else if (course.isActive) {
        statusBadge = '<span class="course-status badge-active">进行中</span>';
        statusClass = 'active';
    } else if (new Date() < course.startDate) {
        statusBadge = '<span class="course-status badge-upcoming">未开始</span>';
        statusClass = 'upcoming';
    }

    // 构建进度条HTML（仅对进行中的课程显示）
    const progressHtml = course.isActive && !course.isEnded ? `
        <div class="progress-container">
            <div class="progress">
                <div class="progress-bar" role="progressbar" style="width: ${course.progress.rate}%" 
                     aria-valuenow="${course.progress.rate}" aria-valuemin="0" aria-valuemax="100"></div>
            </div>
            <div class="progress-text">
                任务点完成: ${course.progress.finished}/${course.progress.total} (${course.progress.rate}%)
            </div>
        </div>
    ` : '';

    return `
        <div class="col-md-6 col-lg-4 course-item ${statusClass}">
            <div class="course-card">
                <div class="course-cover">
                    <img src="${course.coverImage}" alt="${course.title}">
                    ${statusBadge}
                </div>
                <div class="course-info">
                    <h3 class="course-title" title="${course.title}">${course.title}</h3>
                    ${course.school ? `<p class="course-school">${course.school}</p>` : ''}
                    <p class="course-teacher"><i class="bi bi-person"></i> ${course.teacher}</p>
                    ${progressHtml}
                    <p class="course-date"><i class="bi bi-calendar"></i> ${course.dateRange}</p>
                </div>
            </div>
        </div>
    `;
}

// 渲染空状态提示
function renderEmptyState(icon, title, message) {
    return `
        <div class="empty-state">
            <i class="bi ${icon}"></i>
            <h3>${title}</h3>
            <p>${message}</p>
        </div>
    `;
}

// 渲染所有课程到页面
async function renderCourses() {
    const courses = await fetchCourses();
    const containers = {
        all: document.getElementById('allCoursesContainer'),
        active: document.getElementById('activeCoursesContainer'),
        ended: document.getElementById('endedCoursesContainer')
    };

    // 处理无课程情况
    if (!courses.length) {
        containers.all.innerHTML = renderEmptyState('bi-journal-x', '暂无课程', '您当前没有可显示的课程');
        containers.active.innerHTML = renderEmptyState('bi-journal-check', '没有进行中的课程', '您当前没有正在进行的课程');
        containers.ended.innerHTML = renderEmptyState('bi-journal-check', '没有已结束的课程', '您当前没有已结束的课程');
        return;
    }

    // 分类课程
    const [activeCourses, endedCourses] = courses.reduce((acc, course) => {
        if (course.isActive && !course.isEnded) acc[0].push(course);
        else if (course.isEnded) acc[1].push(course);
        return acc;
    }, [[], []]);

    // 渲染到对应容器
    containers.all.innerHTML = courses.map(renderCourseCard).join('');
    containers.active.innerHTML = activeCourses.length 
        ? activeCourses.map(renderCourseCard).join('') 
        : renderEmptyState('bi-journal-check', '没有进行中的课程', '您当前没有正在进行的课程');
    containers.ended.innerHTML = endedCourses.length 
        ? endedCourses.map(renderCourseCard).join('') 
        : renderEmptyState('bi-journal-check', '没有已结束的课程', '您当前没有已结束的课程');
}

// 页面加载完成后渲染课程
document.addEventListener('DOMContentLoaded', renderCourses);