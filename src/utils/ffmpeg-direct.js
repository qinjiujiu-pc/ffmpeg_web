import FFmpeg from '@ffmpeg/ffmpeg';
const { createFFmpeg, fetchFile } = FFmpeg;

// 创建事件系统
const eventHandlers = {};

// 触发事件函数
function emitEvent(eventName, data) {
  if (eventHandlers[eventName]) {
    eventHandlers[eventName].forEach(handler => handler(data));
  }
  // 同时输出到控制台，便于调试
  console.log(`[FFmpeg事件] ${eventName}:`, data);
}

// 添加事件监听
function on(eventName, handler) {
  if (!eventHandlers[eventName]) {
    eventHandlers[eventName] = [];
  }
  eventHandlers[eventName].push(handler);
}

// 创建FFmpeg实例
const ffmpeg = createFFmpeg({
  corePath: '/ffmpeg-core.js', // 使用绝对路径从根目录加载
  log: true, // 在控制台打印日志
  logger: ({ type, message }) => {
    // 记录日志
    emitEvent('log', { type, message, timestamp: new Date().toISOString() });
    
    // 通过日志分析进度 (非常基础的进度分析，可以根据实际日志格式进行优化)
    if (message.includes('Duration')) {
      emitEvent('progress-info', { stage: '分析中', details: '检测视频时长和格式' });
    } else if (message.includes('Stream')) {
      emitEvent('progress-info', { stage: '准备中', details: '分析视频流信息' });
    } else if (message.includes('frame=')) {
      // 从日志中提取帧数和时间信息
      const frameMatch = message.match(/frame=\s*(\d+)/);
      const timeMatch = message.match(/time=\s*(\d+:\d+:\d+\.\d+)/);
      const speedMatch = message.match(/speed=\s*(\d+\.\d+x)/);
      
      if (frameMatch && timeMatch) {
        const frame = frameMatch[1];
        const time = timeMatch[1];
        const speed = speedMatch ? speedMatch[1] : '未知';
        
        emitEvent('progress-detail', { 
          stage: '处理中', 
          frame, 
          time, 
          speed,
          details: `已处理 ${frame} 帧，当前位置: ${time}, 速度: ${speed}`
        });
      }
    }
  },
  progress: (progress) => {
    // 发送进度事件
    emitEvent('progress', { ratio: progress.ratio, percent: Math.round(progress.ratio * 100) });
  }
});

// 初始化标志
let isLoaded = false;
let isLoading = false;
let loadError = null;

// 初始化FFmpeg
async function loadFFmpeg() {
  if (isLoaded) return true;
  if (isLoading) {
    // 如果正在加载，等待加载完成
    await new Promise(resolve => {
      const checkLoaded = () => {
        if (isLoaded || loadError) {
          resolve();
        } else {
          setTimeout(checkLoaded, 100);
        }
      };
      checkLoaded();
    });
    if (loadError) throw loadError;
    return isLoaded;
  }

  try {
    isLoading = true;
    loadError = null;
    emitEvent('loading', { message: '开始加载FFmpeg核心文件...' });
    console.log('开始加载FFmpeg...');
    
    await ffmpeg.load();
    
    isLoaded = true;
    isLoading = false;
    emitEvent('loaded', { message: 'FFmpeg核心文件加载成功' });
    console.log('FFmpeg加载成功');
    return true;
  } catch (error) {
    console.error('FFmpeg加载失败:', error);
    emitEvent('error', { message: `加载FFmpeg失败: ${error.message}`, details: error });
    loadError = error;
    isLoading = false;
    throw error;
  }
}

// 视频裁剪函数
async function trimVideo(inputFile, startTime, duration) {
  if (!isLoaded) {
    emitEvent('status', { message: '加载FFmpeg中...' });
    await loadFFmpeg();
  }
  
  // 使用时间戳创建安全的文件名
  const timestamp = Date.now();
  const extension = inputFile.name.split('.').pop();
  const inputFileName = `input_${timestamp}.${extension}`;
  const outputFileName = `output_${timestamp}.${extension}`;
  
  try {
    emitEvent('status', { message: `开始裁剪视频: ${inputFile.name}` });
    emitEvent('progress', { ratio: 0.05, percent: 5 });
    console.log(`开始裁剪视频: ${inputFile.name}, 开始时间: ${startTime}, 时长: ${duration}`);
    
    // 写入文件
    emitEvent('status', { message: '正在读取视频文件...' });
    emitEvent('progress', { ratio: 0.1, percent: 10 });
    ffmpeg.FS('writeFile', inputFileName, await fetchFile(inputFile));
    
    // 执行裁剪命令
    emitEvent('status', { message: '正在裁剪视频...' });
    emitEvent('progress', { ratio: 0.3, percent: 30 });
    await ffmpeg.run(
      '-i', inputFileName,
      '-ss', startTime,
      '-t', duration,
      '-c', 'copy',
      outputFileName
    );
    
    // 读取输出文件
    emitEvent('status', { message: '正在处理输出文件...' });
    emitEvent('progress', { ratio: 0.8, percent: 80 });
    const data = ffmpeg.FS('readFile', outputFileName);
    
    // 清理文件系统
    emitEvent('status', { message: '清理临时文件...' });
    emitEvent('progress', { ratio: 0.9, percent: 90 });
    ffmpeg.FS('unlink', inputFileName);
    ffmpeg.FS('unlink', outputFileName);
    
    emitEvent('status', { message: '裁剪完成' });
    emitEvent('complete', { type: 'trim', fileName: inputFile.name });
    emitEvent('progress', { ratio: 1, percent: 100 });
    
    return {
      data: new Uint8Array(data.buffer),
      name: `trimmed_${inputFile.name}`
    };
  } catch (error) {
    console.error('裁剪视频失败:', error);
    emitEvent('error', { message: `裁剪视频失败: ${error.message}`, details: error });
    // 尝试清理文件
    try {
      ffmpeg.FS('unlink', inputFileName);
      ffmpeg.FS('unlink', outputFileName);
    } catch (e) {
      // 忽略清理错误
    }
    throw error;
  }
}

// 提取音频函数
async function extractAudio(inputFile, outputFormat = 'mp3') {
  if (!isLoaded) {
    emitEvent('status', { message: '加载FFmpeg中...' });
    await loadFFmpeg();
  }
  
  // 使用时间戳创建安全的文件名
  const timestamp = Date.now();
  const extension = inputFile.name.split('.').pop();
  const inputFileName = `input_${timestamp}.${extension}`;
  const outputFileName = `output_${timestamp}.${outputFormat}`;
  
  try {
    emitEvent('status', { message: `开始提取音频: ${inputFile.name}` });
    emitEvent('progress', { ratio: 0.05, percent: 5 });
    console.log(`开始提取音频: ${inputFile.name}`);
    
    // 写入文件
    emitEvent('status', { message: '正在读取视频文件...' });
    emitEvent('progress', { ratio: 0.1, percent: 10 });
    ffmpeg.FS('writeFile', inputFileName, await fetchFile(inputFile));
    
    // 执行提取音频命令
    emitEvent('status', { message: '正在提取音频...' });
    emitEvent('progress', { ratio: 0.3, percent: 30 });
    await ffmpeg.run(
      '-i', inputFileName,
      '-vn', // 禁用视频
      '-acodec', outputFormat === 'mp3' ? 'libmp3lame' : 'aac',
      '-q:a', '2', // 质量设置
      outputFileName
    );
    
    // 读取输出文件
    emitEvent('status', { message: '正在处理输出文件...' });
    emitEvent('progress', { ratio: 0.8, percent: 80 });
    const data = ffmpeg.FS('readFile', outputFileName);
    
    // 清理文件系统
    emitEvent('status', { message: '清理临时文件...' });
    emitEvent('progress', { ratio: 0.9, percent: 90 });
    ffmpeg.FS('unlink', inputFileName);
    ffmpeg.FS('unlink', outputFileName);
    
    // 使用原文件名的基础部分作为输出
    const originalBaseName = inputFile.name.split('.')[0];
    
    emitEvent('status', { message: '音频提取完成' });
    emitEvent('complete', { type: 'audio', fileName: inputFile.name });
    emitEvent('progress', { ratio: 1, percent: 100 });
    
    return {
      data: new Uint8Array(data.buffer),
      name: `${originalBaseName}.${outputFormat}`
    };
  } catch (error) {
    console.error('提取音频失败:', error);
    emitEvent('error', { message: `提取音频失败: ${error.message}`, details: error });
    // 尝试清理文件
    try {
      ffmpeg.FS('unlink', inputFileName);
      ffmpeg.FS('unlink', outputFileName);
    } catch (e) {
      // 忽略清理错误
    }
    throw error;
  }
}

// 提取关键帧函数
async function extractKeyframes(inputFile) {
  if (!isLoaded) {
    emitEvent('status', { message: '加载FFmpeg中...' });
    await loadFFmpeg();
  }
  
  // 使用时间戳创建安全的文件名
  const timestamp = Date.now();
  const extension = inputFile.name.split('.').pop();
  const inputFileName = `input_${timestamp}.${extension}`;
  const outputPrefix = `keyframe_${timestamp}_`;
  
  try {
    emitEvent('status', { message: `开始提取关键帧: ${inputFile.name}` });
    emitEvent('progress', { ratio: 0.05, percent: 5 });
    console.log(`开始提取关键帧: ${inputFile.name}`);
    
    // 写入文件
    emitEvent('status', { message: '正在读取视频文件...' });
    emitEvent('progress', { ratio: 0.1, percent: 10 });
    ffmpeg.FS('writeFile', inputFileName, await fetchFile(inputFile));
    
    // 执行关键帧提取命令
    emitEvent('status', { message: '正在提取关键帧...' });
    emitEvent('progress', { ratio: 0.3, percent: 30 });
    await ffmpeg.run(
      '-i', inputFileName,
      '-vf', 'select=eq(pict_type\\,I)',
      '-vsync', 'vfr',
      '-q:v', '2',
      '-f', 'image2',
      `${outputPrefix}%03d.jpg`
    );
    
    // 读取所有输出的帧文件
    emitEvent('status', { message: '正在处理关键帧...' });
    emitEvent('progress', { ratio: 0.8, percent: 80 });
    const files = ffmpeg.FS('readdir', '.');
    const frameFiles = files.filter(filename => 
      filename.startsWith(outputPrefix) && filename.endsWith('.jpg')
    );
    
    emitEvent('status', { message: `找到 ${frameFiles.length} 个关键帧` });
    
    // 收集所有帧
    const frames = [];
    let frameIndex = 0;
    for (const filename of frameFiles) {
      const data = ffmpeg.FS('readFile', filename);
      frames.push({
        name: filename.replace(outputPrefix, ''),
        data: new Uint8Array(data.buffer)
      });
      
      // 更新处理进度
      frameIndex++;
      const frameProgress = 0.8 + (0.1 * (frameIndex / frameFiles.length));
      emitEvent('progress', { ratio: frameProgress, percent: Math.round(frameProgress * 100) });
      emitEvent('status', { message: `处理关键帧 ${frameIndex}/${frameFiles.length}...` });
      
      // 清理文件
      ffmpeg.FS('unlink', filename);
    }
    
    // 清理输入文件
    emitEvent('status', { message: '清理临时文件...' });
    emitEvent('progress', { ratio: 0.95, percent: 95 });
    ffmpeg.FS('unlink', inputFileName);
    
    emitEvent('status', { message: '关键帧提取完成' });
    emitEvent('complete', { type: 'keyframes', fileName: inputFile.name, count: frames.length });
    emitEvent('progress', { ratio: 1, percent: 100 });
    
    return {
      frames,
      count: frames.length
    };
  } catch (error) {
    console.error('提取关键帧失败:', error);
    emitEvent('error', { message: `提取关键帧失败: ${error.message}`, details: error });
    // 尝试清理文件
    try {
      ffmpeg.FS('unlink', inputFileName);
      
      // 尝试清理可能已生成的帧文件
      const files = ffmpeg.FS('readdir', '.');
      const frameFiles = files.filter(filename => 
        filename.startsWith(outputPrefix) && filename.endsWith('.jpg')
      );
      
      for (const filename of frameFiles) {
        ffmpeg.FS('unlink', filename);
      }
    } catch (e) {
      // 忽略清理错误
    }
    throw error;
  }
}

// 视频格式转换函数
async function convertVideo(inputFile, options = {}) {
  if (!isLoaded) {
    emitEvent('status', { message: '加载FFmpeg中...' });
    await loadFFmpeg();
  }
  
  // 使用时间戳创建安全的文件名
  const timestamp = Date.now();
  const inputExtension = inputFile.name.split('.').pop();
  const outputExtension = options.outputFormat || 'mp4';
  const inputFileName = `input_${timestamp}.${inputExtension}`;
  const outputFileName = `output_${timestamp}.${outputExtension}`;
  
  try {
    emitEvent('status', { message: `开始转换视频: ${inputFile.name}` });
    emitEvent('progress', { ratio: 0.05, percent: 5 });
    console.log(`开始转换视频: ${inputFile.name}`);
    
    // 写入文件
    emitEvent('status', { message: '正在读取视频文件...' });
    emitEvent('progress', { ratio: 0.1, percent: 10 });
    ffmpeg.FS('writeFile', inputFileName, await fetchFile(inputFile));
    
    // 构建命令参数
    const args = ['-i', inputFileName];
    
    // 添加编码器
    if (options.codec) {
      args.push('-c:v', options.codec);
    }
    
    // 添加分辨率
    if (options.resolution) {
      args.push('-s', options.resolution);
    }
    
    // 添加比特率
    if (options.bitrate) {
      args.push('-b:v', options.bitrate);
    }
    
    // 保留音频质量
    args.push('-c:a', 'aac', '-b:a', '128k');
    
    // 输出文件
    args.push(outputFileName);
    
    // 记录使用的命令
    const cmdString = `ffmpeg ${args.join(' ')}`;
    emitEvent('command', { command: cmdString });
    
    // 执行转换命令
    emitEvent('status', { message: '正在转换视频...' });
    emitEvent('progress', { ratio: 0.3, percent: 30 });
    await ffmpeg.run(...args);
    
    // 读取输出文件
    emitEvent('status', { message: '正在处理输出文件...' });
    emitEvent('progress', { ratio: 0.8, percent: 80 });
    const data = ffmpeg.FS('readFile', outputFileName);
    
    // 清理文件系统
    emitEvent('status', { message: '清理临时文件...' });
    emitEvent('progress', { ratio: 0.9, percent: 90 });
    ffmpeg.FS('unlink', inputFileName);
    ffmpeg.FS('unlink', outputFileName);
    
    emitEvent('status', { message: '视频转换完成' });
    emitEvent('complete', { type: 'convert', fileName: inputFile.name });
    emitEvent('progress', { ratio: 1, percent: 100 });
    
    return {
      data: new Uint8Array(data.buffer),
      name: `converted_${inputFile.name.split('.')[0]}.${outputExtension}`,
      outputSize: data.byteLength,
      inputSize: inputFile.size
    };
  } catch (error) {
    console.error('转换视频失败:', error);
    emitEvent('error', { message: `转换视频失败: ${error.message}`, details: error });
    // 尝试清理文件
    try {
      ffmpeg.FS('unlink', inputFileName);
      ffmpeg.FS('unlink', outputFileName);
    } catch (e) {
      // 忽略清理错误
    }
    throw error;
  }
}

// 导出函数和对象
export const getFFmpeg = () => ffmpeg;
export { fetchFile };
export { loadFFmpeg };
export { trimVideo };
export { extractAudio };
export { extractKeyframes };
export { convertVideo };
export const checkIsLoaded = () => isLoaded;
export { on };  // 导出事件监听函数 