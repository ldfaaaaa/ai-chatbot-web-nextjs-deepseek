<img width="3060" height="1578" alt="74349ec1e6a359098e4ef86298a7bde6" src="https://github.com/user-attachments/assets/a2c5976e-60f6-46bf-b41e-1ed199983394" /># AI聊天机器人网页（Next.js + DeepSeek-V3）

## 项目背景
这是一个类似于ChatGPT的网页版AI聊天工具，使用DeepSeek-V3模型驱动。适合企业内部使用或个人助手，提供流式对话体验。部署简单，免费上Vercel，适用于快速原型开发和交付。

## 核心卖点
- 流式输出和Markdown渲染，提升用户体验。
- 一键部署，客户可立即上线。

## 核心功能
- 流式对话（打字机效果，支持多轮上下文）。
- Markdown渲染（包括代码高亮）。
- 多轮对话历史（使用localStorage本地保存）。
- 清空对话按钮（快速重置）。
- 可扩展工具调用（如查天气，注释已提供）。

## 技术栈
- 前端框架：Next.js 15 (App Router) + React 19。
- AI集成：Vercel AI SDK + DeepSeek-V3。
- UI：Tailwind CSS + shadcn/ui。
- 部署：Vercel（免费一键）。

## 快速启动
1. 克隆仓库：`git clone https://github.com/你的用户名/ai-chatbot-web-nextjs-deepseek.git`
2. 安装依赖：`pnpm install`（或npm/yarn）。
3. 配置环境：在根目录创建.env.local文件，添加`DEEPSEEK_API_KEY=你的密钥`。
4. 本地运行：`pnpm dev`，访问http://localhost:3000。
5. 部署：连接GitHub到Vercel，一键部署后得到在线链接。
6. 测试：输入问题，观察流式输出。

## 演示截图
（插入你的截图）
 // 流式对话
 ![聊天界面]
 <img width="3060" height="1578" alt="74349ec1e6a359098e4ef86298a7bde6" src="https://github.com/user-attachments/assets/93343240-dc3b-4453-b150-5d9f97db2d02" />
<img width="3066" height="1550" alt="43ff27b74137fb7d534f3f424338f945" src="https://github.com/user-attachments/assets/73789c4c-bf9b-4ab2-a49a-efa5d80dea3a" />
<img width="3070" height="1564" alt="fda5eeee1660b0f2e706fb80d60b2ecd" src="https://github.com/user-attachments/assets/c7afb1c8-70a8-490e-bb00-a08d36d9eadd" />




## 联系方式
需要定制（如添加企业LOGO或特定工具调用）？联系我（1595238642@qqcom），3天内交付，7天免费优化。

---
作者：晟（2026年AI副业实践者）
