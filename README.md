# FFmpeg Web

<div align="center">

[中文文档](#chinese) | [English Documentation](#english)

</div>

---

<a id="chinese"></a>

# FFmpeg Web - 浏览器端视频处理工具

基于FFmpeg.js的纯前端视频处理工具，实现视频剪切、音频提取、关键帧提取等功能，无需服务器支持。所有视频处理均在用户浏览器中完成，保护用户隐私，同时提供高效流畅的操作体验。

## 功能特点

- **视频裁剪**：
  - 精确控制开始和结束时间，支持毫秒级精度
  - 多种质量选项（原始质量/高质量/中等质量/低质量）
  - 支持分辨率调整（1080p/720p/480p/360p等）
  - 快速预览裁剪结果
  - 智能文件命名，包含处理参数信息
  - 显示详细的处理进度和状态信息

- **音频提取**：
  - 从视频中提取音频轨道
  - 支持多种输出格式（MP3, WAV, AAC）
  - 可自定义音频质量和比特率
  - 实时音频预览功能
  - 一键下载提取的音频文件

- **关键帧提取**：
  - 自动识别和提取视频关键帧（I帧）
  - 支持缩略图预览和全尺寸查看
  - 单帧下载或打包下载全部关键帧
  - 显示每个关键帧的详细信息
  - 提供关键帧管理和导出功能

- **格式转换**：
  - 支持多种视频格式转换（MP4, WebM, MKV）
  - 多种编码器选择（H.264, H.265/HEVC, VP9）
  - 可自定义分辨率、比特率和质量设置
  - 预设配置（高清、标清、流畅、压缩）
  - 转换前后文件大小对比
  - 详细的转换过程监控

## 技术栈

- **前端框架**：
  - Vue 3 - 采用Composition API构建响应式用户界面
  - Vite - 现代化构建工具，提供快速的开发体验
  - Element Plus - 基于Vue 3的UI组件库，提供美观一致的界面元素

- **视频处理核心**：
  - FFmpeg.js - 将强大的FFmpeg视频处理库编译为WebAssembly
  - 使用Web Worker实现多线程处理，避免阻塞主线程
  - 基于ArrayBuffer和TypedArray的高效二进制数据处理

- **工具库**：
  - JSZip - 用于批量下载和文件压缩
  - FileSaver.js - 提供跨浏览器的文件保存功能
  - Day.js - 轻量级日期处理工具

- **工程化与开发**：
  - ESLint - 代码质量检查工具
  - Prettier - 代码格式化工具
  - TypeScript - 提供类型安全和代码提示
  - Git - 版本控制系统

## 下载与运行

### 在线使用

访问[FFmpeg Web在线应用](https://qinjiujiu-pc.github.io/ffmpeg_web/)（即将推出）

### 本地开发环境

1. **克隆仓库**：
```bash
git clone https://github.com/qinjiujiu-pc/ffmpeg_web.git
cd ffmpeg_web
```

2. **安装依赖**：
```bash
npm install
# 或使用yarn
yarn install
```

3. **运行开发服务器**：
```bash
npm run dev
# 或使用yarn
yarn dev
```

4. **构建生产版本**：
```bash
npm run build
# 或使用yarn
yarn build
```

5. **预览生产版本**：
```bash
npm run preview
# 或使用yarn
yarn preview
```

### 部署说明

项目可以部署到任何静态网站托管服务，如GitHub Pages、Netlify、Vercel等：

1. 构建项目：`npm run build`
2. 将`dist`目录中的文件部署到您的Web服务器或静态托管服务

## 优势

- **保护隐私**：所有处理均在本地完成，视频不会上传到任何服务器
- **高效处理**：使用WebAssembly技术，处理速度接近原生应用
- **跨平台**：支持主流浏览器，无需安装额外软件
- **零依赖**：无需后端服务器，降低部署和维护成本
- **离线工作**：一旦加载完成，可在离线环境下继续使用

## 使用方法

1. 打开应用
2. 上传视频文件
3. 选择所需的处理功能
4. 设置处理参数
5. 点击处理按钮
6. 下载处理结果

## 开发计划

- **视频裁剪模块增强**：
  - 批量处理功能：同时处理多个视频文件
  - 多段截取功能：在单个视频中标记多个片段进行提取
  - 性能优化：提高大型视频文件的处理速度

- **音频提取模块增强**：
  - 增加更多音频转换格式（FLAC, OGG, OPUS等）
  - 支持更多音频质量参数设置（采样率、声道数等）
  - 支持音量调节、噪声降低、声道选择
  - 支持波形可视化显示
  - 支持语音转字幕功能

- **关键帧提取模块增强**：
  - 优化关键帧智能筛选算法，去除相似帧
  - 支持关键帧图像质量控制（分辨率、压缩率等）
  - 支持关键帧人脸检测和标注

- **格式转换模块增强**：
  - 支持高级编码选项，更多编码格式可选
  - 视频增强处理：集成降噪、锐化等画质优化功能

- **OCR识别模块**：
  - 集成Tesseract.js实现视频中的文字识别
  - 支持多语言文本识别
  - 导出识别结果为文本文件

- **视频水印功能**：
  - 支持添加图片水印
  - 支持添加文字水印
  - 自定义水印位置、透明度和动画效果

- **其他计划功能**：
  - 支持视频拼接功能
  - 字幕提取与添加
  - 视频压缩优化算法
  - 移动设备适配优化

## 注意事项

- 首次使用时需要下载FFmpeg核心文件(约30MB)，请确保网络连接正常
- 视频处理性能取决于用户设备的性能，处理大型视频可能需要较长时间
- 建议使用现代浏览器(Chrome, Firefox, Edge等)以获得最佳体验
- 处理含有中文或特殊字符文件名的视频时，系统会自动处理，但建议使用英文字母、数字和下划线命名文件

## 浏览器兼容性

- Chrome 80+
- Firefox 80+
- Edge 80+
- Safari 14+

## 问题反馈

如果您在使用过程中遇到任何问题或有功能建议，请通过以下方式提交：

1. 在GitHub仓库创建[Issue](https://github.com/qinjiujiu-pc/ffmpeg_web/issues)
2. 联系邮箱：516286117@qq.com

## 许可证

[MIT](LICENSE)

---

<a id="english"></a>

# FFmpeg Web - Browser-based Video Processing Tool

A pure front-end video processing tool based on FFmpeg.js, implementing video trimming, audio extraction, keyframe extraction, and other features without server support. All video processing is completed in the user's browser, protecting user privacy while providing an efficient and smooth operation experience.

## Features

- **Video Trimming**:
  - Precise control of start and end times, supporting millisecond-level accuracy
  - Multiple quality options (Original/High/Medium/Low quality)
  - Resolution adjustment support (1080p/720p/480p/360p, etc.)
  - Quick preview of trimming results
  - Smart file naming including processing parameter information
  - Detailed processing progress and status information

- **Audio Extraction**:
  - Extract audio tracks from videos
  - Support for multiple output formats (MP3, WAV, AAC)
  - Customizable audio quality and bitrate
  - Real-time audio preview
  - One-click download of extracted audio files

- **Keyframe Extraction**:
  - Automatic recognition and extraction of video keyframes (I-frames)
  - Support for thumbnail preview and full-size viewing
  - Single frame download or batch download of all keyframes
  - Display detailed information for each keyframe
  - Provide keyframe management and export functions

- **Format Conversion**:
  - Support for multiple video format conversions (MP4, WebM, MKV)
  - Multiple encoder options (H.264, H.265/HEVC, VP9)
  - Customizable resolution, bitrate, and quality settings
  - Preset configurations (HD, SD, Smooth, Compressed)
  - File size comparison before and after conversion
  - Detailed conversion process monitoring

## Technology Stack

- **Front-end Framework**:
  - Vue 3 - Building responsive user interfaces using Composition API
  - Vite - Modern build tool providing fast development experience
  - Element Plus - UI component library based on Vue 3, providing aesthetically consistent interface elements

- **Video Processing Core**:
  - FFmpeg.js - Compiling the powerful FFmpeg video processing library to WebAssembly
  - Using Web Workers for multi-threaded processing to avoid blocking the main thread
  - Efficient binary data processing based on ArrayBuffer and TypedArray

- **Utility Libraries**:
  - JSZip - For batch downloads and file compression
  - FileSaver.js - Providing cross-browser file saving functionality
  - Day.js - Lightweight date processing tool

- **Engineering & Development**:
  - ESLint - Code quality checking tool
  - Prettier - Code formatting tool
  - TypeScript - Providing type safety and code hints
  - Git - Version control system

## Download and Run

### Online Usage

Visit [FFmpeg Web Online Application](https://qinjiujiu-pc.github.io/ffmpeg_web/) (Coming soon)

### Local Development Environment

1. **Clone Repository**:
```bash
git clone https://github.com/qinjiujiu-pc/ffmpeg_web.git
cd ffmpeg_web
```

2. **Install Dependencies**:
```bash
npm install
# or using yarn
yarn install
```

3. **Run Development Server**:
```bash
npm run dev
# or using yarn
yarn dev
```

4. **Build Production Version**:
```bash
npm run build
# or using yarn
yarn build
```

5. **Preview Production Version**:
```bash
npm run preview
# or using yarn
yarn preview
```

### Deployment Instructions

The project can be deployed to any static website hosting service such as GitHub Pages, Netlify, Vercel, etc.:

1. Build the project: `npm run build`
2. Deploy the files in the `dist` directory to your web server or static hosting service

## Advantages

- **Privacy Protection**: All processing is done locally; videos are not uploaded to any server
- **Efficient Processing**: Using WebAssembly technology, processing speed approaches native applications
- **Cross-platform**: Supports mainstream browsers, no need to install additional software
- **Zero Dependencies**: No backend server required, reducing deployment and maintenance costs
- **Offline Work**: Once loaded, can continue to be used in an offline environment

## Usage Method

1. Open the application
2. Upload video file
3. Select desired processing function
4. Set processing parameters
5. Click the process button
6. Download processing results

## Development Plan

- **Video Trimming Module Enhancements**:
  - Batch processing: Process multiple video files simultaneously
  - Multi-segment extraction: Mark and extract multiple segments from a single video
  - Performance optimization: Improve processing speed for large video files

- **Audio Extraction Module Enhancements**:
  - Add more audio conversion formats (FLAC, OGG, OPUS, etc.)
  - Support more audio quality parameter settings (sample rate, channels, etc.)
  - Support volume adjustment, noise reduction, channel selection
  - Support waveform visualization
  - Support speech-to-text subtitle generation

- **Keyframe Extraction Module Enhancements**:
  - Optimize intelligent keyframe filtering algorithm to remove similar frames
  - Support keyframe image quality control (resolution, compression rate, etc.)
  - Support face detection and annotation in keyframes

- **Format Conversion Module Enhancements**:
  - Support advanced encoding options with more codec choices
  - Video enhancement processing: Integrate noise reduction, sharpening, and other quality optimization features

- **OCR Recognition Module**:
  - Integrate Tesseract.js for text recognition in videos
  - Support multi-language text recognition
  - Export recognition results as text files

- **Video Watermark Functionality**:
  - Support adding image watermarks
  - Support adding text watermarks
  - Customize watermark position, transparency, and animation effects

- **Other Planned Features**:
  - Support for video joining functionality
  - Subtitle extraction and addition
  - Video compression optimization algorithms
  - Mobile device adaptation optimization

## Notes

- When using for the first time, you need to download FFmpeg core files (about 30MB), please ensure your network connection is normal
- Video processing performance depends on the user's device performance; processing large videos may take longer
- It is recommended to use modern browsers (Chrome, Firefox, Edge, etc.) for the best experience
- When processing videos with Chinese or special character filenames, the system will automatically handle them, but it is recommended to use English letters, numbers, and underscores for file naming

## Browser Compatibility

- Chrome 80+
- Firefox 80+
- Edge 80+
- Safari 14+

## Feedback

If you encounter any issues or have feature suggestions during use, please submit them through the following methods:

1. Create an [Issue](https://github.com/qinjiujiu-pc/ffmpeg_web/issues) in the GitHub repository
2. Contact email: 516286117@qq.com

## License

[MIT](LICENSE)
