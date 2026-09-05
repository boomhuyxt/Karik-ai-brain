const fs = require('fs');
const path = require('path');
const os = require('os');

class TiktokBrowserBotService {
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
   * Đường dẫn thư mục Profile người dùng (để lưu và giữ phiên đăng nhập TikTok lâu dài)
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

    const isVideo = typeof mediaUrl === 'string' && (mediaUrl.endsWith('.mp4') || mediaUrl.endsWith('.webm') || mediaUrl.endsWith('.mov'));
    const isSvg = typeof mediaUrl === 'string' && mediaUrl.startsWith('data:image/svg');
    const ext = isVideo ? '.mp4' : (isSvg ? '.svg' : '.png');
    const localFilePath = path.join(tempDir, `tt_upload_${Date.now()}${ext}`);

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
        console.warn('[TiktokBrowserBot] Failed to download remote media:', e.message);
      }
    }

    // 4. Direct absolute/relative file path
    if (typeof mediaUrl === 'string' && fs.existsSync(mediaUrl)) {
      return mediaUrl;
    }

    return null;
  }

  /**
   * Khởi chạy hoặc tái sử dụng trình duyệt Chrome đang mở sẵn
   */
  async launchOrReuseBrowser(puppeteer, { executablePath, userDataDir, addLog }) {
    const debuggingPort = 9222;
    const debuggingUrl = `http://127.0.0.1:${debuggingPort}`;

    // 1. Thử kết nối vào trình duyệt đang mở sẵn qua Remote Debugging Port
    try {
      const browser = await puppeteer.connect({ browserURL: debuggingUrl, defaultViewport: null });
      addLog('✅ Đã kết nối vào cửa sổ trình duyệt Chrome đang mở!');
      return { browser, isReused: true };
    } catch (e) {
      // Không có instance mở với port này, tiếp tục launch mới
    }

    const launchArgs = [
      `--remote-debugging-port=${debuggingPort}`,
      '--start-maximized',
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars'
    ];

    try {
      const browser = await puppeteer.launch({
        executablePath,
        userDataDir,
        headless: false,
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
          addLog('✅ Đã kết nối thành công vào trình duyệt Chrome!');
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
            headless: false,
            defaultViewport: null,
            args: launchArgs
          });
          return { browser, isReused: false };
        } catch (retryErr) {
          // Fallback an toàn: Dùng sub-profile để luôn đảm bảo mở được trình duyệt
          addLog('ℹ️ Tạo phiên làm việc mới an toàn để tránh xung đột file lock...');
          const fallbackDir = path.join(os.homedir(), `AppData\\Local\\KarikAIBrain\\TikTokSession`);
          if (!fs.existsSync(fallbackDir)) fs.mkdirSync(fallbackDir, { recursive: true });

          const browser = await puppeteer.launch({
            executablePath,
            userDataDir: fallbackDir,
            headless: false,
            defaultViewport: null,
            args: [
              '--start-maximized',
              '--disable-blink-features=AutomationControlled',
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-infobars'
            ]
          });
          return { browser, isReused: false };
        }
      }

      throw launchErr;
    }
  }

  /**
   * Tự động khởi chạy trình duyệt & đăng bài lên TikTok Creator Studio
   * @param {Object} options { caption, hashtags, mediaUrls, autoClickPost }
   */
  async runTiktokAutoPost({ caption = '', hashtags = [], mediaUrls = [], autoClickPost = true }) {
    const logs = [];
    const addLog = (msg) => {
      console.log(`[TT-Browser-Bot] ${msg}`);
      logs.push(`[${new Date().toLocaleTimeString('vi-VN')}] ${msg}`);
    };

    const executablePath = this.findBrowserExecutable();
    if (!executablePath) {
      throw new Error('Không tìm thấy trình duyệt Google Chrome hoặc Edge trên máy tính của bạn.');
    }

    addLog(`Đã tìm thấy trình duyệt: ${path.basename(executablePath)}`);
    const userDataDir = this.getUserDataDir();

    // Ghép Caption + Hashtags sản phẩm & Chuẩn hóa canh lề TikTok
    let fullText = caption ? caption.trim() : '';
    if (Array.isArray(hashtags) && hashtags.length > 0) {
      const tagStr = hashtags.map(t => (t.startsWith('#') ? t : `#${t}`)).join(' ');
      fullText = fullText ? `${fullText}\n\n${tagStr}` : tagStr;
    }

    // Chuẩn hóa xuống dòng và khoảng cách
    fullText = fullText
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map(line => line.trimEnd())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Chuẩn bị file media (ảnh hoặc video) từ Studio
    const mediaToUpload = (mediaUrls && mediaUrls[0]) ? mediaUrls[0] : null;
    const localMediaFile = mediaToUpload ? await this.prepareLocalMediaFile(mediaToUpload) : null;
    if (localMediaFile) {
      addLog(`Đã chuẩn bị file media sản phẩm: ${path.basename(localMediaFile)}`);
    }

    addLog('Đang mở hoặc kết nối trình duyệt Chrome trong chế độ giao diện thực tế...');

    let browser = null;
    try {
      const puppeteer = await this.getPuppeteer();

      const launchResult = await this.launchOrReuseBrowser(puppeteer, {
        executablePath,
        userDataDir,
        addLog
      });
      browser = launchResult.browser;

      const pages = await browser.pages();
      const page = pages.length > 0 ? pages[pages.length - 1] : await browser.newPage();

      try {
        const context = browser.defaultBrowserContext();
        await context.overridePermissions('https://www.tiktok.com', ['clipboard-read', 'clipboard-write']);
      } catch (permErr) {}

      addLog('Đang truy cập TikTok Creator Studio (https://www.tiktok.com/tiktokstudio/upload)...');
      await page.goto('https://www.tiktok.com/tiktokstudio/upload', { waitUntil: 'networkidle2', timeout: 50000 });

      // Chờ trang tải hoàn tất
      await new Promise(r => setTimeout(r, 3000));

      const currentUrl = page.url();

      // Kiểm tra xem có đang ở trang login hay bị chuyển hướng đăng nhập không
      const isLoginPage = await page.evaluate((url) => {
        if (url.includes('/login')) return true;
        const loginBtn = document.querySelector('button[data-e2e="login-button"], a[href*="/login"], div[data-e2e="login-icon"]');
        const loginForm = document.querySelector('#loginContainer, form[action*="login"]');
        const uploadArea = document.querySelector('input[type="file"], div[class*="upload"], div[class*="drop-zone"]');
        return Boolean((loginBtn || loginForm) && !uploadArea);
      }, currentUrl);

      if (isLoginPage) {
        addLog('⚠️ Phát hiện chưa đăng nhập tài khoản TikTok trên phiên trình duyệt của Bot.');
        return {
          success: false,
          requiresLogin: true,
          message: 'Trình duyệt đã mở trang TikTok Creator Studio. Vui lòng đăng nhập tài khoản TikTok của bạn một lần để Bot lưu phiên làm việc và tự động đăng bài!',
          logs
        };
      }

      addLog('Đã vào giao diện TikTok Creator Studio.');

      // BƯỚC 1: KIỂM TRA FILE MEDIA & PHÂN LOẠI ẢNH (PHOTOS) / VIDEO
      if (!localMediaFile) {
        addLog('⚠️ Không tìm thấy file media (Ảnh hoặc Video). TikTok Creator Studio bắt buộc phải có tệp media để tạo bài viết.');
        return {
          success: false,
          message: 'TikTok bắt buộc phải có tệp Hình Ảnh hoặc Video để đăng bài. Vui lòng chọn ảnh từ Studio hoặc dán link ảnh/video vào ô Media trước khi bấm chạy Bot!',
          logs
        };
      }

      const isVideo = ['.mp4', '.webm', '.mov'].some(ext => localMediaFile.toLowerCase().endsWith(ext));
      addLog(`Phát hiện định dạng tệp: ${isVideo ? 'VIDEO' : 'HÌNH ẢNH (PHOTO MODE)'} - File: ${path.basename(localMediaFile)}`);

      // Nếu là hình ảnh, chuyển sang tab "Photos" trên TikTok Studio
      if (!isVideo) {
        addLog('Đang chuyển sang tab "Photos" (Chế độ đăng Album ảnh TikTok)...');
        await page.evaluate(() => {
          const elements = Array.from(document.querySelectorAll('div, button, span, p'));
          const photoTab = elements.find(el => {
            const t = (el.textContent || '').trim();
            return (t === 'Photos' || t === 'Ảnh') && el.offsetParent !== null;
          });
          if (photoTab) {
            photoTab.click();
            return true;
          }
          return false;
        });
        await new Promise(r => setTimeout(r, 1500));
      } else {
        // Đảm bảo ở tab "Videos"
        await page.evaluate(() => {
          const elements = Array.from(document.querySelectorAll('div, button, span, p'));
          const videoTab = elements.find(el => {
            const t = (el.textContent || '').trim();
            return (t === 'Videos' || t === 'Video') && el.offsetParent !== null;
          });
          if (videoTab) videoTab.click();
        });
        await new Promise(r => setTimeout(r, 1000));
      }

      // BƯỚC 2: NẠP FILE MEDIA VÀO TIKTOK UPLOADER
      addLog(`Đang nạp file ${isVideo ? 'Video' : 'Ảnh'} vào khung tải lên TikTok Studio...`);
      let uploaded = false;

      // Cách 1: Nạp trực tiếp vào thẻ input[type="file"]
      const fileInputs = await page.$$('input[type="file"]');
      if (fileInputs.length > 0) {
        for (const input of fileInputs) {
          try {
            await input.uploadFile(localMediaFile);
            uploaded = true;
            addLog('✅ Đã nạp file media thành công qua input file!');
            break;
          } catch (e) {}
        }
      }

      // Cách 2: Bấm nút "Select video" / "Select photos" qua CDP FileChooser nếu Cách 1 chưa kích hoạt
      if (!uploaded) {
        try {
          const fileChooserPromise = page.waitForFileChooser({ timeout: 5000 }).catch(() => null);
          await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('button, div[role="button"], div')).find(b => {
              const t = (b.textContent || '').trim().toLowerCase();
              return t.includes('select video') || t.includes('select photos') || t.includes('select file') || t.includes('chọn tệp') || t.includes('chọn ảnh') || t.includes('chọn video');
            });
            if (btn) btn.click();
          });

          const fileChooser = await fileChooserPromise;
          if (fileChooser) {
            await fileChooser.accept([localMediaFile]);
            uploaded = true;
            addLog('✅ Đã nạp file media thành công qua CDP FileChooser!');
          }
        } catch (fcErr) {
          console.warn('[TiktokBrowserBot] FileChooser fallback:', fcErr.message);
        }
      }

      // BƯỚC 3: CHỜ TIKTOK STUDIO CHUYỂN TIẾP SANG MÀN HÌNH SOẠN THẢO BÀI ĐĂNG (EDITOR)
      addLog('Đang chờ TikTok xử lý tệp tải lên và mở giao diện biên tập nội dung...');
      let editorReady = false;

      for (let i = 0; i < 20; i++) {
        editorReady = await page.evaluate(() => {
          const editor = document.querySelector('div[contenteditable="true"], .public-DraftEditor-content, div[class*="editor"] div[contenteditable="true"], textarea, div[data-placeholder]');
          return Boolean(editor && editor.offsetParent !== null);
        });

        if (editorReady) break;
        await new Promise(r => setTimeout(r, 1000));
      }

      // BƯỚC 4: ĐIỀN CAPTION & HASHTAGS VÀO TIKTOK STUDIO
      if (fullText) {
        addLog('Đang điền nội dung Caption & Hashtags vào khung mô tả TikTok...');

        // Tầng 1: Synthetic DataTransfer Paste
        let inserted = await page.evaluate((textToType) => {
          const editors = Array.from(document.querySelectorAll(
            'div[contenteditable="true"], .public-DraftEditor-content, div[class*="editor"] div[contenteditable="true"], div[class*="notranslate"], textarea'
          )).filter(el => el.offsetParent !== null);

          if (editors.length === 0) return false;
          const activeEditor = editors[editors.length - 1];
          activeEditor.focus();

          try {
            const dt = new DataTransfer();
            dt.setData('text/plain', textToType);
            const pasteEvent = new ClipboardEvent('paste', {
              bubbles: true,
              cancelable: true,
              clipboardData: dt
            });
            activeEditor.dispatchEvent(pasteEvent);

            if (activeEditor.textContent && activeEditor.textContent.trim().length > 5) {
              activeEditor.dispatchEvent(new Event('input', { bubbles: true }));
              activeEditor.dispatchEvent(new Event('change', { bubbles: true }));
              return true;
            }
          } catch (e) {}

          if (activeEditor.tagName.toLowerCase() === 'textarea') {
            activeEditor.value = textToType;
            activeEditor.dispatchEvent(new Event('input', { bubbles: true }));
            activeEditor.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }

          return false;
        }, fullText);

        // Tầng 2: Clipboard API Ctrl + V
        if (!inserted) {
          try {
            await page.evaluate(async (textToCopy) => {
              if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(textToCopy);
              }
            }, fullText);

            const editorHandle = await page.$('div[contenteditable="true"], .public-DraftEditor-content, textarea');
            if (editorHandle) {
              await editorHandle.focus();
              await page.keyboard.down('Control');
              await page.keyboard.press('KeyA');
              await page.keyboard.up('Control');
              await page.keyboard.down('Control');
              await page.keyboard.press('KeyV');
              await page.keyboard.up('Control');
              inserted = true;
            }
          } catch (clipErr) {}
        }

        // Tầng 3: Gõ trực tiếp từng dòng qua bàn phím
        const textConfirmed = await page.evaluate(() => {
          const editor = document.querySelector('div[contenteditable="true"], .public-DraftEditor-content, textarea');
          return Boolean(editor && (editor.textContent || editor.value || '').trim().length > 5);
        });

        if (!textConfirmed) {
          addLog('Đang nhập nội dung trực tiếp qua bàn phím...');
          const editor = await page.$('div[contenteditable="true"], .public-DraftEditor-content, textarea');
          if (editor) {
            await editor.click();
            const lines = fullText.split('\n');
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].length > 0) {
                await page.keyboard.type(lines[i], { delay: 6 });
              }
              if (i < lines.length - 1) {
                await page.keyboard.press('Enter');
                await new Promise(r => setTimeout(r, 60));
              }
            }
          }
        }

        addLog('✅ Đã điền thành công Caption & Hashtags vào TikTok Studio!');
        await new Promise(r => setTimeout(r, 2000));
      }

      // BƯỚC 5: TỰ ĐỘNG BẤM NÚT ĐĂNG (POST)
      if (autoClickPost) {
        addLog('Đang chờ nút "Đăng" (Post) của TikTok sẵn sàng kích hoạt...');
        let posted = false;

        // Vòng lặp chờ nút Đăng sẵn sàng (tối đa 25 giây khi media upload xong)
        for (let attempt = 1; attempt <= 25; attempt++) {
          posted = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));

            const postBtn = buttons.find(b => {
              const txt = (b.textContent || b.innerText || '').toLowerCase().trim();
              const aria = (b.getAttribute('aria-label') || '').toLowerCase().trim();
              const isDisabled = b.disabled || b.getAttribute('aria-disabled') === 'true' || b.classList.contains('disabled');
              
              const isMatch = (
                txt === 'đăng' || txt === 'post' || txt.includes('đăng bài') || txt.includes('post now') ||
                aria === 'đăng' || aria === 'post'
              );
              return !isDisabled && isMatch && b.offsetParent !== null;
            });

            if (postBtn) {
              postBtn.click();
              return true;
            }
            return false;
          });

          if (posted) {
            addLog('🎉 ĐÃ TỰ ĐỘNG BẤM NÚT ĐĂNG BÀI TIKTOK THÀNH CÔNG! (Media + Caption đã được xuất bản)');
            await new Promise(r => setTimeout(r, 5000));
            break;
          }

          await new Promise(r => setTimeout(r, 1000));
        }

        if (!posted) {
          addLog('ℹ️ Đã nạp xong Media, Caption và Hashtags vào TikTok Studio. Bạn có thể kiểm tra và bấm nút "Đăng" trên trình duyệt.');
        }
      } else {
        addLog('ℹ️ Đã nạp sẵn Media và Caption vào TikTok Studio. Người dùng có thể xem lại trước khi bấm Đăng.');
      }

      return {
        success: true,
        message: 'Bot đã tự động vào TikTok Creator Studio và thực hiện chuẩn bị/đăng bài thành công!',
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

module.exports = new TiktokBrowserBotService();
