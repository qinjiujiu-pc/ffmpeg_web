<template>
  <div class="video-trimmer">
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
          @timeupdate="onTimeUpdate"
          @error="onVideoError"
        ></video>
      </div>

      <div class="trim-controls">
        <div class="time-range">
          <span>开始时间: </span>
          <el-input-number 
            v-model="startTimeSeconds" 
            :min="0" 
            :max="maxStartTime" 
            :step="0.1" 
            @change="updateTrimRange"
          />
          <span class="time-display">{{ formatTime(startTimeSeconds) }}</span>
          <div class="time-shortcuts">
            <el-button size="small" @click="adjustStartTime(-10)">-10秒</el-button>
            <el-button size="small" @click="adjustStartTime(-5)">-5秒</el-button>
            <el-button size="small" @click="adjustStartTime(-1)">-1秒</el-button>
            <el-button size="small" @click="adjustStartTime(1)">+1秒</el-button>
            <el-button size="small" @click="adjustStartTime(5)">+5秒</el-button>
            <el-button size="small" @click="adjustStartTime(10)">+10秒</el-button>
          </div>
        </div>
        
        <div class="time-range">
          <span>结束时间: </span>
          <el-input-number 
            v-model="endTimeSeconds" 
            :min="minEndTime" 
            :max="duration" 
            :step="0.1" 
            @change="updateTrimRange"
          />
          <span class="time-display">{{ formatTime(endTimeSeconds) }}</span>
          <div class="time-shortcuts">
            <el-button size="small" @click="adjustEndTime(-10)">-10秒</el-button>
            <el-button size="small" @click="adjustEndTime(-5)">-5秒</el-button>
            <el-button size="small" @click="adjustEndTime(-1)">-1秒</el-button>
            <el-button size="small" @click="adjustEndTime(1)">+1秒</el-button>
            <el-button size="small" @click="adjustEndTime(5)">+5秒</el-button>
            <el-button size="small" @click="adjustEndTime(10)">+10秒</el-button>
          </div>
        </div>

        <div class="time-range">
          <span>剪辑时长: </span>
          <span class="time-display">{{ formatTime(endTimeSeconds - startTimeSeconds) }}</span>
          <div class="time-shortcuts">
            <el-button size="small" type="primary" @click="setTrimDuration(5)">5秒</el-button>
            <el-button size="small" type="primary" @click="setTrimDuration(10)">10秒</el-button>
            <el-button size="small" type="primary" @click="setTrimDuration(30)">30秒</el-button>
            <el-button size="small" type="primary" @click="setTrimDuration(60)">1分钟</el-button>
            <el-button size="small" type="primary" @click="setTrimDuration(300)">5分钟</el-button>
          </div>
        </div>

        <div class="quality-settings">
          <h4>输出质量设置</h4>
          <div class="quality-options">
            <el-radio-group v-model="qualityOption">
              <el-radio label="copy">原始质量 (速度最快)</el-radio>
              <el-radio label="high">高质量 (适中压缩)</el-radio>
              <el-radio label="medium">中等质量 (更小体积)</el-radio>
              <el-radio label="low">低质量 (最小体积)</el-radio>
            </el-radio-group>
            <div class="quality-info">
              <el-tooltip 
                content="原始质量：直接复制视频流，不重新编码，速度最快，但不能修改分辨率和帧率。
                        高质量：高比特率编码，适合保存高质量视频。
                        中等质量：平衡文件大小和质量的折中选项。
                        低质量：生成更小的文件，适合分享和上传。" 
                placement="right"
              >
                <el-icon><i-info-filled /></el-icon>
              </el-tooltip>
            </div>
          </div>
          
          <div class="advanced-options" v-if="qualityOption !== 'copy'">
            <div class="option-row">
              <span class="option-label">分辨率:</span>
              <el-select v-model="resolutionOption" placeholder="选择分辨率">
                <el-option label="原始分辨率" value="original" />
                <el-option label="1080p (1920x1080)" value="1920x1080" />
                <el-option label="720p (1280x720)" value="1280x720" />
                <el-option label="480p (854x480)" value="854x480" />
                <el-option label="360p (640x360)" value="640x360" />
              </el-select>
            </div>
          </div>
        </div>
      </div>

      <div class="timeline">
        <div class="timeline-track" ref="timelineTrack">
          <div 
            class="timeline-progress" 
            :style="{ width: `${(currentTime / duration) * 100}%` }"
          ></div>
          <div 
            class="trim-range" 
            :style="{ 
              left: `${(startTimeSeconds / duration) * 100}%`,
              width: `${((endTimeSeconds - startTimeSeconds) / duration) * 100}%`
            }"
          ></div>
          <div 
            class="trim-handle trim-start" 
            :style="{ left: `${(startTimeSeconds / duration) * 100}%` }"
            @mousedown="startDragging('start', $event)"
          ></div>
          <div 
            class="trim-handle trim-end" 
            :style="{ left: `${(endTimeSeconds / duration) * 100}%` }"
            @mousedown="startDragging('end', $event)"
          ></div>
        </div>
      </div>

      <div class="action-buttons">
        <el-button type="primary" @click="trimVideo" :loading="processing">
          裁剪视频
        </el-button>
        <el-button @click="resetVideo">重置</el-button>
      </div>
    </div>

    <div class="trim-stats" v-if="trimStats">
      <h3>裁剪结果</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-label">开始时间</div>
          <div class="stat-value">{{ trimStats.startTime }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">结束时间</div>
          <div class="stat-value">{{ trimStats.endTime }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">裁剪时长</div>
          <div class="stat-value">{{ trimStats.duration.toFixed(2) }}秒</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">处理时间</div>
          <div class="stat-value">{{ trimStats.processingTime.toFixed(2) }}秒</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">原始大小</div>
          <div class="stat-value">{{ formatFileSize(trimStats.inputSize) }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">裁剪后大小</div>
          <div class="stat-value">{{ formatFileSize(trimStats.outputSize) }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">压缩率</div>
          <div class="stat-value" :class="{ 'compression-good': compressionRatio < 1 }">
            {{ (compressionRatio < 1 ? '减小 ' + ((1 - compressionRatio) * 100).toFixed(1) : '增加 ' + ((compressionRatio - 1) * 100).toFixed(1)) + '%' }}
          </div>
        </div>
        <div class="stat-item">
          <div class="stat-label">输出质量</div>
          <div class="stat-value">{{ getQualityText(trimStats.quality) }}</div>
        </div>
        <div class="stat-item" v-if="trimStats.quality !== 'copy' && trimStats.resolution !== 'original'">
          <div class="stat-label">输出分辨率</div>
          <div class="stat-value">{{ trimStats.resolution }}</div>
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
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { Upload as IUpload, InfoFilled } from '@element-plus/icons-vue';
import { getFFmpeg, fetchFile, loadFFmpeg, trimVideo as ffmpegTrimVideo, checkIsLoaded, on } from '@/utils/ffmpeg-direct';
import { formatTime, getFilenameWithoutExtension, downloadFile, formatFileSize } from '@/utils/helpers';
import { ElMessage } from 'element-plus';

// 状态变量
const videoUrl = ref('');
const videoFile = ref(null);
const videoPlayer = ref(null);
const timelineTrack = ref(null);
const duration = ref(0);
const currentTime = ref(0);
const startTimeSeconds = ref(0);
const endTimeSeconds = ref(0.1); // 设置一个默认的非零值
const dragging = ref(null);
const processing = ref(false);
const showProgress = ref(false);
const progress = ref(0);
const progressMessage = ref('');
const progressDetails = ref('');
const processingStage = ref('');
const processingFrame = ref('');
const processingTime = ref('');
const processingSpeed = ref('');
const trimStats = ref(null);
const videoError = ref(null);
const qualityOption = ref('copy'); // 默认使用原始质量
const resolutionOption = ref('original'); // 默认使用原始分辨率

// 计算属性 - 安全的最大开始时间
const maxStartTime = computed(() => {
  // 确保duration至少为0.1秒，并且endTimeSeconds比duration小
  const safeDuration = Math.max(0.1, duration.value);
  const safeEndTime = Math.min(safeDuration, endTimeSeconds.value);
  return Math.max(0, Math.min(safeDuration - 0.1, safeEndTime - 0.1));
});

// 计算属性 - 安全的最小结束时间
const minEndTime = computed(() => {
  return Math.max(0.1, startTimeSeconds.value + 0.1);
});

// 确保当duration更新时，endTimeSeconds也相应更新
watch(duration, (newDuration) => {
  if (newDuration > 0) {
    // 如果duration有效，确保endTimeSeconds不超过duration
    endTimeSeconds.value = Math.min(newDuration, Math.max(0.1, endTimeSeconds.value));
    // 确保startTimeSeconds不超过endTimeSeconds - 0.1
    startTimeSeconds.value = Math.min(startTimeSeconds.value, endTimeSeconds.value - 0.1);
  } else {
    // 如果duration无效，设置安全默认值
    duration.value = 0.1;
    endTimeSeconds.value = 0.1;
    startTimeSeconds.value = 0;
  }
}, { immediate: true });

// 监听startTimeSeconds的变化，确保与endTimeSeconds保持安全关系
watch(startTimeSeconds, (newStartTime) => {
  if (newStartTime >= endTimeSeconds.value) {
    endTimeSeconds.value = newStartTime + 0.1;
    if (endTimeSeconds.value > duration.value) {
      endTimeSeconds.value = duration.value;
      startTimeSeconds.value = Math.max(0, endTimeSeconds.value - 0.1);
    }
  }
}, { immediate: true });

// 监听endTimeSeconds的变化，确保与startTimeSeconds保持安全关系
watch(endTimeSeconds, (newEndTime) => {
  if (newEndTime <= startTimeSeconds.value) {
    startTimeSeconds.value = Math.max(0, newEndTime - 0.1);
  }
  if (newEndTime > duration.value) {
    endTimeSeconds.value = duration.value;
  }
}, { immediate: true });

// 计算属性
const progressFormat = (percentage) => {
  return percentage === 100 ? '完成' : `${percentage}%`;
};

// 显示截取时长
const trimDuration = computed(() => {
  return (endTimeSeconds.value - startTimeSeconds.value).toFixed(2) + '秒';
});

// 文件上传处理
const handleFileChange = (file) => {
  videoFile.value = file.raw;
  videoUrl.value = URL.createObjectURL(file.raw);
  videoError.value = null; // 重置错误状态
  
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
    duration.value = videoPlayer.value.duration || 0.1;
    // 确保结束时间至少为开始时间 + 0.1秒
    if (duration.value <= 0.1) {
      duration.value = 0.1;
    }
    endTimeSeconds.value = duration.value;
  }
};

// 视频错误处理
const onVideoError = (e) => {
  console.error('视频加载错误:', e);
  videoError.value = e;
  
  // 提供一个最小的有效值，以避免输入控件错误
  if (duration.value <= 0) {
    duration.value = 0.1;
    endTimeSeconds.value = 0.1;
  }
};

// 视频时间更新事件
const onTimeUpdate = () => {
  if (videoPlayer.value) {
    currentTime.value = videoPlayer.value.currentTime;
  }
};

// 更新裁剪范围
const updateTrimRange = () => {
  // 确保开始时间不超过结束时间
  if (startTimeSeconds.value >= endTimeSeconds.value) {
    startTimeSeconds.value = Math.max(0, endTimeSeconds.value - 0.1);
  }
  
  // 设置视频当前播放位置为开始时间
  if (videoPlayer.value) {
    videoPlayer.value.currentTime = startTimeSeconds.value;
  }
};

// 开始拖动裁剪句柄
const startDragging = (handle, event) => {
  dragging.value = handle;
  document.addEventListener('mousemove', handleDrag);
  document.addEventListener('mouseup', stopDragging);
  event.preventDefault();
};

// 处理拖动事件
const handleDrag = (event) => {
  if (!dragging.value || !timelineTrack.value) return;
  
  const trackRect = timelineTrack.value.getBoundingClientRect();
  const position = (event.clientX - trackRect.left) / trackRect.width;
  const timePosition = position * duration.value;
  
  // 限制在有效范围内
  const clampedTime = Math.max(0, Math.min(duration.value, timePosition));
  
  if (dragging.value === 'start') {
    startTimeSeconds.value = Math.min(clampedTime, endTimeSeconds.value - 0.1);
    if (videoPlayer.value) {
      videoPlayer.value.currentTime = startTimeSeconds.value;
    }
  } else if (dragging.value === 'end') {
    endTimeSeconds.value = Math.max(clampedTime, startTimeSeconds.value + 0.1);
    if (videoPlayer.value) {
      videoPlayer.value.currentTime = endTimeSeconds.value;
    }
  }
};

// 停止拖动
const stopDragging = () => {
  dragging.value = null;
  document.removeEventListener('mousemove', handleDrag);
  document.removeEventListener('mouseup', stopDragging);
};

// 裁剪视频
const trimVideo = async () => {
  if (!videoFile.value) {
    ElMessage.warning('请先上传视频文件');
    return;
  }
  
  processing.value = true;
  showProgress.value = true;
  progress.value = 0;
  progressMessage.value = '正在准备FFmpeg...';
  
  // 设置输出文件名 - 使用时间戳和安全的文件名
  const timestamp = Date.now();
  const safeInputFileName = `input_${timestamp}.${videoFile.value.name.split('.').pop()}`;
  const safeOutputFileName = `output_${timestamp}.${videoFile.value.name.split('.').pop()}`;
  
  try {
    // 如果FFmpeg尚未加载，先加载它
    if (!checkIsLoaded()) {
      progressMessage.value = '正在加载FFmpeg...';
      progress.value = 10;
      await loadFFmpeg();
    }
    
    // 开始裁剪
    progressMessage.value = '开始裁剪视频...';
    progress.value = 20;
    
    // 处理裁剪任务
    const startProcessTime = Date.now();
    
    // 写入文件
    progressMessage.value = '准备视频文件...';
    progress.value = 30;
    getFFmpeg().FS('writeFile', safeInputFileName, await fetchFile(videoFile.value));
    
    // 准备FFmpeg命令参数
    const args = ['-i', safeInputFileName];
    
    // 添加开始时间和持续时间参数
    args.push('-ss', formatTime(startTimeSeconds.value));
    args.push('-t', (endTimeSeconds.value - startTimeSeconds.value).toFixed(3));
    
    // 根据质量选项设置编码参数
    if (qualityOption.value === 'copy') {
      // 直接复制视频流，不重新编码
      args.push('-c', 'copy');
    } else {
      // 选择H.264编码器
      args.push('-c:v', 'libx264');
      
      // 保留音频质量
      args.push('-c:a', 'aac', '-b:a', '128k');
      
      // 根据质量选项设置视频参数
      switch (qualityOption.value) {
        case 'high':
          args.push('-preset', 'slow', '-crf', '18');
          break;
        case 'medium':
          args.push('-preset', 'medium', '-crf', '23');
          break;
        case 'low':
          args.push('-preset', 'fast', '-crf', '28');
          break;
      }
      
      // 如果选择了非原始分辨率，添加分辨率参数
      if (resolutionOption.value !== 'original') {
        args.push('-s', resolutionOption.value);
      }
    }
    
    // 添加输出文件名
    args.push(safeOutputFileName);
    
    // 执行裁剪命令
    progressMessage.value = '正在裁剪视频...';
    progress.value = 50;
    await getFFmpeg().run(...args);
    
    // 读取输出文件
    progressMessage.value = '正在处理结果...';
    progress.value = 80;
    const data = getFFmpeg().FS('readFile', safeOutputFileName);
    
    // 计算处理时间
    const processingTime = (Date.now() - startProcessTime) / 1000;
    
    // 清理文件系统
    getFFmpeg().FS('unlink', safeInputFileName);
    getFFmpeg().FS('unlink', safeOutputFileName);
    
    // 保存裁剪统计信息
    progress.value = 100;
    progressMessage.value = '裁剪完成！';
    
    // 生成有意义的下载文件名
    const originalBaseName = getFilenameWithoutExtension(videoFile.value.name);
    const extension = videoFile.value.name.split('.').pop();
    const qualitySuffix = qualityOption.value !== 'copy' ? `_${qualityOption.value}` : '';
    const resolutionSuffix = (qualityOption.value !== 'copy' && resolutionOption.value !== 'original') 
      ? `_${resolutionOption.value.split('x')[1]}p` 
      : '';
    const downloadFileName = `${originalBaseName}_trimmed${qualitySuffix}${resolutionSuffix}.${extension}`;
    
    trimStats.value = {
      processingTime: processingTime,
      inputSize: videoFile.value.size,
      outputSize: data.byteLength,
      startTime: formatTime(startTimeSeconds.value),
      endTime: formatTime(endTimeSeconds.value),
      duration: endTimeSeconds.value - startTimeSeconds.value,
      quality: qualityOption.value,
      resolution: resolutionOption.value
    };
    
    // 下载处理后的视频
    downloadFile(data, downloadFileName, `video/${extension}`);
    
    // 重置状态
    setTimeout(() => {
      processing.value = false;
      showProgress.value = false;
    }, 1000);
  } catch (error) {
    console.error('FFmpeg错误:', error);
    
    // 显示错误消息，提供更具体的错误信息和建议
    let errorMsg = '处理视频时出错';
    
    if (typeof error === 'string') {
      errorMsg = `错误：${error}`;
    } else if (error && error.message) {
      errorMsg = `错误：${error.message}`;
      
      // 根据特定错误类型提供更有帮助的信息
      if (error.message.includes('加载FFmpeg失败')) {
        errorMsg += '\n可能是网络问题导致无法加载FFmpeg，请检查网络连接并刷新页面重试。';
      } else if (error.message.includes('读取视频文件失败') || error.message.includes('Check if the path exists')) {
        errorMsg += '\n文件名可能包含特殊字符，请尝试使用英文名称的视频文件。';
      } else if (error.message.includes('裁剪视频失败')) {
        errorMsg += '\n裁剪参数可能有误，请调整裁剪范围后重试。';
      }
    }
    
    progressMessage.value = errorMsg;
    progress.value = 0;
    processing.value = false;
    
    // 尝试清理文件系统中可能残留的文件
    try {
      getFFmpeg().FS('unlink', safeInputFileName);
    } catch (e) { /* 忽略清理错误 */ }
    
    try {
      getFFmpeg().FS('unlink', safeOutputFileName);
    } catch (e) { /* 忽略清理错误 */ }
    
    // 3秒后关闭进度对话框
    setTimeout(() => {
      showProgress.value = false;
    }, 3000);
  }
};

// 重置视频
const resetVideo = () => {
  videoUrl.value = '';
  videoFile.value = null;
  duration.value = 0;
  currentTime.value = 0;
  startTimeSeconds.value = 0;
  endTimeSeconds.value = 0.1;
  trimStats.value = null;
};

// 生命周期钩子
onMounted(() => {
  console.log('VideoTrimmer组件挂载');
  
  // 初始化FFmpeg
  let ffmpegInitialized = false;
  
  // 设置FFmpeg事件监听
  on('loading', (data) => {
    progressMessage.value = data.message;
  });
  
  on('loaded', (data) => {
    progressMessage.value = data.message;
    ffmpegInitialized = true;
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
    if (data.type === 'trim') {
      progressMessage.value = `视频裁剪完成：${data.fileName}`;
    }
  });
  
  // 预加载FFmpeg
  setTimeout(async () => {
    console.log('开始预加载FFmpeg...');
    try {
      await loadFFmpeg();
      console.log('FFmpeg预加载完成');
      ffmpegInitialized = true;
    } catch (error) {
      console.error('FFmpeg预加载错误:', error);
      // 只在预加载阶段显示错误消息，避免后续操作时重复显示
      if (!ffmpegInitialized) {
        ElMessage.warning({
          message: '视频处理组件初始化失败，请刷新页面重试',
          duration: 5000
        });
      }
    }
  }, 1000);
});

onUnmounted(() => {
  // 清理资源
  if (videoUrl.value) {
    URL.revokeObjectURL(videoUrl.value);
  }
  document.removeEventListener('mousemove', handleDrag);
  document.removeEventListener('mouseup', stopDragging);
});

// 调整开始时间
const adjustStartTime = (seconds) => {
  const newTime = startTimeSeconds.value + seconds;
  startTimeSeconds.value = Math.max(0, Math.min(maxStartTime.value, newTime));
  
  // 设置视频当前播放位置为开始时间
  if (videoPlayer.value) {
    videoPlayer.value.currentTime = startTimeSeconds.value;
  }
};

// 调整结束时间
const adjustEndTime = (seconds) => {
  const newTime = endTimeSeconds.value + seconds;
  endTimeSeconds.value = Math.max(minEndTime.value, Math.min(duration.value, newTime));
  
  // 设置视频当前播放位置为结束时间
  if (videoPlayer.value) {
    videoPlayer.value.currentTime = endTimeSeconds.value;
  }
};

// 设置固定时长
const setTrimDuration = (seconds) => {
  // 保持开始时间不变，设置结束时间
  const newEndTime = Math.min(duration.value, startTimeSeconds.value + seconds);
  
  // 如果超出视频总长度，则调整开始时间
  if (newEndTime >= duration.value) {
    startTimeSeconds.value = Math.max(0, duration.value - seconds);
    endTimeSeconds.value = duration.value;
  } else {
    endTimeSeconds.value = newEndTime;
  }
  
  // 设置视频当前播放位置为开始时间
  if (videoPlayer.value) {
    videoPlayer.value.currentTime = startTimeSeconds.value;
  }
};

// 计算压缩率
const compressionRatio = computed(() => {
  if (!trimStats.value) return 1;
  return trimStats.value.outputSize / trimStats.value.inputSize;
});

// 获取质量文本描述
const getQualityText = (quality) => {
  switch (quality) {
    case 'copy': return '原始质量';
    case 'high': return '高质量';
    case 'medium': return '中等质量';
    case 'low': return '低质量';
    default: return quality;
  }
};
</script>

<style scoped>
.video-trimmer {
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

.trim-controls {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 8px;
}

.time-range {
  display: flex;
  align-items: center;
  gap: 10px;
}

.time-display {
  font-family: monospace;
  font-weight: bold;
  min-width: 80px;
}

.timeline {
  position: relative;
  height: 40px;
  background-color: #f5f7fa;
  border-radius: 8px;
  padding: 10px;
}

.timeline-track {
  position: relative;
  height: 20px;
  background-color: #e4e7ed;
  border-radius: 4px;
  cursor: pointer;
}

.timeline-progress {
  position: absolute;
  height: 100%;
  background-color: #909399;
  border-radius: 4px;
}

.trim-range {
  position: absolute;
  height: 100%;
  background-color: rgba(64, 158, 255, 0.5);
  border-radius: 4px;
  pointer-events: none;
}

.trim-handle {
  position: absolute;
  top: -5px;
  width: 10px;
  height: 30px;
  background-color: #409eff;
  border-radius: 4px;
  cursor: ew-resize;
  transform: translateX(-5px);
}

.action-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 20px;
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

.trim-stats {
  margin-top: 20px;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.trim-stats h3 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 18px;
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

.time-shortcuts {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 8px;
}

.time-shortcuts .el-button {
  padding: 4px 8px;
  font-size: 12px;
}

.quality-settings {
  margin-top: 15px;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 8px;
}

.quality-settings h4 {
  margin-top: 0;
  margin-bottom: 12px;
  font-size: 16px;
  color: #303133;
}

.quality-options {
  display: flex;
  align-items: center;
  gap: 15px;
}

.quality-info {
  color: #909399;
  cursor: pointer;
}

.advanced-options {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px dashed #dcdfe6;
}

.option-row {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.option-label {
  width: 80px;
  font-weight: bold;
  color: #606266;
}

.compression-good {
  color: #67c23a;
}
</style> 