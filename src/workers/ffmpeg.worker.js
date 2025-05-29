import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

// Web Worker环境中没有document对象，需要重写FFmpeg的URL解析功能
// 在0.9.8版本中，FFmpeg内部使用document来解析URL，这在Worker中会导致错误
self.document = {
  currentScript: {
    src: self.location.href
  },
  // 模拟createElement方法
  createElement: function(tagName) {
    // 返回一个模拟的DOM元素
    return {
      tagName: tagName,
      src: '',
      href: '',
      setAttribute: function(name, value) {
        this[name] = value;
      },
      appendChild: function(child) {
        return child;
      },
      // 为script标签提供支持
      addEventListener: function(event, callback) {
        if (event === 'load') {
          // 模拟异步加载完成
          setTimeout(callback, 0);
        }
      },
      removeEventListener: function() {},
      dispatchEvent: function() {}
    };
  },
  // 模拟body对象
  body: {
    appendChild: function(el) {
      return el;
    },
    removeChild: function() {}
  }
};

// 从当前Worker URL获取基础路径
const getBaseUrl = () => {
  const workerUrl = self.location.href;
  // 移除文件名，保留路径
  return workerUrl.substring(0, workerUrl.lastIndexOf('/') + 1);
};

let ffmpeg = null;
let loaded = false;

// 向主线程发送错误信息
function sendError(message, stack = '') {
  self.postMessage({
    type: 'error',
    payload: {
      message,
      stack,
      timestamp: new Date().toISOString()
    }
  });
}

// 向主线程发送日志
function sendLog(type, message) {
  self.postMessage({ 
    type: 'log', 
    payload: { 
      type, 
      message,
      timestamp: new Date().toISOString() 
    } 
  });
}

// 初始化FFmpeg
async function initFFmpeg(useLocalPath = false) {
  try {
    if (!ffmpeg) {
      sendLog('info', '正在创建FFmpeg实例...');
      
      // 获取基础URL路径
      const baseUrl = getBaseUrl();
      const publicPath = baseUrl.substring(0, baseUrl.indexOf('/assets/') + 1);
      
      // 创建FFmpeg实例 - 旧版API使用createFFmpeg
      ffmpeg = createFFmpeg({
        // 使用绝对路径加载核心文件
        corePath: useLocalPath 
          ? `${publicPath}ffmpeg-core.js` 
          : `${self.location.origin}/ffmpeg-core.js`,
        log: true,
        logger: ({ type, message }) => {
          self.postMessage({ 
            type: 'log', 
            payload: { 
              type, 
              message,
              timestamp: new Date().toISOString() 
            } 
          });
        },
        progress: (progress) => {
          self.postMessage({
            type: 'progress',
            payload: {
              progress: Math.round(progress.ratio * 100),
              time: 0 // 旧版API不提供time
            }
          });
        }
      });
    }
    
    return ffmpeg;
  } catch (error) {
    sendError(`初始化FFmpeg失败: ${error.message}`, error.stack);
    throw error;
  }
}

// 尝试加载FFmpeg
async function loadFFmpeg(useLocalPath = false) {
  try {
    // 初始化FFmpeg
    ffmpeg = await initFFmpeg(useLocalPath);
    
    sendLog('info', '正在加载FFmpeg核心文件...');
    
    // 加载FFmpeg - 旧版API
    await ffmpeg.load();
    
    sendLog('info', 'FFmpeg核心文件加载成功');
    return true;
  } catch (error) {
    // 如果使用本地路径失败，尝试使用其他路径
    if (useLocalPath) {
      sendLog('warning', `使用本地路径加载失败: ${error.message}，尝试使用绝对路径...`);
      
      try {
        // 获取基础URL路径
        const origin = self.location.origin;
        
        // 重新创建实例并使用绝对路径
        ffmpeg = createFFmpeg({
          corePath: `${origin}/ffmpeg-core.js`,
          log: true,
          logger: ({ type, message }) => {
            self.postMessage({ 
              type: 'log', 
              payload: { 
                type, 
                message,
                timestamp: new Date().toISOString() 
              } 
            });
          },
          progress: (progress) => {
            self.postMessage({
              type: 'progress',
              payload: {
                progress: Math.round(progress.ratio * 100),
                time: 0
              }
            });
          }
        });
        
        await ffmpeg.load();
        sendLog('info', '使用绝对路径加载FFmpeg核心文件成功');
        return true;
      } catch (secondError) {
        sendError(`所有路径加载FFmpeg失败: ${secondError.message}`, secondError.stack);
        throw secondError;
      }
    } else {
      sendError(`加载FFmpeg失败: ${error.message}`, error.stack);
      throw error;
    }
  }
}

// 处理消息
self.onmessage = async ({ data: { type, payload } }) => {
  try {
    if (type === 'preload') {
      // 预加载操作
      self.postMessage({ type: 'loading', payload: '正在加载FFmpeg...' });
      
      try {
        // 检查是否指定使用本地路径
        const useLocalPath = payload && payload.useLocalPath === true;
        
        // 尝试加载FFmpeg核心文件
        await loadFFmpeg(useLocalPath);
        
        loaded = true;
        self.postMessage({ type: 'loaded', payload: 'FFmpeg加载完成' });
        self.postMessage({
          type: 'preloadComplete',
          payload: { success: true }
        });
      } catch (error) {
        sendError(`加载FFmpeg失败: ${error.message}`, error.stack);
      }
      return;
    }

    if (!loaded) {
      self.postMessage({ type: 'loading', payload: '正在加载FFmpeg...' });
      
      try {
        // 尝试加载FFmpeg核心文件
        await loadFFmpeg(false);
        
        loaded = true;
        self.postMessage({ type: 'loaded', payload: 'FFmpeg加载完成' });
      } catch (error) {
        sendError(`加载FFmpeg失败: ${error.message}`, error.stack);
        return;
      }
    }

    switch (type) {
      case 'trim': {
        // 视频裁剪
        const { inputFile, outputFile, startTime, duration, name } = payload;
        self.postMessage({ type: 'progress', payload: { progress: 0, name } });
        
        // 将视频文件写入内存 - 旧版API
        try {
          sendLog('info', `正在处理文件: ${inputFile.name}...`);
          const fileData = await fetchFile(inputFile);
          ffmpeg.FS('writeFile', inputFile.name, fileData);
        } catch (error) {
          sendError(`读取视频文件失败: ${error.message}`, error.stack);
          return;
        }
        
        // 记录开始处理时间
        const startProcessTime = Date.now();
        
        // 执行裁剪命令 - 旧版API
        try {
          sendLog('info', `裁剪视频，开始时间: ${startTime}, 时长: ${duration}`);
          await ffmpeg.run(
            '-i', inputFile.name,
            '-ss', startTime,
            '-t', duration,
            '-c', 'copy',
            outputFile
          );
        } catch (error) {
          sendError(`裁剪视频失败: ${error.message}`, error.stack);
          // 清理文件系统
          try {
            ffmpeg.FS('unlink', inputFile.name);
          } catch (e) { /* 忽略清理错误 */ }
          return;
        }
        
        // 计算处理时间
        const processingTime = (Date.now() - startProcessTime) / 1000;
        
        // 读取输出文件 - 旧版API
        let data;
        try {
          sendLog('info', '读取处理后的视频文件...');
          data = ffmpeg.FS('readFile', outputFile);
        } catch (error) {
          sendError(`读取输出文件失败: ${error.message}`, error.stack);
          // 清理文件系统
          try {
            ffmpeg.FS('unlink', inputFile.name);
            ffmpeg.FS('unlink', outputFile);
          } catch (e) { /* 忽略清理错误 */ }
          return;
        }
        
        // 清理文件系统 - 旧版API
        try {
          ffmpeg.FS('unlink', inputFile.name);
          ffmpeg.FS('unlink', outputFile);
        } catch (error) {
          console.error('清理文件系统失败:', error);
        }
        
        // 返回处理后的视频和处理时间
        sendLog('info', '裁剪完成，准备返回结果...');
        self.postMessage({
          type: 'trimComplete',
          payload: { 
            data, 
            outputFile, 
            name,
            processingTime,
            inputSize: inputFile.size,
            outputSize: data.byteLength
          }
        }, [data.buffer]);
        break;
      }
      
      case 'extractAudio': {
        // 提取音频
        const { inputFile, outputFile, name } = payload;
        self.postMessage({ type: 'progress', payload: { progress: 0, name } });
        
        // 将视频文件写入内存 - 旧版API
        try {
          const fileData = await fetchFile(inputFile);
          ffmpeg.FS('writeFile', inputFile.name, fileData);
        } catch (error) {
          sendError(`读取视频文件失败: ${error.message}`, error.stack);
          return;
        }
        
        // 记录开始处理时间
        const startProcessTime = Date.now();
        
        // 执行音频提取命令 - 旧版API
        try {
          await ffmpeg.run(
            '-i', inputFile.name,
            '-vn', // 禁用视频
            '-acodec', 'libmp3lame', // 使用MP3编码
            '-q:a', '2', // 质量设置
            outputFile
          );
        } catch (error) {
          sendError(`提取音频失败: ${error.message}`, error.stack);
          // 清理文件系统
          try {
            ffmpeg.FS('unlink', inputFile.name);
          } catch (e) { /* 忽略清理错误 */ }
          return;
        }
        
        // 计算处理时间
        const processingTime = (Date.now() - startProcessTime) / 1000;
        
        // 读取输出文件 - 旧版API
        let data;
        try {
          data = ffmpeg.FS('readFile', outputFile);
        } catch (error) {
          sendError(`读取输出文件失败: ${error.message}`, error.stack);
          return;
        }
        
        // 清理文件系统 - 旧版API
        try {
          ffmpeg.FS('unlink', inputFile.name);
          ffmpeg.FS('unlink', outputFile);
        } catch (error) {
          console.error('清理文件系统失败:', error);
        }
        
        // 返回处理后的音频和处理时间
        self.postMessage({
          type: 'extractAudioComplete',
          payload: { 
            data, 
            outputFile, 
            name,
            processingTime,
            inputSize: inputFile.size,
            outputSize: data.byteLength
          }
        }, [data.buffer]);
        break;
      }
      
      case 'extractKeyframes': {
        // 提取关键帧
        const { inputFile, outputPrefix, name } = payload;
        self.postMessage({ type: 'progress', payload: { progress: 0, name } });
        
        // 将视频文件写入内存 - 旧版API
        try {
          const fileData = await fetchFile(inputFile);
          ffmpeg.FS('writeFile', inputFile.name, fileData);
        } catch (error) {
          sendError(`读取视频文件失败: ${error.message}`, error.stack);
          return;
        }
        
        // 记录开始处理时间
        const startProcessTime = Date.now();
        
        // 执行关键帧提取命令 - 旧版API
        try {
          await ffmpeg.run(
            '-i', inputFile.name,
            '-vf', 'select=eq(pict_type\\,I)',
            '-vsync', 'vfr',
            '-q:v', '2',
            '-f', 'image2',
            `${outputPrefix}_%03d.jpg`
          );
        } catch (error) {
          sendError(`提取关键帧失败: ${error.message}`, error.stack);
          // 清理文件系统
          try {
            ffmpeg.FS('unlink', inputFile.name);
          } catch (e) { /* 忽略清理错误 */ }
          return;
        }
        
        // 计算处理时间
        const processingTime = (Date.now() - startProcessTime) / 1000;
        
        // 读取所有输出的帧文件 - 旧版API
        let files = [];
        try {
          files = ffmpeg.FS('readdir', '.');
          files = files.filter(filename => 
            filename.startsWith(outputPrefix) && filename.endsWith('.jpg')
          );
        } catch (error) {
          sendError(`读取帧文件列表失败: ${error.message}`, error.stack);
          return;
        }
        
        const frames = [];
        let totalSize = 0;
        
        // 读取每个帧文件 - 旧版API
        for (const filename of files) {
          try {
            const data = ffmpeg.FS('readFile', filename);
            frames.push({
              name: filename,
              data: new Uint8Array(data.buffer)
            });
            totalSize += data.byteLength;
            ffmpeg.FS('unlink', filename);
          } catch (error) {
            console.error(`读取帧文件 ${filename} 失败:`, error);
          }
        }
        
        // 清理文件系统 - 旧版API
        try {
          ffmpeg.FS('unlink', inputFile.name);
        } catch (error) {
          console.error('清理文件系统失败:', error);
        }
        
        // 返回关键帧和处理时间
        self.postMessage({
          type: 'extractKeyframesComplete',
          payload: { 
            frames, 
            name,
            processingTime,
            frameCount: frames.length,
            inputSize: inputFile.size,
            outputSize: totalSize
          }
        });
        break;
      }
      
      case 'convert': {
        // 视频格式转换
        const { inputFile, outputFile, options, name } = payload;
        self.postMessage({ type: 'progress', payload: { progress: 0, name } });
        
        // 将视频文件写入内存 - 旧版API
        try {
          const fileData = await fetchFile(inputFile);
          ffmpeg.FS('writeFile', inputFile.name, fileData);
        } catch (error) {
          sendError(`读取视频文件失败: ${error.message}`, error.stack);
          return;
        }
        
        // 构建命令参数
        const args = ['-i', inputFile.name];
        
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
        args.push(outputFile);
        
        // 记录命令用于日志
        const command = `ffmpeg ${args.join(' ')}`;
        self.postMessage({ 
          type: 'log', 
          payload: { 
            type: 'info', 
            message: `执行命令: ${command}`,
            timestamp: new Date().toISOString() 
          } 
        });
        
        // 记录开始处理时间
        const startProcessTime = Date.now();
        
        // 执行转换命令 - 旧版API
        try {
          await ffmpeg.run(...args);
        } catch (error) {
          sendError(`转换视频失败: ${error.message}`, error.stack);
          // 清理文件系统
          try {
            ffmpeg.FS('unlink', inputFile.name);
          } catch (e) { /* 忽略清理错误 */ }
          return;
        }
        
        // 计算处理时间
        const processingTime = (Date.now() - startProcessTime) / 1000;
        
        // 读取输出文件 - 旧版API
        let data;
        try {
          data = ffmpeg.FS('readFile', outputFile);
        } catch (error) {
          sendError(`读取输出文件失败: ${error.message}`, error.stack);
          return;
        }
        
        // 清理文件系统 - 旧版API
        try {
          ffmpeg.FS('unlink', inputFile.name);
          ffmpeg.FS('unlink', outputFile);
        } catch (error) {
          console.error('清理文件系统失败:', error);
        }
        
        // 返回转换后的视频和处理信息
        self.postMessage({
          type: 'convertComplete',
          payload: { 
            data, 
            outputFile, 
            name,
            processingTime,
            inputSize: inputFile.size,
            outputSize: data.byteLength,
            compressionRatio: (data.byteLength / inputFile.size).toFixed(2)
          }
        }, [data.buffer]);
        break;
      }
      
      // 添加获取视频信息功能
      case 'getInfo': {
        const { inputFile } = payload;
        
        // 将视频文件写入内存 - 旧版API
        try {
          const fileData = await fetchFile(inputFile);
          ffmpeg.FS('writeFile', inputFile.name, fileData);
        } catch (error) {
          sendError(`读取视频文件失败: ${error.message}`, error.stack);
          return;
        }
        
        // 执行ffprobe命令获取视频信息 - 旧版API
        try {
          await ffmpeg.run(
            '-i', inputFile.name,
            '-hide_banner'
          );
        } catch (error) {
          // 预期会失败，因为ffprobe结果会输出到标准错误
          // 日志中已经包含了视频信息
        }
        
        // 清理文件系统 - 旧版API
        try {
          ffmpeg.FS('unlink', inputFile.name);
        } catch (error) {
          console.error('清理文件系统失败:', error);
        }
        
        // 日志中已经包含了视频信息
        self.postMessage({
          type: 'getInfoComplete',
          payload: { success: true }
        });
        break;
      }
      
      default:
        sendError(`未知操作类型: ${type}`);
    }
  } catch (error) {
    sendError(`处理消息失败: ${error.message}`, error.stack);
  }
}; 