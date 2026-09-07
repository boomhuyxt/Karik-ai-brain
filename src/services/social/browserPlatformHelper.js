const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

/**
 * Cross-platform Browser Bot Platform Helper
 * Supports Windows, macOS, and Linux for automated social posting
 */
class BrowserPlatformHelper {
  /**
   * Helper nạp Puppeteer-Core bằng Dynamic Import (Hỗ trợ thuần ECMAScript Module)
   */
  async getPuppeteer() {
    const puppeteerModule = await import('puppeteer-core');
    return puppeteerModule.default || puppeteerModule;
  }

  /**
   * Tự động dò tìm đường dẫn thực thi của trình duyệt (Chrome, Chromium, Edge, Brave)
   * trên Windows, macOS và Linux. Hỗ trợ biến môi trường CHROME_PATH / CHROME_BIN / PUPPETEER_EXECUTABLE_PATH.
   */
  findBrowserExecutable(customPlatform = process.platform) {
    // 1. Kiểm tra biến môi trường người dùng thiết lập ưu tiên cao nhất
    const envPath = process.env.CHROME_BIN || process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH;
    if (envPath && fs.existsSync(envPath)) {
      return envPath;
    }

    const home = os.homedir();
    const candidatePaths = [];

    if (customPlatform === 'darwin') {
      // macOS candidates
      candidatePaths.push(
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        path.join(home, 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        path.join(home, 'Applications/Chromium.app/Contents/MacOS/Chromium'),
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
        path.join(home, 'Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'),
        '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
        path.join(home, 'Applications/Brave Browser.app/Contents/MacOS/Brave Browser')
      );
    } else if (customPlatform === 'linux') {
      // Linux candidates
      candidatePaths.push(
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/snap/bin/chromium',
        '/snap/bin/google-chrome',
        '/usr/bin/microsoft-edge',
        '/usr/bin/microsoft-edge-stable',
        '/usr/bin/brave-browser',
        '/usr/local/bin/google-chrome',
        '/usr/local/bin/chromium'
      );
    } else {
      // Windows (win32) candidates
      const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
      const programFiles = process.env.PROGRAMFILES || 'C:\\Program Files';
      const programFilesX86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';

      candidatePaths.push(
        path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        path.join(localAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        path.join(programFiles, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
        path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
        // Backward compatibility hardcoded fallbacks
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        path.join(home, 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'),
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
      );
    }

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    // Fallback trên Linux: Thử tìm qua lệnh `which` nếu không thấy ở đường dẫn thông dụng
    if (customPlatform === 'linux') {
      const binaries = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge-stable'];
      for (const bin of binaries) {
        try {
          const stdout = execSync(`which ${bin}`, { stdio: ['pipe', 'pipe', 'ignore'], encoding: 'utf8' }).trim();
          if (stdout && fs.existsSync(stdout)) {
            return stdout;
          }
        } catch (e) {}
      }
    }

    return null;
  }

  /**
   * Lấy thư mục profile session người dùng chuẩn hóa theo hệ điều hành (Windows, macOS, Linux)
   */
  getUserDataDir(sessionName = 'ChromeSession', customPlatform = process.platform) {
    const home = os.homedir();
    let baseDir;

    if (customPlatform === 'darwin') {
      baseDir = path.join(home, 'Library', 'Application Support', 'KarikAIBrain');
    } else if (customPlatform === 'linux') {
      const xdgConfig = process.env.XDG_CONFIG_HOME || path.join(home, '.config');
      baseDir = path.join(xdgConfig, 'karik-ai-brain');
    } else {
      // Windows
      const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
      baseDir = path.join(localAppData, 'KarikAIBrain');
    }

    const sessionDir = path.join(baseDir, sessionName);
    if (!fs.existsSync(sessionDir)) {
      try {
        fs.mkdirSync(sessionDir, { recursive: true });
      } catch (err) {
        // Fallback thư mục tạm nếu quyền ghi bị hạn chế
        const tempFallback = path.join(os.tmpdir(), 'KarikAIBrain', sessionName);
        if (!fs.existsSync(tempFallback)) {
          fs.mkdirSync(tempFallback, { recursive: true });
        }
        return tempFallback;
      }
    }
    return sessionDir;
  }

  /**
   * Lấy phím bổ trợ bàn phím (Modifier Key):
   * macOS dùng 'Meta' (Command ⌘), Windows/Linux dùng 'Control' (Ctrl)
   */
  getKeyboardModifier(customPlatform = process.platform) {
    return customPlatform === 'darwin' ? 'Meta' : 'Control';
  }

  /**
   * Lấy tên hiển thị phím tắt cho giao diện log người dùng (VD: "Cmd+V" trên Mac, "Ctrl+V" trên Win/Linux)
   */
  getModifierLabel(customPlatform = process.platform) {
    return customPlatform === 'darwin' ? 'Cmd' : 'Ctrl';
  }

  /**
   * Tạo danh sách tham số khởi chạy trình duyệt tối ưu cho từng hệ điều hành
   */
  getLaunchArgs(options = {}) {
    const { debuggingPort = 9222, customPlatform = process.platform } = options;
    const args = [
      `--remote-debugging-port=${debuggingPort}`,
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--disable-dev-shm-usage' // Tối ưu tài nguyên shared memory trên Linux & Docker
    ];

    if (customPlatform === 'darwin') {
      // Chromium trên macOS thường bỏ qua --start-maximized, cần thêm kích thước cửa sổ chuẩn
      args.push('--window-size=1440,900');
    } else {
      args.push('--start-maximized');
    }

    // Nếu chạy trên Linux không có GUI display (Headless VPS/Docker)
    if (customPlatform === 'linux' && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
      args.push('--disable-gpu');
    }

    return args;
  }

  /**
   * Kiểm tra xem môi trường hiện tại có cần chạy headless bắt buộc không (VD: Linux server không có X11)
   */
  isHeadlessRequired(customPlatform = process.platform) {
    if (process.env.PUPPETEER_HEADLESS === 'true') return true;
    if (customPlatform === 'linux' && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
      return true;
    }
    return false;
  }

  /**
   * Chuẩn bị file media tạm ra ổ cứng để trình duyệt upload
   */
  async prepareLocalMediaFile(mediaUrl, prefix = 'upload') {
    if (!mediaUrl) return null;
    const tempDir = path.join(os.tmpdir(), 'aikarik_social_uploads');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const isVideo = typeof mediaUrl === 'string' && (mediaUrl.endsWith('.mp4') || mediaUrl.endsWith('.webm') || mediaUrl.endsWith('.mov'));
    const isSvg = typeof mediaUrl === 'string' && mediaUrl.startsWith('data:image/svg');
    const ext = isVideo ? '.mp4' : (isSvg ? '.svg' : '.png');
    const localFilePath = path.join(tempDir, `${prefix}_${Date.now()}${ext}`);

    // 1. Base64 DataURL (Xuất trực tiếp từ Karik Studio Canvas)
    if (typeof mediaUrl === 'string' && mediaUrl.startsWith('data:')) {
      const cleanBase64 = mediaUrl.replace(/^data:[^;]+;base64,/, '');
      fs.writeFileSync(localFilePath, Buffer.from(cleanBase64, 'base64'));
      return localFilePath;
    }

    // 2. Relative upload path (e.g. /uploads/filename.png)
    if (typeof mediaUrl === 'string' && mediaUrl.startsWith('/uploads/')) {
      const publicUploads = path.join(__dirname, '../../../public', mediaUrl);
      if (fs.existsSync(publicUploads)) return publicUploads;

      try {
        const { uploadsPath } = require('../../storage');
        const directUpload = path.join(uploadsPath, path.basename(mediaUrl));
        if (fs.existsSync(directUpload)) return directUpload;
      } catch (e) {}
    }

    // 3. Remote URL (http / https)
    if (typeof mediaUrl === 'string' && (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://'))) {
      try {
        const res = await fetch(mediaUrl);
        const buffer = await res.arrayBuffer();
        fs.writeFileSync(localFilePath, Buffer.from(buffer));
        return localFilePath;
      } catch (e) {
        console.warn(`[BrowserPlatformHelper] Failed to download remote media:`, e.message);
      }
    }

    // 4. Direct absolute/relative file path
    if (typeof mediaUrl === 'string' && fs.existsSync(mediaUrl)) {
      return mediaUrl;
    }

    return null;
  }

  /**
   * Khởi chạy hoặc tái sử dụng trình duyệt Chrome đang mở sẵn qua Remote Debugging Port
   */
  async launchOrReuseBrowser(puppeteer, { executablePath, userDataDir, fallbackSessionName = 'FallbackSession', addLog = console.log }) {
    const debuggingPort = 9222;
    const debuggingUrl = `http://127.0.0.1:${debuggingPort}`;

    // 1. Thử kết nối vào trình duyệt đang mở sẵn qua Remote Debugging Port
    try {
      const browser = await puppeteer.connect({ browserURL: debuggingUrl, defaultViewport: null });
      addLog('✅ Đã kết nối vào cửa sổ trình duyệt đang mở!');
      return { browser, isReused: true };
    } catch (e) {
      // Không có instance mở với port này, tiếp tục launch mới
    }

    const launchArgs = this.getLaunchArgs({ debuggingPort });
    const isHeadless = this.isHeadlessRequired();

    if (isHeadless) {
      addLog('ℹ️ Môi trường không phát hiện màn hình đồ họa (hoặc cấu hình PUPPETEER_HEADLESS=true), chạy ở chế độ headless...');
    }

    try {
      const browser = await puppeteer.launch({
        executablePath,
        userDataDir,
        headless: isHeadless ? 'new' : false,
        defaultViewport: null,
        args: launchArgs
      });
      return { browser, isReused: false };
    } catch (launchErr) {
      if (launchErr.message && (launchErr.message.includes('already running') || launchErr.message.includes('EBUSY') || launchErr.message.includes('locked'))) {
        addLog('⚠️ Phát hiện trình duyệt đang chạy hoặc file lock chưa được giải phóng. Đang tự động dọn dẹp và kết nối lại...');

        // Thử kết nối lại qua port
        try {
          const browser = await puppeteer.connect({ browserURL: debuggingUrl, defaultViewport: null });
          addLog('✅ Đã kết nối thành công vào trình duyệt!');
          return { browser, isReused: true };
        } catch (connErr) {}

        // Dọn dẹp lock files trong thư mục session
        const lockFiles = ['SingletonLock', 'SingletonSocket', 'SingletonCookie', 'lockfile'];
        for (const f of lockFiles) {
          try {
            const p = path.join(userDataDir, f);
            if (fs.existsSync(p)) fs.unlinkSync(p);
          } catch (delErr) {}
        }

        // Chờ 800ms
        await new Promise(r => setTimeout(r, 800));

        try {
          const browser = await puppeteer.launch({
            executablePath,
            userDataDir,
            headless: isHeadless ? 'new' : false,
            defaultViewport: null,
            args: launchArgs
          });
          return { browser, isReused: false };
        } catch (retryErr) {
          // Fallback an toàn: Dùng sub-profile để luôn đảm bảo mở được trình duyệt
          addLog('ℹ️ Tạo phiên làm việc mới an toàn để tránh xung đột file lock...');
          const fallbackDir = this.getUserDataDir(fallbackSessionName);

          const fallbackArgs = this.getLaunchArgs({ debuggingPort }).filter(a => !a.startsWith('--remote-debugging-port'));
          const browser = await puppeteer.launch({
            executablePath,
            userDataDir: fallbackDir,
            headless: isHeadless ? 'new' : false,
            defaultViewport: null,
            args: fallbackArgs
          });
          return { browser, isReused: false };
        }
      }

      throw launchErr;
    }
  }
}

module.exports = new BrowserPlatformHelper();
