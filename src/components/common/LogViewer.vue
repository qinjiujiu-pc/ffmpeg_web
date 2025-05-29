<template>
  <div class="log-viewer">
    <div class="log-header">
      <h3>FFmpeg 处理日志</h3>
      <div class="log-actions">
        <el-button size="small" @click="clearLogs" type="danger" plain>清空日志</el-button>
        <el-button size="small" @click="copyLogs" type="primary" plain>复制日志</el-button>
        <el-button size="small" @click="toggleAutoScroll" :type="autoScroll ? 'success' : 'info'" plain>
          {{ autoScroll ? '自动滚动: 开' : '自动滚动: 关' }}
        </el-button>
      </div>
    </div>
    <div class="log-filter">
      <el-checkbox-group v-model="activeLogTypes" size="small">
        <el-checkbox value="info">信息</el-checkbox>
        <el-checkbox value="warning">警告</el-checkbox>
        <el-checkbox value="error">错误</el-checkbox>
        <el-checkbox value="fferr">FFmpeg输出</el-checkbox>
        <el-checkbox value="ffout">FFmpeg错误</el-checkbox>
      </el-checkbox-group>
      <el-input
        v-model="searchText"
        placeholder="搜索日志..."
        clearable
        size="small"
        class="search-input"
      />
    </div>
    <div class="log-container" ref="logContainer">
      <div
        v-for="(log, index) in filteredLogs"
        :key="index"
        :class="['log-entry', `log-${log.type}`]"
      >
        <div class="log-time">{{ formatTimestamp(log.timestamp) }}</div>
        <div class="log-type">[{{ formatLogType(log.type) }}]</div>
        <div class="log-message">{{ log.message }}</div>
      </div>
      <div v-if="filteredLogs.length === 0" class="no-logs">
        暂无日志记录
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import ffmpegService from '@/utils/ffmpeg-service';

// 状态变量
const logs = ref([]);
const logContainer = ref(null);
const searchText = ref('');
const autoScroll = ref(true);
const activeLogTypes = ref(['info', 'warning', 'error', 'fferr', 'ffout']);

// 格式化日志类型
const formatLogType = (type) => {
  switch (type) {
    case 'info': return '信息';
    case 'warning': return '警告';
    case 'error': return '错误';
    case 'fferr': return 'FFmpeg错误';
    case 'ffout': return 'FFmpeg输出';
    default: return type;
  }
};

// 格式化时间戳
const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', { hour12: false }) + '.' + 
         date.getMilliseconds().toString().padStart(3, '0');
};

// 过滤日志
const filteredLogs = computed(() => {
  return logs.value
    .filter(log => 
      activeLogTypes.value.includes(log.type) && 
      (!searchText.value || log.message.toLowerCase().includes(searchText.value.toLowerCase()))
    )
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
});

// 清空日志
const clearLogs = () => {
  logs.value = [];
  ffmpegService.clearLogs();
};

// 复制日志
const copyLogs = () => {
  const logText = filteredLogs.value
    .map(log => `[${formatTimestamp(log.timestamp)}] [${formatLogType(log.type)}] ${log.message}`)
    .join('\n');
  
  if (logText.trim() === '') {
    ElMessage.warning('没有可复制的日志');
    return;
  }

  navigator.clipboard.writeText(logText)
    .then(() => {
      ElMessage.success('日志已复制到剪贴板');
    })
    .catch(err => {
      console.error('复制失败:', err);
      ElMessage.error('复制失败，请手动选择并复制');
    });
};

// 切换自动滚动
const toggleAutoScroll = () => {
  autoScroll.value = !autoScroll.value;
};

// 滚动到底部
const scrollToBottom = () => {
  if (!logContainer.value || !autoScroll.value) return;
  
  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight;
    }
  });
};

// 更新日志
const updateLogs = () => {
  logs.value = ffmpegService.getLogs();
  scrollToBottom();
};

// 监听日志变化
watch(filteredLogs, () => {
  scrollToBottom();
});

// 处理FFmpeg日志消息
const handleLog = (logEntry) => {
  logs.value = [...logs.value, logEntry];
  scrollToBottom();
};

// 生命周期钩子
onMounted(() => {
  // 加载已有日志
  updateLogs();
  
  // 监听新的日志
  ffmpegService.on('log', handleLog);
});

onUnmounted(() => {
  // 移除日志监听
  ffmpegService.on('log', null);
});

// 对外暴露方法
defineExpose({
  updateLogs,
  clearLogs
});
</script>

<style scoped>
.log-viewer {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #dcdfe6;
}

.log-header h3 {
  margin: 0;
  font-size: 16px;
}

.log-actions {
  display: flex;
  gap: 8px;
}

.log-filter {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 15px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #dcdfe6;
}

.search-input {
  width: 200px;
}

.log-container {
  flex: 1;
  overflow-y: auto;
  padding: 10px 15px;
  background-color: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  height: 300px;
}

.log-entry {
  display: flex;
  margin-bottom: 4px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}

.log-time {
  color: #6a9955;
  margin-right: 8px;
  flex-shrink: 0;
}

.log-type {
  color: #569cd6;
  margin-right: 8px;
  flex-shrink: 0;
  width: 80px;
}

.log-message {
  flex: 1;
}

.log-info {
  color: #d4d4d4;
}

.log-warning {
  color: #dcdcaa;
}

.log-error {
  color: #f14c4c;
}

.log-fferr {
  color: #ce9178;
}

.log-ffout {
  color: #b5cea8;
}

.no-logs {
  color: #6a9955;
  font-style: italic;
  text-align: center;
  margin-top: 20px;
}
</style> 