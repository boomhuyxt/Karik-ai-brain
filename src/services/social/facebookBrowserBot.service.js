const fs = require('fs');
const path = require('path');
const os = require('os');

class FacebookBrowserBotService {
  /**
   * Helper nạp Puppeteer-Core bằng Dynamic Import (Hỗ trợ thuần ECMAScript Module)
   */
  async getPuppeteer() {
    const puppeteerModule = await import('puppeteer-core');
    return puppeteerModule.default || puppeteerModule;
  }

  /**
   * Tự động dò tìm đường dẫn Chrome hoặc Edge trên máy tính Windows
   */
  findBrowserExecutable() {
    const candidatePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'),
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
    return null;
  }

  /**
   * Đường dẫn thư mục Profile người dùng (để giữ phiên đăng nhập Facebook có sẵn)
   */
  getUserDataDir() {
    const customDir = path.join(os.homedir(), 'AppData\\Local\\KarikAIBrain\\ChromeSession');
    if (!fs.existsSync(customDir)) {
      fs.mkdirSync(customDir, { recursive: true });
    }
    return customDir;
  }

  /**
   * Tải / Lưu file media tạm ra ổ cứng để trình duyệt upload
   */
  async prepareLocalMediaFile(mediaUrl) {
    if (!mediaUrl) return null;
    const tempDir = path.join(os.tmpdir(), 'aikarik_social_uploads');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const isVideo = mediaUrl.endsWith('.mp4');
    const isSvg = mediaUrl.startsWith('data:image/svg');
    const ext = isVideo ? '.mp4' : (isSvg ? '.svg' : '.png');
    const localFilePath = path.join(tempDir, `fb_upload_${Date.now()}${ext}`);

    if (mediaUrl.startsWith('data:image/')) {
      const base64Data = mediaUrl.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync(localFilePath, Buffer.from(base64Data, 'base64'));
      return localFilePath;
    }

    if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
      try {
        const res = await fetch(mediaUrl);
        const buffer = await res.arrayBuffer();
        fs.writeFileSync(localFilePath, Buffer.from(buffer));
        return localFilePath;
      } catch (e) {
        console.warn('[FacebookBrowserBot] Failed to download remote media:', e.message);
      }
    }

    if (fs.existsSync(mediaUrl)) {
      return mediaUrl;
    }

    return null;
  }

  /**
   * Tự động khởi chạy trình duyệt & đăng bài lên Facebook
   * @param {Object} options { caption, hashtags, mediaUrls, autoClickPost }
   */
  async runFacebookAutoPost({ caption = '', hashtags = [], mediaUrls = [], autoClickPost = true }) {
    const logs = [];
    const addLog = (msg) => {
      console.log(`[FB-Browser-Bot] ${msg}`);
      logs.push(`[${new Date().toLocaleTimeString('vi-VN')}] ${msg}`);
    };

    const executablePath = this.findBrowserExecutable();
    if (!executablePath) {
      throw new Error('Không tìm thấy trình duyệt Google Chrome hoặc Edge trên máy tính của bạn.');
    }

    addLog(`Đã tìm thấy trình duyệt: ${path.basename(executablePath)}`);
    const userDataDir = this.getUserDataDir();

    // Ghép Caption + Hashtags
    let fullText = caption ? caption.trim() : '';
    if (Array.isArray(hashtags) && hashtags.length > 0) {
      const tagStr = hashtags.map(t => (t.startsWith('#') ? t : `#${t}`)).join(' ');
      fullText = fullText ? `${fullText}\n\n${tagStr}` : tagStr;
    }

    // Chuẩn bị file ảnh/video nếu có
    const localMediaFile = mediaUrls && mediaUrls[0] ? await this.prepareLocalMediaFile(mediaUrls[0]) : null;
    if (localMediaFile) {
      addLog(`Đã chuẩn bị file đính kèm: ${path.basename(localMediaFile)}`);
    }

    addLog('Đang khởi chạy trình duyệt Chrome trong chế độ giao diện thực tế...');

    let browser = null;
    try {
      const puppeteer = await this.getPuppeteer();

      browser = await puppeteer.launch({
        executablePath,
        userDataDir,
        headless: false, // Mở cửa sổ trực tiếp để người dùng xem bot thao tác
        defaultViewport: null,
        args: [
          '--start-maximized',
          '--disable-blink-features=AutomationControlled',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-infobars'
        ]
      });

      const pages = await browser.pages();
      const page = pages.length > 0 ? pages[0] : await browser.newPage();

      addLog('Đang truy cập https://www.facebook.com/...');
      await page.goto('https://www.facebook.com/', { waitUntil: 'networkidle2', timeout: 45000 });

      // Chờ trang tải hoàn chỉnh
      await new Promise(r => setTimeout(r, 2500));

      // Kiểm tra xem có đang ở trang login không
      const isLoginPage = await page.evaluate(() => {
        return Boolean(document.querySelector('#email') || document.querySelector('input[name="email"]') || document.querySelector('button[name="login"]'));
      });

      if (isLoginPage) {
        addLog('⚠️ Phát hiện chưa đăng nhập Facebook trên phiên trình duyệt của Bot.');
        return {
          success: false,
          requiresLogin: true,
          message: 'Trình duyệt đã mở. Vui lòng đăng nhập tài khoản Facebook của bạn để Bot tự động lưu phiên và thực hiện đăng bài!',
          logs
        };
      }

      addLog('Đã vào trang chủ Facebook. Đang tìm khung tạo bài viết ("Bạn đang nghĩ gì thế?")...');

      // Tìm và bấm vào khung tạo bài viết
      const composerOpened = await page.evaluate(() => {
        // Tìm các selector phổ biến của ô tạo bài viết Facebook
        const selectors = [
          'div[role="button"][tabindex="0"] span',
          'div[aria-label*="Tạo bài viết"]',
          'div[aria-label*="Create a post"]',
          'span[dir="auto"]'
        ];

        for (const s of selectors) {
          const elements = Array.from(document.querySelectorAll(s));
          const match = elements.find(el => {
            const txt = (el.textContent || el.innerText || '').toLowerCase();
            return txt.includes('bạn đang nghĩ gì') || txt.includes("what's on your mind") || txt.includes('tạo bài viết');
          });
          if (match) {
            const btn = match.closest('div[role="button"]') || match;
            btn.click();
            return true;
          }
        }
        return false;
      });

      if (!composerOpened) {
        // Fallback: Thử bấm trực tiếp vào vùng soạn thảo
        await page.mouse.click(600, 200);
      }

      addLog('Đang mở khung soạn thảo bài viết...');
      await new Promise(r => setTimeout(r, 2000));

      // Tìm ô textbox contenteditable để gõ nội dung
      addLog('Đang nhập nội dung bài viết và hashtags...');
      const typed = await page.evaluate((textToType) => {
        const textbox = document.querySelector('div[role="textbox"][contenteditable="true"]') ||
          document.querySelector('div[aria-label*="Bạn đang nghĩ gì"][contenteditable="true"]') ||
          document.querySelector('div[aria-label*="What\'s on your mind"][contenteditable="true"]');
        if (textbox) {
          textbox.focus();
          // Chèn nội dung
          document.execCommand('insertText', false, textToType);
          return true;
        }
        return false;
      }, fullText);

      if (!typed) {
        // Thử dùng Puppeteer keyboard
        await page.keyboard.type(fullText, { delay: 10 });
      }

      addLog('Đã điền nội dung Caption & Hashtags thành công!');
      await new Promise(r => setTimeout(r, 1500));

      // Đính kèm file ảnh / video nếu có
      if (localMediaFile) {
        addLog('Đang tải file hình ảnh/video vào bài đăng...');
        const fileInputs = await page.$$('input[type="file"]');
        let fileUploaded = false;

        for (const input of fileInputs) {
          try {
            await input.uploadFile(localMediaFile);
            fileUploaded = true;
            break;
          } catch (e) { }
        }

        if (!fileUploaded) {
          // Thử bấm nút Ảnh/Video trên thanh công cụ
          await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('div[aria-label*="Ảnh/video"], div[aria-label*="Photo/video"]'));
            if (buttons.length > 0) buttons[0].click();
          });
          await new Promise(r => setTimeout(r, 1000));
          const lateInput = await page.$('input[type="file"]');
          if (lateInput) {
            await lateInput.uploadFile(localMediaFile);
          }
        }
        addLog('Đã đính kèm hình ảnh vào bài viết!');
        await new Promise(r => setTimeout(r, 2500));
      }

      // Bấm nút Đăng bài nếu autoClickPost = true
      if (autoClickPost) {
        addLog('Đang kích hoạt nút "Đăng" (Post)...');
        const posted = await page.evaluate(() => {
          const postBtn = document.querySelector('div[aria-label="Đăng"][role="button"]') ||
            document.querySelector('div[aria-label="Post"][role="button"]') ||
            Array.from(document.querySelectorAll('div[role="button"]')).find(b => {
              const t = (b.textContent || '').trim().toLowerCase();
              return t === 'đăng' || t === 'post' || t === 'tiếp';
            });
          if (postBtn && !postBtn.getAttribute('aria-disabled')) {
            postBtn.click();
            return true;
          }
          return false;
        });

        if (posted) {
          addLog('🎉 ĐÃ BẤM NÚT ĐĂNG BÀI THÀNH CÔNG!');
          await new Promise(r => setTimeout(r, 4000));
        } else {
          addLog('⚠️ Khung bài viết đã được điền đầy đủ. Bạn có thể nhấn nút "Đăng" trên trình duyệt.');
        }
      } else {
        addLog('ℹ️ Đã nạp sẵn bài viết vào Facebook. Người dùng có thể xem lại trước khi bấm Đăng.');
      }

      return {
        success: true,
        message: 'Bot đã tự động vào trình duyệt Facebook và đăng bài viết thành công!',
        logs
      };
    } catch (err) {
      addLog(`❌ Lỗi: ${err.message}`);
      return {
        success: false,
        error: err.message,
        logs
      };
    }
  }
}

module.exports = new FacebookBrowserBotService();
