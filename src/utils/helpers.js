// 格式化时间（秒 -> HH:MM:SS.mmm）
export function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

// 解析时间（HH:MM:SS.mmm -> 秒）
export function parseTime(timeStr) {
  const parts = timeStr.split(':');
  const seconds = parseFloat(parts[parts.length - 1]);
  const minutes = parts.length > 1 ? parseInt(parts[parts.length - 2]) : 0;
  const hours = parts.length > 2 ? parseInt(parts[parts.length - 3]) : 0;
  
  return hours * 3600 + minutes * 60 + seconds;
}

// 下载文件
export function downloadFile(data, filename, mimeType) {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  
  document.body.appendChild(a);
  a.click();
  
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// 获取文件扩展名
export function getFileExtension(filename) {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
}

// 获取不带扩展名的文件名
export function getFilenameWithoutExtension(filename) {
  return filename.slice(0, filename.lastIndexOf('.'));
}

// 生成随机ID
export function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

// 格式化文件大小
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
} 