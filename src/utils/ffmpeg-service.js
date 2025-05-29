// 创建FFmpeg服务，用于与Web Worker通信
class FFmpegService {
  constructor() {
    this.worker = null;
    this.callbacks = {};
    this.logs = [];
    this.maxLogs = 100; // 最多保存100条日志
    this.retryCount = 0;
    this.maxRetries = 3; // 最大重试次数
    this.initialized = false;
    this.initWorker();
  }

  // 初始化Worker
  initWorker() {
    try {
      console.log('正在初始化FFmpeg Worker...');
      this.addLog('info', '正在初始化FFmpeg Worker...');
      
      // 创建新的Worker
      this.worker = new Worker(
        new URL('../workers/ffmpeg.worker.js', import.meta.url),
        { type: 'module' }
      );

      // 设置消息处理函数
      this.worker.onmessage = (event) => {
        const { type, payload } = event.data;
        
        // 处理日志消息
        if (type === 'log') {
          this.handleLog(payload);
        }
        
        // 处理进度信息
        if (type === 'progress' && payload && typeof payload.progress === 'number') {
          this.addLog('info', `处理进度: ${payload.progress}%`);
          if (this.callbacks.progress) {
            this.callbacks.progress(payload);
          }
        }
        
        // 处理加载消息
        if (type === 'loading') {
          this.addLog('info', payload || '加载中...');
          if (this.callbacks.loading) {
            this.callbacks.loading(payload);
          }
        }
        
        // 处理加载完成消息
        if (type === 'loaded') {
          this.addLog('info', payload || 'FFmpeg加载完成');
          this.initialized = true;
          this.retryCount = 0; // 重置重试计数
          if (this.callbacks.loaded) {
            this.callbacks.loaded(payload);
          }
        }
        
        // 处理错误消息
        if (type === 'error') {
          this.handleError(payload);
        }
        
        // 调用对应类型的回调函数
        if (this.callbacks[type]) {
          this.callbacks[type](payload);
        }
      };

      // 设置错误处理函数
      this.worker.onerror = (error) => {
        console.error('FFmpeg Worker 错误:', error);
        const errorMessage = error.message || 'Worker初始化失败';
        const errorStack = error.stack || '';
        
        this.handleLog({
          type: 'error',
          message: `Worker Error: ${errorMessage}`,
          stack: errorStack,
          timestamp: new Date().toISOString()
        });
        
        this.tryRecoverWorker(errorMessage);
      };
      
      this.addLog('info', 'FFmpeg Worker初始化成功');
    } catch (error) {
      console.error('创建FFmpeg Worker失败:', error);
      this.handleLog({
        type: 'error',
        message: `创建Worker失败: ${error.message}`,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      this.tryRecoverWorker(error.message);
    }
  }

  // 尝试恢复Worker
  tryRecoverWorker(errorMessage) {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.addLog('warning', `Worker异常，尝试第${this.retryCount}次重新初始化...`);
      setTimeout(() => {
        this.terminate();
        this.initWorker();
      }, 1000 * this.retryCount); // 逐步增加重试间隔
    } else {
      if (this.callbacks.error) {
        this.callbacks.error({
          message: `Worker初始化失败，已重试${this.maxRetries}次: ${errorMessage}`,
          fatal: true
        });
      }
    }
  }

  // 处理错误消息
  handleError(error) {
    const errorMessage = typeof error === 'string' ? error : 
                         (error && error.message ? error.message : 'Unknown error');
    
    this.handleLog({
      type: 'error',
      message: errorMessage,
      stack: error && error.stack ? error.stack : '',
      timestamp: new Date().toISOString()
    });
    
    // 检查是否是FFmpeg核心加载失败
    if (errorMessage.includes('加载FFmpeg失败') || errorMessage.includes('加载FFmpeg核心文件失败')) {
      // 尝试重新初始化Worker
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        this.addLog('warning', `FFmpeg核心加载失败，尝试第${this.retryCount}次重新加载...`);
        setTimeout(() => {
          // 使用preload命令并指定使用本地路径
          this.send('preload', { useLocalPath: true });
        }, 1000 * this.retryCount);
      } else if (this.callbacks.error) {
        this.callbacks.error({
          message: `FFmpeg核心加载失败，已重试${this.maxRetries}次: ${errorMessage}`,
          fatal: true
        });
      }
    } else if (this.callbacks.error) {
      this.callbacks.error(error);
    }
  }

  // 添加日志
  addLog(type, message) {
    this.handleLog({
      type,
      message,
      timestamp: new Date().toISOString()
    });
  }

  // 处理日志消息
  handleLog(logEntry) {
    // 添加日志到数组
    this.logs.push(logEntry);
    
    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // 移除最旧的日志
    }
    
    // 调用日志回调
    if (this.callbacks.log) {
      this.callbacks.log(logEntry);
    }
    
    // 根据日志类型决定是否打印到控制台
    if (logEntry.type === 'error') {
      console.error(`FFmpeg: ${logEntry.message}`, logEntry.stack ? logEntry.stack : '');
    } else if (logEntry.type === 'warning') {
      console.warn(`FFmpeg: ${logEntry.message}`);
    } else if (logEntry.type === 'info') {
      console.info(`FFmpeg: ${logEntry.message}`);
    } else {
      console.log(`FFmpeg: ${logEntry.message}`);
    }
  }

  // 获取所有日志
  getLogs() {
    return [...this.logs];
  }

  // 清除日志
  clearLogs() {
    this.logs = [];
    return this;
  }

  // 注册回调函数
  on(type, callback) {
    this.callbacks[type] = callback;
    return this;
  }

  // 发送消息到Worker
  send(type, payload) {
    if (!this.worker) {
      this.addLog('warning', 'FFmpeg Worker未初始化，正在尝试重新初始化...');
      this.initWorker();
      
      // 将命令放入队列，500ms后重试
      setTimeout(() => {
        this.send(type, payload);
      }, 500);
      
      return this;
    }
    
    try {
      this.addLog('info', `发送${type}操作到Worker...`);
      this.worker.postMessage({ type, payload });
    } catch (error) {
      this.handleLog({
        type: 'error',
        message: `发送消息失败: ${error.message}`,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      if (this.callbacks.error) {
        this.callbacks.error(error);
      }
    }
    return this;
  }

  // 裁剪视频
  trimVideo(inputFile, outputFile, startTime, duration, name) {
    this.addLog('info', `开始裁剪视频 ${inputFile.name}，起始时间: ${startTime}，时长: ${duration}`);
    return this.send('trim', { inputFile, outputFile, startTime, duration, name });
  }

  // 提取音频
  extractAudio(inputFile, outputFile, name) {
    this.addLog('info', `开始提取音频 ${inputFile.name}`);
    return this.send('extractAudio', { inputFile, outputFile, name });
  }

  // 提取关键帧
  extractKeyframes(inputFile, outputPrefix, name) {
    this.addLog('info', `开始提取关键帧 ${inputFile.name}`);
    return this.send('extractKeyframes', { inputFile, outputPrefix, name });
  }

  // 转换视频格式
  convertVideo(inputFile, outputFile, options, name) {
    this.addLog('info', `开始转换视频格式 ${inputFile.name} -> ${outputFile}`);
    return this.send('convert', { inputFile, outputFile, options, name });
  }

  // 获取视频信息
  getVideoInfo(inputFile) {
    this.addLog('info', `获取视频信息 ${inputFile.name}`);
    return this.send('getInfo', { inputFile });
  }

  // 检查初始化状态
  isInitialized() {
    return this.initialized;
  }

  // 终止Worker
  terminate() {
    if (this.worker) {
      try {
        this.addLog('info', '终止FFmpeg Worker');
        this.worker.terminate();
      } catch (error) {
        console.error('终止Worker失败:', error);
      }
      this.worker = null;
    }
    this.initialized = false;
    return this;
  }
  
  // 重新初始化Worker
  restart() {
    this.addLog('info', '重新初始化FFmpeg Worker');
    this.terminate();
    this.retryCount = 0; // 重置重试计数
    this.initWorker();
    return this;
  }
}

// 导出单例
export default new FFmpegService();