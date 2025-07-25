# ChaoxingSignWeb
学习通自动签到网页版

## 📌 项目简介
**ChaoxingSignWeb** (学习通自动签到网页版)是一个基于网页的学习通（超星）自动签到工具，帮助用户自动化完成课程签到流程，适用于学生和教师群体。项目开源免费，支持自定义配置，无需安装客户端即可使用。

联系我们：869744971

---

## ✨ 功能特点
| 功能 | 描述 |
|------|------|
| ✅ **多签到模式支持** | 支持普通签到、二维码签到、位置签到等多种学习通签到类型 |
| **网页操作** | 纯前端实现，无需下载安装，打开浏览器即可使用 |
| **定时任务** | 可设置定时自动签到，避免遗漏签到时间 |
| **轻量简洁** | 代码结构清晰，资源占用低，响应速度快 |

---
### 部署说明
目前仅支持本地部署模式，不支持线上服务器部署。
如果用户反馈多的话，预计未来会更新，或者有能力的自己修复问题。
其实也是小问题，就是过Chaoxing登录接口的反爬机制。

## 🛠️ 安装与使用说明

### 部署使用

- 环境要求（Windows,Linux待测）
- PHP >= 7.4
- 工具可选（phpstudy，宝塔windows面板）
- 创建空白网站，关闭防跨站攻击
- 将源码解压到根目录即可
- 访问 http://your_ip/

### 页面介绍
1. **index.html**（✔️）
   用户登录页面，所有操作必须登录，因此访问网站的首页就是登录页面。进入此页面会自动检测登录状态并登录。

2. **home.html**（✔️）用户信息展示页，此页面控制自动签到开关状态，以及查看签到日志。仅显示签到成功日志。若需查看更详细的日志，请到api/task/{$user}/status.log文件查看。
  

3. **class.html**（开发中）
   课程学习进度展示页面（目前仅能展示）

4. **course.html**（✔️）
   获取课程表，支持翻页，导航方式（列表/表格）。

5. **setting.php**（✔️）
   签到参数配置页面
6. **api/login.php**（✔️）
   登录函数
7. **api/task.php**（✔️）
   任务控制函数
8. **api/http.php**（✔️）
   请求转发函数，目的是为了解决js跨域访问的问题

---

## 🤝 贡献指南
欢迎开发者参与改进！以下是贡献流程：

1. **提交Issue**  
   反馈BUG或提出新功能建议。
2. **Fork仓库**  
   基于`main`分支开发新功能。
3. **代码规范**  
   保持代码整洁，添加必要注释。
4. **提交PR**  
   描述修改内容并关联对应Issue。

---

## 📜 许可证
本项目采用 **GPL-3.0 License**，允许自由使用、修改和分发，但必须开源，若进行二次开发，务必在其中一个界面保留开发者信息，详情见`LICENSE`文件。

---

> ⚠️ **提示**：使用前请确保遵守学校/平台的相关规定，避免违规操作。