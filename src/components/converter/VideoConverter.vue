<template>
  <div class="video-converter">
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
        <h3>原始视频信息</h3>
        <div class="info-row">
          <span class="info-label">文件名:</span>
          <span class="info-value">{{ videoFile?.name || '未知' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">大小:</span>
          <span class="info-value">{{ videoFile ? formatFileSize(videoFile.size) : '未知' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">时长:</span>
          <span class="info-value">{{ formatTime(duration) }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">分辨率:</span>
          <span class="info-value">{{ videoWidth }} x {{ videoHeight }}</span>
        </div>
      </div>

      <div class="conversion-settings">
        <h3>转换设置</h3>
        
        <div class="setting-row">
          <span class="setting-label">输出格式:</span>
          <el-select v-model="outputFormat" placeholder="选择输出格式">
            <el-option label="MP4 (H.264)" value="mp4" />
            <el-option label="MKV (H.264)" value="mkv" />
            <el-option label="MP4 (H.265/HEVC)" value="mp4-hevc" />
            <el-option label="WebM (VP9)" value="webm" />
          </el-select>
        </div>
        
        <div class="setting-row">
          <span class="setting-label">分辨率:</span>
          <el-select v-model="resolution" placeholder="选择分辨率">
            <el-option label="原始分辨率" value="original" />
            <el-option label="4K (3840x2160)" value="3840x2160" />
            <el-option label="1080p (1920x1080)" value="1920x1080" />
            <el-option label="720p (1280x720)" value="1280x720" />
            <el-option label="480p (854x480)" value="854x480" />
            <el-option label="360p (640x360)" value="640x360" />
            <el-option label="自定义" value="custom" />
          </el-select>
          <div class="quick-select-buttons">
            <el-button size="small" type="info" @click="resolution = 'original'">原始</el-button>
            <el-button size="small" type="info" @click="resolution = '1920x1080'">1080p</el-button>
            <el-button size="small" type="info" @click="resolution = '1280x720'">720p</el-button>
            <el-button size="small" type="info" @click="resolution = '640x360'">360p</el-button>
          </div>
        </div>
        
        <div class="setting-row" v-if="resolution === 'custom'">
          <span class="setting-label">自定义分辨率:</span>
          <div class="custom-resolution">
            <el-input-number v-model="customWidth" :min="16" :step="16" placeholder="宽度" />
            <span>x</span>
            <el-input-number v-model="customHeight" :min="16" :step="16" placeholder="高度" />
          </div>
        </div>
        
        <div class="setting-row">
          <span class="setting-label">比特率:</span>
          <el-select v-model="bitrate" placeholder="选择比特率">
            <el-option label="自动 (推荐)" value="auto" />
            <el-option label="超高质量 (8Mbps)" value="8M" />
            <el-option label="高质量 (5Mbps)" value="5M" />
            <el-option label="中等质量 (3Mbps)" value="3M" />
            <el-option label="低质量 (1Mbps)" value="1M" />
            <el-option label="自定义" value="custom" />
          </el-select>
          <div class="quick-select-buttons">
            <el-button size="small" type="info" @click="bitrate = 'auto'">自动</el-button>
            <el-button size="small" type="info" @click="bitrate = '8M'">超高</el-button>
            <el-button size="small" type="info" @click="bitrate = '5M'">高</el-button>
            <el-button size="small" type="info" @click="bitrate = '3M'">中</el-button>
            <el-button size="small" type="info" @click="bitrate = '1M'">低</el-button>
          </div>
        </div>
        
        <div class="setting-row" v-if="bitrate === 'custom'">
          <span class="setting-label">自定义比特率:</span>
          <div class="custom-bitrate">
            <el-input-number v-model="customBitrate" :min="0.1" :step="0.1" />
            <el-select v-model="customBitrateUnit">
              <el-option label="Kbps" value="K" />
              <el-option label="Mbps" value="M" />
            </el-select>
          </div>
        </div>

        <div class="setting-row">
          <span class="setting-label">快捷预设:</span>
          <div class="quick-select-buttons">
            <el-button size="small" type="primary" @click="applyPreset('高清')">高清 1080p</el-button>
            <el-button size="small" type="primary" @click="applyPreset('标清')">标清 720p</el-button>
            <el-button size="small" type="primary" @click="applyPreset('流畅')">流畅 480p</el-button>
            <el-button size="small" type="primary" @click="applyPreset('压缩')">最小体积</el-button>
          </div>
        </div>
      </div>

      <div class="action-buttons">
        <el-button type="primary" @click="convertVideo" :loading="processing">
          转换视频
        </el-button>
        <el-button @click="resetVideo">重置</el-button>
      </div>

      <div class="converted-video" v-if="convertedVideoUrl">
        <h3>转换后的视频</h3>
        <video controls :src="convertedVideoUrl"></video>
        
        <div class="conversion-stats" v-if="conversionStats">
          <h4>转换统计</h4>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-label">处理时间</div>
              <div class="stat-value">{{ conversionStats.processingTime.toFixed(2) }}秒</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">原始大小</div>
              <div class="stat-value">{{ formatFileSize(conversionStats.inputSize) }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">转换后大小</div>
              <div class="stat-value">{{ formatFileSize(conversionStats.outputSize) }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">压缩比</div>
              <div class="stat-value" :class="{'compression-good': compressionGood, 'compression-bad': !compressionGood}">
                {{ compressionRatioText }}
              </div>
            </div>
          </div>
        </div>
        
        <div class="download-button">
          <el-button type="success" @click="downloadConvertedVideo">
            下载转换后的视频
          </el-button>
        </div>
      </div>
    </div>

    <el-dialog v-model="showProgress" title="处理中" :close-on-click-modal="false" width="500px">
      <div class="progress-container">
        <el-progress :percentage="progress" :format="progressFormat" />
        <div class="progress-message">{{ progressMessage }}</div>
        
        <div class="progress-details" v-if="progressDetails || processingCommand">
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
          
          <div class="command-info" v-if="processingCommand">
            <div class="command-label">FFmpeg命令:</div>
            <div class="command-value">{{ processingCommand }}</div>
          </div>
          
          <div class="details-text">{{ progressDetails }}</div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Upload as IUpload } from '@element-plus/icons-vue';
import { getFFmpeg, fetchFile, loadFFmpeg, convertVideo as ffmpegConvertVideo, checkIsLoaded, on } from '@/utils/ffmpeg-direct';
import { formatTime, getFilenameWithoutExtension, downloadFile, formatFileSize } from '@/utils/helpers';
import { ElMessage } from 'element-plus';

// 状态变量
const videoUrl = ref('');
const videoFile = ref(null);
const videoPlayer = ref(null);
const duration = ref(0);
const videoWidth = ref(0);
const videoHeight = ref(0);
const processing = ref(false);
const showProgress = ref(false);
const progress = ref(0);
const progressMessage = ref('');
const progressDetails = ref('');
const processingStage = ref('');
const processingFrame = ref('');
const processingTime = ref('');
const processingSpeed = ref('');
const processingCommand = ref('');

// 转换设置
const outputFormat = ref('mp4');
const resolution = ref('original');
const customWidth = ref(1280);
const customHeight = ref(720);
const bitrate = ref('auto');
const customBitrate = ref(3);
const customBitrateUnit = ref('M');

// 转换后的视频
const convertedVideoUrl = ref('');
const convertedVideoData = ref(null);
const convertedFileName = ref('');
const conversionStats = ref(null);

// 计算属性
const progressFormat = (percentage) => {
  return percentage === 100 ? '完成' : `${percentage}%`;
};

// 压缩比文本
const compressionRatioText = computed(() => {
  if (!conversionStats.value) return '';
  const ratio = conversionStats.value.compressionRatio;
  return ratio < 1 
    ? `减小 ${((1 - ratio) * 100).toFixed(0)}%` 
    : `增加 ${((ratio - 1) * 100).toFixed(0)}%`;
});

// 压缩是否有效
const compressionGood = computed(() => {
  if (!conversionStats.value) return true;
  return conversionStats.value.compressionRatio < 1;
});

// 获取实际使用的编码器
const getCodec = computed(() => {
  switch (outputFormat.value) {
    case 'mp4':
      return 'libx264';
    case 'mkv':
      return 'libx264';
    case 'mp4-hevc':
      return 'libx265';
    case 'webm':
      return 'libvpx-vp9';
    default:
      return 'libx264';
  }
});

// 获取输出文件扩展名
const getOutputExtension = computed(() => {
  switch (outputFormat.value) {
    case 'mp4':
      return 'mp4';
    case 'mkv':
      return 'mkv';
    case 'mp4-hevc':
      return 'mp4';
    case 'webm':
      return 'webm';
    default:
      return 'mp4';
  }
});

// 获取实际使用的分辨率
const getResolutionValue = computed(() => {
  if (resolution.value === 'original') {
    return '';
  } else if (resolution.value === 'custom') {
    return `${customWidth.value}x${customHeight.value}`;
  } else {
    return resolution.value;
  }
});

// 获取实际使用的比特率
const getBitrateValue = computed(() => {
  if (bitrate.value === 'auto') {
    return '';
  } else if (bitrate.value === 'custom') {
    return `${customBitrate.value}${customBitrateUnit.value}`;
  } else {
    return bitrate.value;
  }
});

// 文件上传处理
const handleFileChange = (file) => {
  videoFile.value = file.raw;
  videoUrl.value = URL.createObjectURL(file.raw);
  
  // 清除之前转换的视频
  if (convertedVideoUrl.value) {
    URL.revokeObjectURL(convertedVideoUrl.value);
    convertedVideoUrl.value = '';
    convertedVideoData.value = null;
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
    videoWidth.value = videoPlayer.value.videoWidth;
    videoHeight.value = videoPlayer.value.videoHeight;
    
    // 设置自定义分辨率的默认值为原始分辨率
    customWidth.value = videoWidth.value;
    customHeight.value = videoHeight.value;
  }
};

// 转换视频
const convertVideo = async () => {
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
  processingCommand.value = '';
  
  // 清除之前转换的视频
  if (convertedVideoUrl.value) {
    URL.revokeObjectURL(convertedVideoUrl.value);
    convertedVideoUrl.value = '';
    convertedVideoData.value = null;
  }
  
  // 设置输出文件名
  const baseFileName = getFilenameWithoutExtension(videoFile.value.name);
  const extension = getOutputExtension.value;
  convertedFileName.value = `${baseFileName}_converted.${extension}`;
  
  // 设置转换选项
  const options = {
    codec: getCodec.value,
    outputFormat: extension
  };
  
  // 添加分辨率选项
  if (getResolutionValue.value) {
    options.resolution = getResolutionValue.value;
  }
  
  // 添加比特率选项
  if (getBitrateValue.value) {
    options.bitrate = getBitrateValue.value;
  }
  
  try {
    // 如果FFmpeg尚未加载，先加载它
    if (!checkIsLoaded()) {
      progressMessage.value = '正在加载FFmpeg...';
      progress.value = 10;
      await loadFFmpeg();
    }
    
    // 开始转换视频
    progressMessage.value = '开始转换视频...';
    progress.value = 20;
    
    // 处理视频转换任务
    const startProcessTime = Date.now();
    
    // 执行视频转换
    const result = await ffmpegConvertVideo(videoFile.value, options);
    
    // 计算处理时间
    const processingTime = (Date.now() - startProcessTime) / 1000;
    
    // 保存转换后的视频数据
    convertedVideoData.value = result.data;
    
    // 创建视频URL
    const blob = new Blob([result.data], { type: `video/${extension}` });
    convertedVideoUrl.value = URL.createObjectURL(blob);
    
    // 保存转换统计信息
    conversionStats.value = {
      processingTime: processingTime,
      inputSize: result.inputSize,
      outputSize: result.outputSize,
      compressionRatio: result.outputSize / result.inputSize
    };
    
    progress.value = 100;
    progressMessage.value = `转换完成！耗时: ${processingTime.toFixed(2)}秒`;
    
    // 重置状态
    setTimeout(() => {
      processing.value = false;
      showProgress.value = false;
    }, 1000);
    
  } catch (error) {
    console.error('FFmpeg错误:', error);
    
    // 显示错误消息
    let errorMsg = '转换视频时出错';
    
    if (typeof error === 'string') {
      errorMsg = `错误：${error}`;
    } else if (error && error.message) {
      errorMsg = `错误：${error.message}`;
      
      // 根据特定错误类型提供更有帮助的信息
      if (error.message.includes('加载FFmpeg失败')) {
        errorMsg += '\n可能是网络问题导致无法加载FFmpeg，请检查网络连接并刷新页面重试。';
      } else if (error.message.includes('读取视频文件失败') || error.message.includes('Check if the path exists')) {
        errorMsg += '\n文件名可能包含特殊字符，请尝试使用英文名称的视频文件。';
      } else if (error.message.includes('转换视频失败')) {
        errorMsg += '\n视频格式可能不支持或当前配置不兼容，请尝试其他设置或视频文件。';
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

// 下载转换后的视频
const downloadConvertedVideo = () => {
  if (convertedVideoData.value && convertedFileName.value) {
    const extension = getOutputExtension.value;
    downloadFile(convertedVideoData.value, convertedFileName.value, `video/${extension}`);
  }
};

// 重置视频
const resetVideo = () => {
  if (videoUrl.value) {
    URL.revokeObjectURL(videoUrl.value);
  }
  if (convertedVideoUrl.value) {
    URL.revokeObjectURL(convertedVideoUrl.value);
  }
  videoUrl.value = '';
  videoFile.value = null;
  duration.value = 0;
  videoWidth.value = 0;
  videoHeight.value = 0;
  convertedVideoUrl.value = '';
  convertedVideoData.value = null;
  
  // 重置转换设置
  outputFormat.value = 'mp4';
  resolution.value = 'original';
  customWidth.value = 1280;
  customHeight.value = 720;
  bitrate.value = 'auto';
  customBitrate.value = 3;
  customBitrateUnit.value = 'M';
};

// 应用预设配置
const applyPreset = (presetName) => {
  switch (presetName) {
    case '高清':
      resolution.value = '1920x1080';
      bitrate.value = '5M';
      outputFormat.value = 'mp4';
      break;
    case '标清':
      resolution.value = '1280x720';
      bitrate.value = '3M';
      outputFormat.value = 'mp4';
      break;
    case '流畅':
      resolution.value = '854x480';
      bitrate.value = '1M';
      outputFormat.value = 'mp4';
      break;
    case '压缩':
      resolution.value = '640x360';
      bitrate.value = '1M';
      outputFormat.value = 'mp4-hevc'; // 使用H.265/HEVC获得更好的压缩率
      break;
    default:
      break;
  }
};

// 生命周期钩子
onMounted(() => {
  console.log('VideoConverter组件挂载');
  
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
  
  on('command', (data) => {
    processingCommand.value = data.command;
  });
  
  on('complete', (data) => {
    if (data.type === 'convert') {
      progressMessage.value = `视频转换完成：${data.fileName}`;
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
  if (convertedVideoUrl.value) {
    URL.revokeObjectURL(convertedVideoUrl.value);
  }
});
</script>

<style scoped>
.video-converter {
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
  width: 100px;
}

.conversion-settings {
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 8px;
}

.setting-row {
  display: flex;
  margin-bottom: 15px;
  align-items: center;
}

.setting-label {
  width: 100px;
  font-weight: bold;
}

.custom-resolution,
.custom-bitrate {
  display: flex;
  align-items: center;
  gap: 10px;
}

.action-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 10px;
}

.converted-video {
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 8px;
  margin-top: 10px;
}

.converted-video video {
  width: 100%;
  margin: 10px 0;
  border-radius: 8px;
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

.command-info {
  margin-bottom: 10px;
  padding: 8px;
  background-color: #f0f0f0;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
}

.command-label {
  font-weight: bold;
  margin-bottom: 4px;
  color: #606266;
}

.command-value {
  word-break: break-all;
  white-space: pre-wrap;
  color: #303133;
  background-color: #303133;
  color: #ffffff;
  padding: 6px;
  border-radius: 4px;
  overflow-x: auto;
}

.details-text {
  font-size: 12px;
  color: #606266;
  font-style: italic;
}

.conversion-stats {
  margin: 15px 0;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.conversion-stats h4 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 16px;
  color: #409eff;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.stat-label {
  font-size: 12px;
  color: #909399;
}

.stat-value {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.compression-good {
  color: #67c23a;
}

.compression-bad {
  color: #f56c6c;
}

.quick-select-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.quick-select-buttons .el-button {
  font-size: 12px;
  padding: 6px 10px;
}
</style> 