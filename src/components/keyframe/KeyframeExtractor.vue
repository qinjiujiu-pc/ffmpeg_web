<template>
  <div class="keyframe-extractor">
    <div class="upload-container" v-if="!videoUrl">
      <el-upload
        class="upload-video"
        drag
        action=""
        :auto-upload="false"
        :show-file-list="false"
        :on-change="handleFileChange"
        accept="video/*"
      >
        <el-icon class="el-icon--upload"><i-upload /></el-icon>
        <div class="el-upload__text">拖拽视频到此处，或 <em>点击上传</em></div>
      </el-upload>
    </div>

    <div class="video-editor" v-else>
      <div class="video-preview">
        <video 
          ref="videoPlayer" 
          controls 
          :src="videoUrl" 
          @loadedmetadata="onVideoLoaded"
        ></video>
      </div>

      <div class="video-info">
        <h3>视频信息</h3>
        <div class="info-row">
          <span class="info-label">文件名:</span>
          <span class="info-value">{{ videoFile?.name || '未知' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">时长:</span>
          <span class="info-value">{{ formatTime(duration) }}</span>
        </div>
      </div>

      <div class="action-buttons">
        <el-button type="primary" @click="extractKeyframes" :loading="processing">
          提取关键帧
        </el-button>
        <el-button @click="resetVideo">重置</el-button>
      </div>

      <div class="keyframes-preview" v-if="keyframes.length > 0">
        <h3>提取的关键帧 ({{ keyframes.length }})</h3>
        <div class="keyframes-grid">
          <div 
            v-for="(frame, index) in keyframes" 
            :key="index" 
            class="keyframe-item"
            @click="previewFrame(frame)"
          >
            <img :src="frame.url" :alt="`关键帧 ${index + 1}`" />
            <div class="keyframe-info">帧 {{ index + 1 }}</div>
          </div>
        </div>
        <div class="keyframes-actions">
          <el-button type="success" @click="downloadAllFrames" :disabled="!keyframes.length">
            下载所有关键帧
          </el-button>
        </div>
      </div>
    </div>

    <el-dialog v-model="showProgress" title="处理中" :close-on-click-modal="false" width="500px">
      <div class="progress-container">
        <el-progress :percentage="progress" :format="progressFormat" />
        <div class="progress-message">{{ progressMessage }}</div>
        
        <div class="progress-details" v-if="progressDetails">
          <div class="progress-stage">
            <span class="stage-label">处理阶段:</span>
            <span class="stage-value">{{ processingStage }}</span>
          </div>
          
          <div class="progress-metrics" v-if="processingFrame">
            <div class="metric">
              <span class="metric-label">已处理帧:</span>
              <span class="metric-value">{{ processingFrame }}</span>
            </div>
            <div class="metric">
              <span class="metric-label">当前位置:</span>
              <span class="metric-value">{{ processingTime }}</span>
            </div>
            <div class="metric">
              <span class="metric-label">处理速度:</span>
              <span class="metric-value">{{ processingSpeed }}</span>
            </div>
          </div>
          
          <div class="details-text">{{ progressDetails }}</div>
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="showFramePreview" :title="`关键帧 ${selectedFrameIndex + 1}`" width="800px">
      <div class="frame-preview" v-if="selectedFrame">
        <img :src="selectedFrame.url" :alt="`关键帧 ${selectedFrameIndex + 1}`" class="preview-image" />
        <div class="frame-actions">
          <el-button type="primary" @click="downloadFrame(selectedFrame, selectedFrameIndex)">
            下载此帧
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { Upload as IUpload } from '@element-plus/icons-vue';
import { getFFmpeg, fetchFile, loadFFmpeg, extractKeyframes as ffmpegExtractKeyframes, checkIsLoaded, on } from '@/utils/ffmpeg-direct';
import { formatTime, getFilenameWithoutExtension, formatFileSize } from '@/utils/helpers';
import JSZip from 'jszip';
import { ElMessage } from 'element-plus';

// 状态变量
const videoUrl = ref('');
const videoFile = ref(null);
const videoPlayer = ref(null);
const duration = ref(0);
const processing = ref(false);
const showProgress = ref(false);
const progress = ref(0);
const progressMessage = ref('');
const progressDetails = ref('');
const processingStage = ref('');
const processingFrame = ref('');
const processingTime = ref('');
const processingSpeed = ref('');
const keyframes = ref([]);
const showFramePreview = ref(false);
const selectedFrame = ref(null);
const selectedFrameIndex = ref(0);

// 计算属性
const progressFormat = (percentage) => {
  return percentage === 100 ? '完成' : `${percentage}%`;
};

// 文件上传处理
const handleFileChange = (file) => {
  videoFile.value = file.raw;
  videoUrl.value = URL.createObjectURL(file.raw);
  // 清除之前的关键帧
  clearKeyframes();
  
  // 检查文件名是否包含中文或特殊字符
  const fileName = file.raw.name;
  const hasSpecialChars = /[^\w\s.-]/g.test(fileName);
  
  if (hasSpecialChars) {
    ElMessage.warning({
      message: '文件名包含中文或特殊字符，系统会自动处理，但建议使用英文字母、数字和下划线命名文件。',
      duration: 5000
    });
  }
};

// 视频加载完成事件
const onVideoLoaded = () => {
  if (videoPlayer.value) {
    duration.value = videoPlayer.value.duration;
  }
};

// 提取关键帧
const extractKeyframes = async () => {
  if (!videoFile.value) {
    ElMessage.warning('请先上传视频文件');
    return;
  }
  
  processing.value = true;
  showProgress.value = true;
  progress.value = 0;
  progressMessage.value = '正在准备FFmpeg...';
  progressDetails.value = '';
  processingStage.value = '';
  processingFrame.value = '';
  processingTime.value = '';
  processingSpeed.value = '';
  
  // 清除之前的关键帧
  clearKeyframes();
  
  try {
    // 如果FFmpeg尚未加载，先加载它
    if (!checkIsLoaded()) {
      progressMessage.value = '正在加载FFmpeg...';
      progress.value = 10;
      await loadFFmpeg();
    }
    
    // 开始提取关键帧
    progressMessage.value = '开始提取关键帧...';
    progress.value = 20;
    
    // 处理关键帧提取任务
    const startProcessTime = Date.now();
    
    // 执行关键帧提取
    const result = await ffmpegExtractKeyframes(videoFile.value);
    
    // 计算处理时间
    const processingTime = (Date.now() - startProcessTime) / 1000;
    
    progressMessage.value = '处理关键帧...';
    
    // 处理提取的关键帧
    processKeyframes(result.frames);
    
    progress.value = 100;
    progressMessage.value = `已提取 ${result.frames.length} 个关键帧！耗时: ${processingTime.toFixed(2)}秒`;
    
    // 重置状态
    setTimeout(() => {
      processing.value = false;
      showProgress.value = false;
    }, 1000);
  } catch (error) {
    console.error('FFmpeg错误:', error);
    
    // 显示错误消息
    let errorMsg = '处理关键帧时出错';
    
    if (typeof error === 'string') {
      errorMsg = `错误：${error}`;
    } else if (error && error.message) {
      errorMsg = `错误：${error.message}`;
      
      // 根据特定错误类型提供更有帮助的信息
      if (error.message.includes('加载FFmpeg失败')) {
        errorMsg += '\n可能是网络问题导致无法加载FFmpeg，请检查网络连接并刷新页面重试。';
      } else if (error.message.includes('读取视频文件失败') || error.message.includes('Check if the path exists')) {
        errorMsg += '\n文件名可能包含特殊字符，请尝试使用英文名称的视频文件。';
      } else if (error.message.includes('提取关键帧失败')) {
        errorMsg += '\n视频格式可能不支持或已损坏，请尝试其他视频文件。';
      }
    }
    
    progressMessage.value = errorMsg;
    progress.value = 0;
    processing.value = false;
    
    // 3秒后关闭进度对话框
    setTimeout(() => {
      showProgress.value = false;
    }, 3000);
  }
};

// 处理提取的关键帧
const processKeyframes = (frames) => {
  keyframes.value = frames.map((frame) => {
    const blob = new Blob([frame.data], { type: 'image/jpeg' });
    return {
      name: frame.name,
      blob: blob,
      url: URL.createObjectURL(blob),
      data: frame.data
    };
  });
};

// 清除关键帧
const clearKeyframes = () => {
  // 释放URL资源
  keyframes.value.forEach(frame => {
    if (frame.url) {
      URL.revokeObjectURL(frame.url);
    }
  });
  keyframes.value = [];
};

// 预览关键帧
const previewFrame = (frame) => {
  selectedFrame.value = frame;
  selectedFrameIndex.value = keyframes.value.findIndex(f => f.name === frame.name);
  showFramePreview.value = true;
};

// 下载单个关键帧
const downloadFrame = (frame, index) => {
  const a = document.createElement('a');
  a.href = frame.url;
  a.download = `keyframe_${index + 1}.jpg`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

// 下载所有关键帧
const downloadAllFrames = async () => {
  if (keyframes.value.length === 0) return;
  
  const zip = new JSZip();
  const folder = zip.folder('keyframes');
  
  // 添加所有关键帧到zip文件
  keyframes.value.forEach((frame, index) => {
    folder.file(`keyframe_${index + 1}.jpg`, frame.data);
  });
  
  // 生成zip文件
  const content = await zip.generateAsync({ type: 'blob' });
  
  // 下载zip文件
  const a = document.createElement('a');
  a.href = URL.createObjectURL(content);
  a.download = 'keyframes.zip';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(a.href);
  document.body.removeChild(a);
};

// 重置视频
const resetVideo = () => {
  if (videoUrl.value) {
    URL.revokeObjectURL(videoUrl.value);
  }
  videoUrl.value = '';
  videoFile.value = null;
  duration.value = 0;
  clearKeyframes();
};

// 生命周期钩子
onMounted(() => {
  console.log('KeyframeExtractor组件挂载');
  
  // 设置FFmpeg事件监听
  on('loading', (data) => {
    progressMessage.value = data.message;
  });
  
  on('loaded', (data) => {
    progressMessage.value = data.message;
  });
  
  on('error', (data) => {
    progressMessage.value = data.message;
    console.error('FFmpeg错误:', data);
  });
  
  on('progress', (data) => {
    progress.value = data.percent;
  });
  
  on('status', (data) => {
    progressMessage.value = data.message;
    processingStage.value = data.message;
  });
  
  on('progress-info', (data) => {
    processingStage.value = data.stage;
    progressDetails.value = data.details;
  });
  
  on('progress-detail', (data) => {
    processingStage.value = data.stage;
    processingFrame.value = data.frame;
    processingTime.value = data.time;
    processingSpeed.value = data.speed;
    progressDetails.value = data.details;
  });
  
  on('complete', (data) => {
    if (data.type === 'keyframes') {
      progressMessage.value = `关键帧提取完成：共 ${data.count} 帧`;
    }
  });
  
  // 预加载FFmpeg
  setTimeout(async () => {
    console.log('开始预加载FFmpeg...');
    try {
      await loadFFmpeg();
      console.log('FFmpeg预加载完成');
    } catch (error) {
      console.error('FFmpeg预加载错误:', error);
      // 不显示错误，等用户操作时再处理
    }
  }, 1000);
});

onUnmounted(() => {
  // 清理资源
  if (videoUrl.value) {
    URL.revokeObjectURL(videoUrl.value);
  }
  clearKeyframes();
});
</script>

<style scoped>
.keyframe-extractor {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.upload-container {
  display: flex;
  justify-content: center;
  padding: 30px;
  border: 1px dashed #ccc;
  border-radius: 8px;
}

.video-editor {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.video-preview {
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.video-preview video {
  width: 100%;
  display: block;
}

.video-info {
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 8px;
}

.info-row {
  display: flex;
  margin-bottom: 8px;
}

.info-label {
  font-weight: bold;
  width: 80px;
}

.action-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 10px;
}

.keyframes-preview {
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 8px;
  margin-top: 10px;
}

.keyframes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 15px;
  margin: 15px 0;
}

.keyframe-item {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s;
}

.keyframe-item:hover {
  transform: scale(1.05);
}

.keyframe-item img {
  width: 100%;
  height: 100px;
  object-fit: cover;
  display: block;
}

.keyframe-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 5px;
  font-size: 12px;
  text-align: center;
}

.keyframes-actions {
  display: flex;
  justify-content: center;
  margin-top: 15px;
}

.frame-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.preview-image {
  max-width: 100%;
  max-height: 500px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.frame-actions {
  margin-top: 15px;
}

.progress-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.progress-message {
  text-align: center;
  color: #606266;
  font-weight: bold;
}

.progress-details {
  background-color: #f8f8f8;
  border-radius: 8px;
  padding: 12px;
  margin-top: 10px;
}

.progress-stage {
  margin-bottom: 10px;
  display: flex;
  align-items: center;
}

.stage-label {
  font-weight: bold;
  margin-right: 8px;
  color: #606266;
}

.stage-value {
  color: #409eff;
  font-weight: bold;
}

.progress-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
  margin-bottom: 10px;
}

.metric {
  display: flex;
  flex-direction: column;
}

.metric-label {
  font-size: 12px;
  color: #909399;
}

.metric-value {
  font-family: monospace;
  font-size: 14px;
  font-weight: bold;
}

.details-text {
  font-size: 12px;
  color: #606266;
  font-style: italic;
}
</style> 