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
   * Tra cứu đường dẫn trình duyệt trong Windows Registry (HKLM & HKCU App Paths)
   * @private
   */
  _findInWindowsRegistry(appName) {
    if (process.platform !== 'win32') return null;
    const hives = ['HKLM', 'HKCU'];
    for (const hive of hives) {
      try {
        const cmd = `reg query "${hive}\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\${appName}" /ve`;
        const stdout = execSync(cmd, { stdio: ['pipe', 'pipe', 'ignore'], encoding: 'utf8' });
        const match = stdout.match(/REG_SZ\s+(.+)$/m);
        if (match && match[1]) {
          const regPath = match[1].trim();
          if (fs.existsSync(regPath)) {
            return regPath;
          }
        }
      } catch (e) {}
    }
    return null;
  }

  /**
   * Tự động dò tìm đường dẫn thực thi của trình duyệt (Chrome, Chromium, Edge, Brave, Cốc Cốc, Opera)
   * trên Windows, macOS và Linux. Hỗ trợ biến môi trường CHROME_PATH / CHROME_BIN / PUPPETEER_EXECUTABLE_PATH
   * hoặc đường dẫn do người dùng truyền vào trực tiếp.
   */
  findBrowserExecutable(customPlatform = process.platform, explicitPath = null) {
    // 0. Kiểm tra nếu có đường dẫn do caller truyền vào trực tiếp
    if (explicitPath && typeof explicitPath === 'string' && fs.existsSync(explicitPath)) {
      return explicitPath;
    }

    // 1. Kiểm tra biến môi trường người dùng thiết lập ưu tiên cao nhất
    const envPath = process.env.CHROME_BIN || process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH;
    if (envPath && fs.existsSync(envPath)) {
      return envPath;
    }

    const home = os.homedir();
    const candidatePaths = [];

    if (customPlatform === 'darwin') {
      // macOS candidates (Google Chrome, Chromium, Edge, Brave, Arc, Cốc Cốc, Opera, Vivaldi)
      candidatePaths.push(
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        path.join(home, 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
        '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
        path.join(home, 'Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary'),
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        path.join(home, 'Applications/Chromium.app/Contents/MacOS/Chromium'),
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
        path.join(home, 'Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'),
        '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
        path.join(home, 'Applications/Brave Browser.app/Contents/MacOS/Brave Browser'),
        '/Applications/Arc.app/Contents/MacOS/Arc',
        path.join(home, 'Applications/Arc.app/Contents/MacOS/Arc'),
        '/Applications/CocCoc.app/Contents/MacOS/CocCoc',
        path.join(home, 'Applications/CocCoc.app/Contents/MacOS/CocCoc'),
        '/Applications/Opera.app/Contents/MacOS/Opera',
        path.join(home, 'Applications/Opera.app/Contents/MacOS/Opera'),
        '/Applications/Vivaldi.app/Contents/MacOS/Vivaldi',
        path.join(home, 'Applications/Vivaldi.app/Contents/MacOS/Vivaldi')
      );

      for (const p of candidatePaths) {
        if (fs.existsSync(p)) return p;
      }

      // Spotlight search fallback trên macOS
      try {
        const spotLightOut = execSync('mdfind "kMDItemCFBundleIdentifier == \'com.google.Chrome\'"', { stdio: ['pipe', 'pipe', 'ignore'], encoding: 'utf8' }).trim();
        if (spotLightOut) {
          const firstApp = spotLightOut.split('\n')[0].trim();
          const binary = path.join(firstApp, 'Contents/MacOS/Google Chrome');
          if (fs.existsSync(binary)) return binary;
        }
      } catch (e) {}

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
        '/usr/local/bin/chromium',
        '/opt/google/chrome/chrome',
        '/opt/google/chrome/google-chrome',
        '/opt/microsoft/msedge/msedge',
        '/var/lib/flatpak/exports/bin/com.google.Chrome',
        '/var/lib/flatpak/exports/bin/org.chromium.Chromium',
        path.join(home, '.local/share/flatpak/exports/bin/com.google.Chrome'),
        path.join(home, '.local/share/flatpak/exports/bin/org.chromium.Chromium')
      );

      // Nếu đang chạy trong môi trường WSL trên Windows
      try {
        const isWSL = fs.existsSync('/proc/version') && fs.readFileSync('/proc/version', 'utf8').toLowerCase().includes('microsoft');
        if (isWSL) {
          candidatePaths.push(
            '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe',
            '/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe',
            '/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
            '/mnt/c/Program Files/Microsoft/Edge/Application/msedge.exe',
            '/mnt/c/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe'
          );
        }
      } catch (e) {}

      for (const p of candidatePaths) {
        if (fs.existsSync(p)) return p;
      }

      // CLI command locator fallback trên Linux (command -v, which, whereis)
      const binaries = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge-stable', 'microsoft-edge', 'brave-browser'];
      for (const bin of binaries) {
        try {
          const stdout = execSync(`command -v ${bin} || which ${bin}`, { stdio: ['pipe', 'pipe', 'ignore'], encoding: 'utf8' }).trim();
          if (stdout && fs.existsSync(stdout)) {
            return stdout;
          }
        } catch (e) {}
      }

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
        // Cốc Cốc (Browser phổ biến tại Việt Nam)
        path.join(programFiles, 'CocCoc', 'Browser', 'Application', 'browser.exe'),
        path.join(programFilesX86, 'CocCoc', 'Browser', 'Application', 'browser.exe'),
        path.join(localAppData, 'CocCoc', 'Browser', 'Application', 'browser.exe'),
        // Chromium & Opera
        path.join(localAppData, 'Chromium', 'Application', 'chrome.exe'),
        path.join(localAppData, 'Programs', 'Opera', 'launcher.exe'),
        path.join(localAppData, 'Programs', 'Opera GX', 'launcher.exe'),
        // Backward compatibility hardcoded fallbacks
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        path.join(home, 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'),
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
      );

      for (const p of candidatePaths) {
        if (fs.existsSync(p)) return p;
      }

      // Windows Registry fallback (tìm chính xác kể cả cài ở ổ D, E...)
      const regBrowsers = ['chrome.exe', 'msedge.exe', 'brave.exe', 'browser.exe'];
      for (const bin of regBrowsers) {
        const foundReg = this._findInWindowsRegistry(bin);
        if (foundReg) return foundReg;
      }

      // where.exe CLI search fallback trên Windows
      for (const bin of ['chrome', 'msedge', 'brave']) {
        try {
          const stdout = execSync(`where.exe ${bin}`, { stdio: ['pipe', 'pipe', 'ignore'], encoding: 'utf8' }).trim();
          const firstLine = stdout.split('\r\n')[0].split('\n')[0].trim();
          if (firstLine && fs.existsSync(firstLine)) return firstLine;
        } catch (e) {}
      }
    }

    return null;
  }

  /**
   * Tạo thông báo hướng dẫn chi tiết khi không tìm thấy trình duyệt
   */
  getBrowserNotFoundHelp(customPlatform = process.platform) {
    if (customPlatform === 'darwin') {
      return 'Không tìm thấy trình duyệt Chromium (Google Chrome, Microsoft Edge, Brave, Cốc Cốc, Arc) trên máy Mac của bạn.\n' +
        '👉 Hướng dẫn khắc phục:\n' +
        '1. Cài đặt Google Chrome từ: https://www.google.com/chrome/ (hoặc chạy lệnh: brew install --cask google-chrome)\n' +
        '2. Hoặc cấu hình biến CHROME_PATH trong file .env (VD: CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")';
    } else if (customPlatform === 'linux') {
      return 'Không tìm thấy trình duyệt Chromium (Google Chrome, Chromium, Edge, Brave) trên hệ điều hành Linux/VPS của bạn.\n' +
        '👉 Hướng dẫn khắc phục:\n' +
        '1. Cài đặt trình duyệt qua Terminal:\n' +
        '   - Ubuntu/Debian: sudo apt update && sudo apt install -y chromium-browser (hoặc google-chrome-stable)\n' +
        '   - Fedora: sudo dnf install -y chromium\n' +
        '   - Arch Linux: sudo pacman -S chromium\n' +
        '2. Hoặc cấu hình biến CHROME_PATH trong file .env (VD: CHROME_PATH="/usr/bin/chromium-browser")';
    } else {
      return 'Không tìm thấy trình duyệt Google Chrome, Edge, Brave hoặc Cốc Cốc trên máy tính Windows của bạn.\n' +
        '👉 Hướng dẫn khắc phục:\n' +
        '1. Cài đặt Google Chrome từ: https://www.google.com/chrome/ hoặc Microsoft Edge.\n' +
        '2. Nếu bạn cài Chrome ở ổ đĩa tùy biến (D:\\, E:\\), hãy thêm CHROME_PATH vào file .env (VD: CHROME_PATH="D:\\Chrome\\chrome.exe")';
    }
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
   * Nạp chuỗi Cookie (từ giao diện người dùng hoặc .env) vào phiên làm việc của Puppeteer
   */
  async injectCookieString(page, cookieString, platform = 'facebook') {
    if (!cookieString || typeof cookieString !== 'string') return false;
    const domain = platform === 'facebook' ? '.facebook.com' : '.tiktok.com';
    const rawPairs = cookieString.split(';');
    const cookies = [];

    for (const pair of rawPairs) {
      const idx = pair.indexOf('=');
      if (idx === -1) continue;
      const name = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      if (!name || !value) continue;

      cookies.push({
        name,
        value,
        domain,
        path: '/',
        secure: true,
        httpOnly: false
      });
    }

    if (cookies.length > 0) {
      try {
        await page.setCookie(...cookies);
        return true;
      } catch (err) {
        console.warn(`[BrowserPlatformHelper] Lỗi nạp cookie:`, err.message);
      }
    }
    return false;
  }

  /**
   * Khởi chạy hoặc tái sử dụng trình duyệt Chrome đang mở sẵn qua Remote Debugging Port
   */
  async launchOrReuseBrowser(puppeteer, { executablePath, userDataDir, fallbackSessionName = 'FallbackSession', addLog = console.log, headless = null }) {
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
    const isHeadless = headless !== null ? Boolean(headless) : this.isHeadlessRequired();

    if (isHeadless) {
      addLog('ℹ️ Đang chạy ở chế độ ngầm (Headless Mode - hoàn toàn không hiển thị cửa sổ Chrome)...');
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
