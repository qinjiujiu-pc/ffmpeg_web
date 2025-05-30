<script setup>
import { ref } from 'vue';
import VideoTrimmer from './components/video/VideoTrimmer.vue';
import AudioExtractor from './components/audio/AudioExtractor.vue';
import KeyframeExtractor from './components/keyframe/KeyframeExtractor.vue';
import VideoConverter from './components/converter/VideoConverter.vue';
import LogViewer from './components/common/LogViewer.vue';

// 当前活动的标签页
const activeTab = ref('trimmer');
const showLogs = ref(false);
const logViewerRef = ref(null);

// 切换日志查看器
const toggleLogs = () => {
  showLogs.value = !showLogs.value;
  if (showLogs.value && logViewerRef.value) {
    logViewerRef.value.updateLogs();
  }
};

// 优势说明的数据
const advantages = [
  {
    title: '快速简便',
    description: '只需将文件拖放到网页上即可开始处理。选择输出格式和参数，然后等待几秒钟完成转换过程。',
    icon: 'Timer'
  },
  {
    title: '高质量',
    description: '我们使用高质量的视频处理算法，在转换过程中保持原始品质，让您的视频保持最佳效果。',
    icon: 'Star'
  },
  {
    title: '支持所有设备',
    description: '在任何操作系统（Windows、Mac或Linux）上都可以通过您喜欢的浏览器使用。在Android和iPhone上也可以处理视频。',
    icon: 'Monitor'
  },
  {
    title: '文件保护',
    description: '所有处理均在浏览器本地完成，文件不会上传到任何服务器，保障您的数据隐私安全。',
    icon: 'Lock'
  },
  {
    title: '转换成任何格式',
    description: '支持在流行的格式间转换，如MP4、WMV、MOV、AVI以及其他更为罕见的格式，满足各种场景需求。',
    icon: 'Files'
  },
  {
    title: '可自定义的设置',
    description: '可调整视频的各项参数，轻松自定义质量、宽高比、编解码器等设置，还可以旋转和翻转视频。',
    icon: 'Setting'
  }
];
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-content">
        <div class="logo-section">
          <h1>FFmpeg Web</h1>
          <p>浏览器端视频处理解决方案</p>
        </div>
        <div class="header-actions">
          <el-button type="primary" @click="activeTab = 'trimmer'" :icon="'VideoPlay'">开始处理</el-button>
        </div>
      </div>
    </header>

    <section class="advantages-section">
      <div class="section-header">
        <h2>为什么选择FFmpeg Web</h2>
        <p>基于WebAssembly的高性能视频处理工具，无需上传，全程保护隐私</p>
      </div>
      <div class="advantages-grid">
        <div v-for="(advantage, index) in advantages" :key="index" class="advantage-card">
          <div class="advantage-icon">
            <el-icon :size="40"><component :is="advantage.icon" /></el-icon>
          </div>
          <h3>{{ advantage.title }}</h3>
          <p>{{ advantage.description }}</p>
        </div>
      </div>
    </section>

    <main class="app-content">
      <el-tabs v-model="activeTab" class="feature-tabs">
        <el-tab-pane label="视频裁剪" name="trimmer">
          <VideoTrimmer />
        </el-tab-pane>
        <el-tab-pane label="音频提取" name="audio">
          <AudioExtractor />
        </el-tab-pane>
        <el-tab-pane label="关键帧提取" name="keyframe">
          <KeyframeExtractor />
        </el-tab-pane>
        <el-tab-pane label="格式转换" name="converter">
          <VideoConverter />
        </el-tab-pane>
      </el-tabs>

      <div class="log-section">
        <el-button @click="toggleLogs" :type="showLogs ? 'primary' : 'default'" class="toggle-logs-btn">
          {{ showLogs ? '隐藏处理日志' : '显示处理日志' }}
        </el-button>
        <div v-if="showLogs" class="log-panel">
          <LogViewer ref="logViewerRef" />
        </div>
      </div>
    </main>

    <footer class="app-footer">
      <div class="footer-content">
        <div class="footer-section">
          <h3>关于项目</h3>
          <p>FFmpeg Web是一个开源项目，基于FFmpeg.js和Vue 3构建，旨在提供高效的浏览器端视频处理解决方案。</p>
        </div>
        <div class="footer-section">
          <h3>相关链接</h3>
          <div class="footer-links">
            <a href="https://github.com/ffmpegwasm/ffmpeg.wasm" target="_blank">FFmpeg.wasm</a>
            <a href="https://ffmpeg.org/documentation.html" target="_blank">FFmpeg文档</a>
            <a href="https://github.com/qinjiujiu-pc/ffmpeg_web" target="_blank">项目源码</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p>© {{ new Date().getFullYear() }} FFmpeg Web | 保留所有权利</p>
      </div>
    </footer>
  </div>
</template>

<style>
:root {
  --primary-color: #2563eb;
  --secondary-color: #3b82f6;
  --accent-color: #1e40af;
  --background-dark: #0f172a;
  --background-light: #f8fafc;
  --text-dark: #1e293b;
  --text-light: #f1f5f9;
  --border-color: #e2e8f0;
  --card-bg: rgba(255, 255, 255, 0.9);
  --card-shadow: 0 4px 20px rgba(0, 20, 60, 0.1);
  --gradient-start: #3b82f6;
  --gradient-end: #2563eb;
}

body {
  margin: 0;
  padding: 0;
  font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--text-dark);
  background-color: var(--background-light);
  background-image: linear-gradient(135deg, #f0f7ff 0%, #e6f0ff 100%);
}

.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-header {
  background-color: var(--background-dark);
  background-image: linear-gradient(120deg, var(--gradient-start), var(--gradient-end));
  color: white;
  padding: 25px 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  position: relative;
  overflow: hidden;
}

.app-header::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB4PSIwIiB5PSIwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSg0NSkiPjxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjAzKSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuKSIvPjwvc3ZnPg==');
  opacity: 0.6;
  z-index: 0;
}

.header-content {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
}

.logo-section h1 {
  margin: 0;
  font-size: 2.5rem;
  font-weight: 700;
  letter-spacing: -0.5px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.logo-section p {
  margin: 8px 0 0;
  font-size: 1.1rem;
  opacity: 0.85;
}

.header-actions button {
  padding: 12px 24px;
  font-weight: 600;
  border-radius: 8px;
  transition: all 0.3s;
}

.advantages-section {
  padding: 60px 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.section-header {
  text-align: center;
  margin-bottom: 50px;
}

.section-header h2 {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 12px;
  color: var(--text-dark);
}

.section-header p {
  font-size: 1.1rem;
  max-width: 700px;
  margin: 0 auto;
  color: #64748b;
}

.advantages-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 30px;
}

.advantage-card {
  background: var(--card-bg);
  border-radius: 12px;
  box-shadow: var(--card-shadow);
  padding: 30px;
  transition: transform 0.3s, box-shadow 0.3s;
  position: relative;
  z-index: 1;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.7);
}

.advantage-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%);
  z-index: -1;
}

.advantage-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 30px rgba(0, 20, 60, 0.15);
}

.advantage-icon {
  margin-bottom: 20px;
  color: var(--primary-color);
  background: rgba(59, 130, 246, 0.1);
  width: 70px;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.advantage-card h3 {
  font-size: 1.3rem;
  font-weight: 600;
  margin: 0 0 12px;
  color: var(--text-dark);
}

.advantage-card p {
  font-size: 0.95rem;
  color: #4b5563;
  margin: 0;
  line-height: 1.6;
}

.app-content {
  flex: 1;
  padding: 30px 20px 60px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

.feature-tabs {
  background-color: white;
  border-radius: 12px;
  box-shadow: var(--card-shadow);
  padding: 30px;
}

.log-section {
  margin-top: 30px;
}

.toggle-logs-btn {
  margin-bottom: 15px;
}

.log-panel {
  background-color: white;
  border-radius: 12px;
  box-shadow: var(--card-shadow);
  padding: 20px;
  margin-bottom: 20px;
}

.app-footer {
  background-color: var(--background-dark);
  color: var(--text-light);
  padding: 50px 20px 20px;
}

.footer-content {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  max-width: 1200px;
  margin: 0 auto;
  gap: 40px;
}

.footer-section {
  flex: 1;
  min-width: 250px;
}

.footer-section h3 {
  font-size: 1.2rem;
  margin: 0 0 15px;
  color: #e2e8f0;
  position: relative;
  padding-bottom: 10px;
}

.footer-section h3::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: 0;
  width: 40px;
  height: 3px;
  background-color: var(--secondary-color);
}

.footer-section p {
  line-height: 1.6;
  color: #94a3b8;
  margin: 0;
}

.footer-links {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.footer-links a {
  color: #94a3b8;
  text-decoration: none;
  transition: color 0.2s;
  display: inline-block;
  padding: 2px 0;
}

.footer-links a:hover {
  color: #e2e8f0;
}

.footer-bottom {
  text-align: center;
  padding-top: 40px;
  margin-top: 40px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  max-width: 1200px;
  margin: 40px auto 0;
}

.footer-bottom p {
  color: #64748b;
  font-size: 0.9rem;
  margin: 0;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    text-align: center;
  }
  
  .header-actions {
    margin-top: 20px;
  }
  
  .advantages-grid {
    grid-template-columns: 1fr;
  }
  
  .footer-content {
    flex-direction: column;
  }
}
</style>
