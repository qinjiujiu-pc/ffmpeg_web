import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import fs from 'fs'
import path from 'path'

// 检查并复制FFmpeg核心文件到public目录的自定义插件
function copyFFmpegCore() {
  return {
    name: 'copy-ffmpeg-core',
    buildStart() {
      const corePackagePath = resolve(__dirname, 'node_modules/@ffmpeg/core')
      const publicDir = resolve(__dirname, 'public')
      
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true })
      }
      
      // 对于v0.10.0版本，文件名可能不同
      const toCopy = [
        { src: 'ffmpeg-core.js', dest: 'ffmpeg-core.js' },
        { src: 'ffmpeg-core.wasm', dest: 'ffmpeg-core.wasm' },
        // 旧版本没有worker.js文件
        { src: 'ffmpeg-core.worker.js', dest: 'ffmpeg-core.worker.js', optional: true }
      ]
      
      // 尝试从多个可能的位置复制文件
      const possiblePaths = [
        path.join(corePackagePath, 'dist'),
        path.join(corePackagePath, 'dist/umd'),
        path.join(corePackagePath, '') // 某些旧版本可能直接在根目录
      ]
      
      toCopy.forEach(file => {
        let copied = false
        
        // 尝试从所有可能的位置复制
        for (const basePath of possiblePaths) {
          const src = path.join(basePath, file.src)
          const dest = path.join(publicDir, file.dest)
          
          if (fs.existsSync(src)) {
            console.log(`📋 复制 ${file.src} 到 public 目录...`)
            fs.copyFileSync(src, dest)
            copied = true
            break
          }
        }
        
        if (!copied) {
          if (file.optional) {
            console.log(`ℹ️ 可选文件 ${file.src} 未找到，这对于旧版本FFmpeg是正常的`)
          } else {
            console.warn(`⚠️ 未找到FFmpeg核心文件: ${file.src}，可能导致加载问题`)
            // 检查是否已存在于public目录
            const dest = path.join(publicDir, file.dest)
            if (fs.existsSync(dest)) {
              console.log(`✅ ${file.dest} 已存在于public目录中`)
            } else {
              console.error(`❌ ${file.dest} 不存在于public目录中，视频处理功能可能无法正常工作`)
            }
          }
        } else {
          console.log(`✅ 成功复制 ${file.dest} 到public目录`)
        }
      })
    },
    configureServer(server) {
      console.log('🔧 配置开发服务器以支持FFmpeg...')
      
      // 确保CORS和SharedArrayBuffer支持
      server.middlewares.use((req, res, next) => {
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
        next()
      })
      
      // 监听文件变化，确保FFmpeg核心文件始终可用
      const publicDir = resolve(__dirname, 'public')
      const coreFiles = ['ffmpeg-core.js', 'ffmpeg-core.wasm', 'ffmpeg-core.worker.js']
      
      server.watcher.on('all', (event, filePath) => {
        if (event === 'unlink' || event === 'add') {
          const fileName = path.basename(filePath)
          if (coreFiles.includes(fileName)) {
            console.log(`🔄 检测到FFmpeg核心文件变化: ${fileName}，重新复制...`)
            this.buildStart()
          }
        }
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), copyFFmpegCore()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Credentials': 'true'
    },
    hmr: {
      // 解决WebSocket连接问题
      host: 'localhost',
      port: 5173,
      protocol: 'ws',
    },
    // 防止CORS错误
    cors: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // 解决ffmpeg.wasm跨域问题
    modulePreload: {
      polyfill: true,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          ffmpeg: ['@ffmpeg/ffmpeg', '@ffmpeg/core'],
        },
      },
    },
  },
  worker: {
    // 确保Worker文件能够正确加载
    format: 'es',
    plugins: [],
    rollupOptions: {
      output: {
        // 确保Worker文件在开发和生产环境都能正确加载
        format: 'es',
        entryFileNames: 'assets/[name].[hash].js',
      },
    },
  },
  optimizeDeps: {
    // 告诉Vite优化@ffmpeg相关的依赖
    include: ['@ffmpeg/ffmpeg'],
    // 排除@ffmpeg/core，因为它需要在运行时单独加载
    exclude: ['@ffmpeg/core'],
  },
})
