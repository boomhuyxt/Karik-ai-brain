const browserPlatformHelper = require('./browserPlatformHelper');

/**
 * Live Browser Session Service
 * Provides real-time interactive browser streaming via Chrome DevTools Protocol (CDP) Screencast.
 * Allows users to view, navigate, and log in to Facebook / TikTok directly inside the web UI.
 */
class LiveBrowserSessionService {
  constructor() {
    this.browser = null;
    this.page = null;
    this.cdpClient = null;
    this.currentPlatform = 'facebook';
    this.currentUrl = 'https://www.facebook.com/';
    this.lastFrameBase64 = null;
    this.listeners = new Set();
    this.isStarting = false;
    this.idleTimer = null;
    this.sessionWidth = 1280;
    this.sessionHeight = 720;
  }

  /**
   * Khởi động phiên trình duyệt tương tác với CDP Screencast
   */
  async startSession(options = {}) {
    const { platform = 'facebook', url = null, forceNew = false } = options;
    this.currentPlatform = platform;

    const targetUrl = url || (platform === 'tiktok' 
      ? 'https://www.tiktok.com/tiktokstudio/upload' 
      : 'https://www.facebook.com/');

    // Nếu page đã tồn tại và còn kết nối
    if (this.page && !this.page.isClosed() && !forceNew) {
      if (this.currentUrl !== targetUrl && url) {
        try {
          await this.page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
          this.currentUrl = this.page.url();
        } catch (err) {
          console.warn('[LiveBrowserSession] Navigation warning:', err.message);
        }
      }
      return {
        success: true,
        message: 'Đã kết nối vào phiên làm việc trình duyệt hiện tại.',
        currentUrl: this.currentUrl,
        platform: this.currentPlatform
      };
    }

    if (this.isStarting) {
      // Đang trong quá trình khởi tạo, chờ một chút
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 300));
        if (this.page && !this.page.isClosed()) {
          return { success: true, currentUrl: this.currentUrl, platform: this.currentPlatform };
        }
      }
    }

    this.isStarting = true;

    try {
      const puppeteer = await browserPlatformHelper.getPuppeteer();
      const executablePath = browserPlatformHelper.findBrowserExecutable();
      const userDataDir = browserPlatformHelper.getUserDataDir('ChromeSession');

      const launchResult = await browserPlatformHelper.launchOrReuseBrowser(puppeteer, {
        executablePath,
        userDataDir,
        headless: true
      });

      this.browser = launchResult.browser;

      const pages = await this.browser.pages();
      this.page = pages.length > 0 ? pages[pages.length - 1] : await this.browser.newPage();

      // Thiết lập Viewport và User Agent chuẩn Desktop
      await this.page.setViewport({ width: this.sessionWidth, height: this.sessionHeight });
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36');

      // Tắt webdriver flag để chống anti-bot
      try {
        await this.page.evaluateOnNewDocument(() => {
          Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });
      } catch (e) {}

      // Lắng nghe thay đổi URL
      this.page.on('framenavigated', (frame) => {
        if (frame === this.page.mainFrame()) {
          this.currentUrl = frame.url();
          this.broadcastEvent({ type: 'url_change', url: this.currentUrl });
        }
      });

      this.page.on('close', () => {
        this.cdpClient = null;
        this.page = null;
      });

      // Điều hướng đến URL mong muốn
      try {
        await this.page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
        this.currentUrl = this.page.url();
      } catch (navErr) {
        console.warn('[LiveBrowserSession] Initial page.goto timeout/warning:', navErr.message);
      }

      // Khởi động CDP Screencast
      await this._initScreencast();

      return {
        success: true,
        message: 'Khởi động phiên trình duyệt tương tác thành công!',
        currentUrl: this.currentUrl,
        platform: this.currentPlatform
      };
    } catch (err) {
      console.error('[LiveBrowserSession] startSession error:', err);
      return {
        success: false,
        message: 'Lỗi khởi chạy trình duyệt tương tác: ' + err.message
      };
    } finally {
      this.isStarting = false;
    }
  }

  /**
   * Khởi tạo Chrome DevTools Protocol Screencast
   * @private
   */
  async _initScreencast() {
    if (!this.page || this.page.isClosed()) return;

    try {
      if (this.cdpClient) {
        try {
          await this.cdpClient.send('Page.stopScreencast').catch(() => {});
        } catch (e) {}
      }

      this.cdpClient = await this.page.createCDPSession();

      await this.cdpClient.send('Page.startScreencast', {
        format: 'jpeg',
        quality: 68,
        maxWidth: this.sessionWidth,
        maxHeight: this.sessionHeight,
        everyNthFrame: 1
      });

      this.cdpClient.on('Page.screencastFrame', async ({ data, sessionId }) => {
        try {
          await this.cdpClient.send('Page.screencastFrameAck', { sessionId });
        } catch (e) {}

        this.lastFrameBase64 = data;
        this.broadcastFrame(data);
      });
    } catch (err) {
      console.error('[LiveBrowserSession] _initScreencast error:', err.message);
    }
  }

  /**
   * Gắn kết client Server-Sent Events (SSE) để truyền hình trực tiếp màn hình
   */
  addStreamClient(res) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Hỗ trợ NGINX reverse proxy không bị buffer
    });

    res.write(`data: ${JSON.stringify({ type: 'init', currentUrl: this.currentUrl, platform: this.currentPlatform })}\n\n`);

    if (this.lastFrameBase64) {
      res.write(`data: ${JSON.stringify({ type: 'frame', frame: this.lastFrameBase64, url: this.currentUrl })}\n\n`);
    }

    this.listeners.add(res);

    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    res.on('close', () => {
      this.listeners.delete(res);
      // Nếu không còn client nào xem trong 5 phút, tạm dừng screencast để tiết kiệm CPU
      if (this.listeners.size === 0) {
        this.idleTimer = setTimeout(() => {
          this._pauseScreencastIfIdle();
        }, 5 * 60 * 1000);
      }
    });
  }

  /**
   * Tạm dừng screencast nếu không có ai xem
   * @private
   */
  async _pauseScreencastIfIdle() {
    if (this.listeners.size === 0 && this.cdpClient) {
      try {
        await this.cdpClient.send('Page.stopScreencast').catch(() => {});
        this.cdpClient = null;
        console.log('[LiveBrowserSession] Paused screencast due to inactivity');
      } catch (e) {}
    }
  }

  /**
   * Phát khung hình đến toàn bộ client SSE
   */
  broadcastFrame(base64Data) {
    if (this.listeners.size === 0) return;
    const msg = `data: ${JSON.stringify({ type: 'frame', frame: base64Data, url: this.currentUrl })}\n\n`;
    for (const client of this.listeners) {
      try {
        client.write(msg);
      } catch (err) {
        this.listeners.delete(client);
      }
    }
  }

  /**
   * Phát thông điệp sự kiện tới client
   */
  broadcastEvent(eventObj) {
    if (this.listeners.size === 0) return;
    const msg = `data: ${JSON.stringify(eventObj)}\n\n`;
    for (const client of this.listeners) {
      try {
        client.write(msg);
      } catch (err) {
        this.listeners.delete(client);
      }
    }
  }

  /**
   * Xử lý tương tác từ người dùng (Click chuột, Gõ phím, Cuộn trang)
   */
  async handleInteraction(interaction = {}) {
    if (!this.page || this.page.isClosed()) {
      return { success: false, message: 'Chưa có phiên trình duyệt nào đang mở.' };
    }

    const { action, x, y, text, key, deltaY } = interaction;

    try {
      if (action === 'click') {
        const clampedX = Math.max(0, Math.min(this.sessionWidth, Math.round(Number(x) || 0)));
        const clampedY = Math.max(0, Math.min(this.sessionHeight, Math.round(Number(y) || 0)));
        await this.page.mouse.click(clampedX, clampedY);
      } else if (action === 'type') {
        if (text) {
          await this.page.keyboard.type(String(text), { delay: 15 });
        }
      } else if (action === 'press') {
        if (key) {
          await this.page.keyboard.press(key);
        }
      } else if (action === 'scroll') {
        await this.page.mouse.wheel({ deltaY: Number(deltaY) || 120 });
      }

      return { success: true, currentUrl: this.page.url() };
    } catch (err) {
      console.warn('[LiveBrowserSession] handleInteraction error:', err.message);
      return { success: false, message: err.message };
    }
  }

  /**
   * Tự động điền tài khoản & mật khẩu vào các form đăng nhập Facebook / TikTok
   */
  async autoFillCredentials(credentials = {}) {
    if (!this.page || this.page.isClosed()) {
      return { success: false, message: 'Chưa có phiên trình duyệt nào đang mở.' };
    }

    const { username, password } = credentials;
    if (!username || !password) {
      return { success: false, message: 'Vui lòng cung cấp tài khoản và mật khẩu.' };
    }

    try {
      const emailSelector = '#email, input[name="email"], input[type="email"], input[name="username"], input[name="account"]';
      const passSelector = '#pass, input[name="pass"], input[type="password"]';

      const emailEl = await this.page.$(emailSelector);
      const passEl = await this.page.$(passSelector);

      if (emailEl && passEl) {
        await emailEl.click({ clickCount: 3 }).catch(() => {});
        await emailEl.press('Backspace').catch(() => {});
        await emailEl.type(username, { delay: 35 });

        await passEl.click({ clickCount: 3 }).catch(() => {});
        await passEl.press('Backspace').catch(() => {});
        await passEl.type(password, { delay: 35 });

        // Tìm nút đăng nhập và click
        const loginBtn = await this.page.$('button[name="login"], button[type="submit"], input[type="submit"]');
        if (loginBtn) {
          await loginBtn.click().catch(() => {});
        }

        return { success: true, message: 'Đã tự động điền tài khoản và gửi yêu cầu đăng nhập!' };
      }

      return { success: false, message: 'Không tìm thấy ô nhập tài khoản/mật khẩu trên trang hiện tại.' };
    } catch (err) {
      return { success: false, message: 'Lỗi tự động điền: ' + err.message };
    }
  }

  /**
   * Tự động dán Caption sản phẩm vào ô tạo bài viết
   */
  async autoPasteCaption(captionText = '') {
    if (!this.page || this.page.isClosed()) {
      return { success: false, message: 'Chưa có phiên trình duyệt nào đang mở.' };
    }

    if (!captionText) {
      return { success: false, message: 'Chưa có nội dung Caption để dán.' };
    }

    try {
      // Tìm các ô nhập bài viết phổ biến trên Facebook hoặc TikTok Studio
      const postBoxSelectors = [
        'div[role="textbox"]',
        'div[contenteditable="true"]',
        'textarea[placeholder*="đang nghĩ gì"]',
        'textarea[placeholder*="bạn đang nghĩ gì"]',
        'div[aria-label*="bạn đang nghĩ gì"]',
        '.DraftEditor-root',
        'textarea'
      ];

      let targetBox = null;
      for (const sel of postBoxSelectors) {
        targetBox = await this.page.$(sel);
        if (targetBox) break;
      }

      if (targetBox) {
        await targetBox.click();
        await new Promise(r => setTimeout(r, 200));

        // Nhập nội dung
        await this.page.keyboard.type(captionText, { delay: 10 });

        return { success: true, message: 'Đã tự động dán nội dung Caption vào ô tạo bài viết!' };
      }

      return {
        success: false,
        message: 'Chưa mở khung tạo bài viết. Hãy bấm vào "Tạo bài viết" trên giao diện Facebook/TikTok rồi thử lại!'
      };
    } catch (err) {
      return { success: false, message: 'Lỗi dán bài: ' + err.message };
    }
  }

  /**
   * Mở cửa sổ Google Chrome desktop thực tế (không ẩn) trên máy tính người dùng
   */
  async launchDesktopChrome(options = {}) {
    const { platform = 'facebook' } = options;
    const targetUrl = platform === 'tiktok' 
      ? 'https://www.tiktok.com/tiktokstudio/upload' 
      : 'https://www.facebook.com/';

    try {
      const puppeteer = await browserPlatformHelper.getPuppeteer();
      const executablePath = browserPlatformHelper.findBrowserExecutable();
      const userDataDir = browserPlatformHelper.getUserDataDir('ChromeSession');

      // Khởi chạy với headless: false
      const { browser } = await browserPlatformHelper.launchOrReuseBrowser(puppeteer, {
        executablePath,
        userDataDir,
        headless: false
      });

      const pages = await browser.pages();
      const page = pages.length > 0 ? pages[pages.length - 1] : await browser.newPage();
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });

      return {
        success: true,
        message: `Đã mở cửa sổ Chrome desktop độc lập truy cập ${platform.toUpperCase()}! Bạn có thể đăng nhập tài khoản trực tiếp tại đây.`
      };
    } catch (err) {
      return {
        success: false,
        message: 'Lỗi mở cửa sổ Chrome desktop: ' + err.message
      };
    }
  }

  /**
   * Điều hướng tới một URL mới
   */
  async navigate(targetUrl) {
    if (!this.page || this.page.isClosed()) {
      return this.startSession({ url: targetUrl });
    }

    try {
      await this.page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
      this.currentUrl = this.page.url();
      return { success: true, currentUrl: this.currentUrl };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  /**
   * Tạm dừng session khi đóng modal
   */
  async stopSession() {
    if (this.cdpClient) {
      try {
        await this.cdpClient.send('Page.stopScreencast').catch(() => {});
      } catch (e) {}
      this.cdpClient = null;
    }
    return { success: true, message: 'Đã tạm dừng phát luồng trình duyệt.' };
  }
}

module.exports = new LiveBrowserSessionService();
