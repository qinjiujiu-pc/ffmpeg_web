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
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <h1>视频处理工具</h1>
      <p>基于FFmpeg.js的纯前端视频处理解决方案</p>
    </header>

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
      <p>© {{ new Date().getFullYear() }} 视频处理工具 | 基于FFmpeg.js和Vue 3</p>
      <div class="footer-links">
        <a href="https://github.com/ffmpegwasm/ffmpeg.wasm" target="_blank">FFmpeg.wasm</a> |
        <a href="https://ffmpeg.org/documentation.html" target="_blank">FFmpeg文档</a>
      </div>
    </footer>
  </div>
</template>

<style>
body {
  margin: 0;
  padding: 0;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  background-color: #f5f7fa;
}

.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-header {
  background-color: #409eff;
  color: white;
  text-align: center;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.app-header h1 {
  margin: 0;
  font-size: 28px;
}

.app-header p {
  margin: 10px 0 0;
  font-size: 16px;
  opacity: 0.8;
}

.app-content {
  flex: 1;
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

.feature-tabs {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 20px;
}

.log-section {
  margin-top: 20px;
}

.toggle-logs-btn {
  margin-bottom: 10px;
}

.log-panel {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-bottom: 20px;
}

.app-footer {
  background-color: #f5f7fa;
  color: #606266;
  text-align: center;
  padding: 15px;
  font-size: 14px;
  border-top: 1px solid #e4e7ed;
}

.footer-links {
  margin-top: 5px;
  font-size: 12px;
}

.footer-links a {
  color: #409eff;
  text-decoration: none;
  margin: 0 5px;
}

.footer-links a:hover {
  text-decoration: underline;
}
</style>
