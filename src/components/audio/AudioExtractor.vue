<template>
  <div class="audio-extractor">
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
        <div class="info-row">
          <span class="info-label">大小:</span>
          <span class="info-value">{{ videoFile ? formatFileSize(videoFile.size) : '未知' }}</span>
        </div>
      </div>

      <div class="audio-format">
        <h3>音频格式设置</h3>
        <div class="format-options">
          <el-radio-group v-model="audioFormat">
            <el-radio label="mp3">MP3</el-radio>
            <el-radio label="wav">WAV</el-radio>
            <el-radio label="aac">AAC</el-radio>
          </el-radio-group>
        </div>
      </div>

      <div class="action-buttons">
        <el-button type="primary" @click="extractAudio" :loading="processing">
          提取音频
        </el-button>
        <el-button @click="resetVideo">重置</el-button>
      </div>

      <div class="audio-preview" v-if="audioUrl">
        <h3>提取的音频</h3>
        <audio controls :src="audioUrl"></audio>
        <div class="download-button">
          <el-button type="success" @click="downloadAudio">
            下载音频
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
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { Upload as IUpload } from '@element-plus/icons-vue';
import { getFFmpeg, fetchFile, loadFFmpeg, extractAudio as ffmpegExtractAudio, checkIsLoaded, on } from '@/utils/ffmpeg-direct';
import { formatTime, getFilenameWithoutExtension, downloadFile, formatFileSize } from '@/utils/helpers';
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
const audioFormat = ref('mp3');
const audioUrl = ref('');
const audioData = ref(null);
const audioFileName = ref('');

// 计算属性
const progressFormat = (percentage) => {
  return percentage === 100 ? '完成' : `${percentage}%`;
};

// 文件上传处理
const handleFileChange = (file) => {
  videoFile.value = file.raw;
  videoUrl.value = URL.createObjectURL(file.raw);
  // 清除之前的音频
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value);
    audioUrl.value = '';
    audioData.value = null;
  }
  
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

// 提取音频
const extractAudio = async () => {
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
  
  // 清除之前的音频
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value);
    audioUrl.value = '';
    audioData.value = null;
  }
  
  // 设置输出文件名
  const baseFileName = getFilenameWithoutExtension(videoFile.value.name);
  audioFileName.value = `${baseFileName}.${audioFormat.value}`;
  
  try {
    // 如果FFmpeg尚未加载，先加载它
    if (!checkIsLoaded()) {
      progressMessage.value = '正在加载FFmpeg...';
      progress.value = 10;
      await loadFFmpeg();
    }
    
    // 开始提取音频
    progressMessage.value = '开始提取音频...';
    progress.value = 20;
    
    // 处理音频提取任务
    const startProcessTime = Date.now();
    
    // 执行音频提取
    const result = await ffmpegExtractAudio(videoFile.value, audioFormat.value);
    
    // 计算处理时间
    const processingTime = (Date.now() - startProcessTime) / 1000;
    
    // 保存音频数据
    audioData.value = result.data;
    
    // 创建音频URL
    const blob = new Blob([result.data], { type: `audio/${audioFormat.value}` });
    audioUrl.value = URL.createObjectURL(blob);
    
    progress.value = 100;
    progressMessage.value = `提取完成！耗时: ${processingTime.toFixed(2)}秒`;
    
    // 重置状态
    setTimeout(() => {
      processing.value = false;
      showProgress.value = false;
    }, 1000);
    
  } catch (error) {
    console.error('FFmpeg错误:', error);
    
    // 显示错误消息
    let errorMsg = '处理音频时出错';
    
    if (typeof error === 'string') {
      errorMsg = `错误：${error}`;
    } else if (error && error.message) {
      errorMsg = `错误：${error.message}`;
      
      // 根据特定错误类型提供更有帮助的信息
      if (error.message.includes('加载FFmpeg失败')) {
        errorMsg += '\n可能是网络问题导致无法加载FFmpeg，请检查网络连接并刷新页面重试。';
      } else if (error.message.includes('读取视频文件失败') || error.message.includes('Check if the path exists')) {
        errorMsg += '\n文件名可能包含特殊字符，请尝试使用英文名称的视频文件。';
      } else if (error.message.includes('提取音频失败')) {
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

// 下载音频
const downloadAudio = () => {
  if (audioData.value && audioFileName.value) {
    downloadFile(audioData.value, audioFileName.value, `audio/${audioFormat.value}`);
  }
};

// 重置视频
const resetVideo = () => {
  if (videoUrl.value) {
    URL.revokeObjectURL(videoUrl.value);
  }
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value);
  }
  videoUrl.value = '';
  videoFile.value = null;
  duration.value = 0;
  audioUrl.value = '';
  audioData.value = null;
};

// 生命周期钩子
onMounted(() => {
  console.log('AudioExtractor组件挂载');
  
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
    if (data.type === 'audio') {
      progressMessage.value = `音频提取完成：${data.fileName}`;
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
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value);
  }
});
</script>

<style scoped>
.audio-extractor {
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

.audio-format {
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 8px;
}

.format-options {
  margin-top: 10px;
}

.action-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 10px;
}

.audio-preview {
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 8px;
  margin-top: 10px;
}

.audio-preview audio {
  width: 100%;
  margin: 10px 0;
}

.download-button {
  display: flex;
  justify-content: center;
  margin-top: 10px;
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