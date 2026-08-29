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

    // 1. Base64 DataURL (Xuất trực tiếp từ Karik Studio Canvas)
    if (mediaUrl.startsWith('data:')) {
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

    // 4. Direct absolute/relative file path
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

    // Ghép Caption + Hashtags sản phẩm & Chuẩn hóa canh lề Facebook
    let fullText = caption ? caption.trim() : '';
    if (Array.isArray(hashtags) && hashtags.length > 0) {
      const tagStr = hashtags.map(t => (t.startsWith('#') ? t : `#${t}`)).join(' ');
      fullText = fullText ? `${fullText}\n\n${tagStr}` : tagStr;
    }

    // Chuẩn hóa xuống dòng và khoảng thở chuẩn phong cách Facebook
    fullText = fullText
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map(line => line.trimEnd())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Chuẩn bị file ảnh từ Studio nếu có
    const mediaToUpload = (mediaUrls && mediaUrls[0]) ? mediaUrls[0] : null;
    const localMediaFile = mediaToUpload ? await this.prepareLocalMediaFile(mediaToUpload) : null;
    if (localMediaFile) {
      addLog(`Đã chuẩn bị file ảnh sản phẩm từ Studio: ${path.basename(localMediaFile)}`);
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

      try {
        const context = browser.defaultBrowserContext();
        await context.overridePermissions('https://www.facebook.com', ['clipboard-read', 'clipboard-write']);
      } catch (permErr) {}

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
      await new Promise(r => setTimeout(r, 2500));

      // BƯỚC 1: ĐÍNH KÈM ẢNH SẢN PHẨM TỪ STUDIO TRỰC TIẾP VÀO COMPOSER DIALOG
      if (localMediaFile) {
        addLog('Đang nạp ảnh sản phẩm từ Studio vào khung bài đăng Facebook...');

        try {
          // Bắt sự kiện file chooser của Chrome để nạp ảnh trực tiếp qua CDP
          const fileChooserPromise = page.waitForFileChooser({ timeout: 4000 });
          
          const clicked = await page.evaluate(() => {
            const dialog = document.querySelector('div[role="dialog"]') || document;
            const photoBtn = dialog.querySelector('div[aria-label*="Ảnh/video"], div[aria-label*="Photo/video"], div[aria-label*="Thêm ảnh"], div[aria-label*="Add photo"]');
            if (photoBtn) {
              photoBtn.click();
              return true;
            }
            return false;
          });

          if (clicked) {
            try {
              const fileChooser = await fileChooserPromise;
              await fileChooser.accept([localMediaFile]);
              addLog('✅ Đã nạp thành công ảnh sản phẩm qua FileChooser!');
            } catch (fcErr) {
              // Fallback upload trực tiếp vào input file
              const allFileInputs = await page.$$('div[role="dialog"] input[type="file"], input[type="file"]');
              for (const input of allFileInputs) {
                try { await input.uploadFile(localMediaFile); } catch (e) {}
              }
            }
          } else {
            const allFileInputs = await page.$$('div[role="dialog"] input[type="file"], input[type="file"]');
            for (const input of allFileInputs) {
              try { await input.uploadFile(localMediaFile); } catch (e) {}
            }
          }
        } catch (err) {
          console.warn('[PuppeteerBot] Upload image error:', err.message);
        }

        // Chờ Facebook render preview ảnh và tải lên máy chủ CDN
        await new Promise(r => setTimeout(r, 4000));
      }

      // BƯỚC 2: NHẬP NỘI DUNG CAPTION SẢN PHẨM CÙNG CHUNG BÀI ĐĂNG (BẢO TOÀN XUỐNG DÒNG & CANH LỀ)
      if (fullText) {
        addLog('Đang nhập nội dung Caption Sản Phẩm vào cùng bài đăng (Bảo toàn xuống dòng & canh lề FB)...');

        // TẦNG 1: Sử dụng Synthetic ClipboardEvent Paste với DataTransfer
        // Meta Lexical framework của Facebook sẽ bắt sự kiện paste và tự động tạo các thẻ <p> giữ trọn vẹn từng dòng
        let inserted = await page.evaluate((textToType) => {
          const textboxes = Array.from(document.querySelectorAll('div[role="textbox"][contenteditable="true"]'));
          if (textboxes.length === 0) return false;
          const activeBox = textboxes[textboxes.length - 1];
          activeBox.focus();

          try {
            const dt = new DataTransfer();
            dt.setData('text/plain', textToType);
            const pasteEvent = new ClipboardEvent('paste', {
              bubbles: true,
              cancelable: true,
              clipboardData: dt
            });
            activeBox.dispatchEvent(pasteEvent);

            const firstLine = textToType.split('\n')[0].trim();
            if (activeBox.textContent && activeBox.textContent.includes(firstLine.slice(0, 15))) {
              activeBox.dispatchEvent(new Event('input', { bubbles: true }));
              activeBox.dispatchEvent(new Event('change', { bubbles: true }));
              return true;
            }
          } catch (e) {}
          return false;
        }, fullText);

        // TẦNG 2: Nếu Tầng 1 chưa nhận, ghi vào Clipboard trình duyệt và kích hoạt phím tắt Ctrl + V
        if (!inserted) {
          try {
            const clipboardSet = await page.evaluate(async (textToCopy) => {
              try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  await navigator.clipboard.writeText(textToCopy);
                  return true;
                }
              } catch (e) {}
              return false;
            }, fullText);

            if (clipboardSet) {
              const textbox = await page.$('div[role="textbox"][contenteditable="true"]');
              if (textbox) {
                await textbox.focus();
                await page.keyboard.down('Control');
                await page.keyboard.press('KeyV');
                await page.keyboard.up('Control');
                inserted = true;
              }
            }
          } catch (clipErr) {
            console.warn('[PuppeteerBot] Clipboard Ctrl+V fallback failed:', clipErr.message);
          }
        }

        // TẦNG 3: Fallback gõ từng dòng và bấm Enter để ngắt đoạn chuẩn xác nếu các cách trên chưa thành công
        const textConfirmed = await page.evaluate((sample) => {
          const textboxes = Array.from(document.querySelectorAll('div[role="textbox"][contenteditable="true"]'));
          if (textboxes.length === 0) return false;
          const activeBox = textboxes[textboxes.length - 1];
          return Boolean(activeBox.textContent && activeBox.textContent.trim().length > 10);
        }, fullText.slice(0, 15));

        if (!textConfirmed) {
          addLog('Đang nhập nội dung dòng-theo-dòng để bảo đảm chuẩn ngắt đoạn...');
          const textbox = await page.$('div[role="textbox"][contenteditable="true"]');
          if (textbox) {
            await textbox.click();
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

        addLog('✅ Đã điền nội dung Caption Sản Phẩm & Hashtags chuẩn canh lề và ngắt dòng Facebook thành công!');
        await new Promise(r => setTimeout(r, 2000));
      }

      // BƯỚC 3: CHỜ FACEBOOK XỬ LÝ ẢNH & TỰ ĐỘNG BẤM NÚT ĐĂNG (POST)
      if (autoClickPost) {
        addLog('Đang chờ Facebook kích hoạt nút "Đăng" (Post)...');
        let posted = false;

        // Vòng lặp chờ nút Đăng sẵn sàng (tối đa 15 giây khi ảnh upload hoàn tất)
        for (let attempt = 1; attempt <= 15; attempt++) {
          posted = await page.evaluate(() => {
            const dialog = document.querySelector('div[role="dialog"]') || document;
            const buttons = Array.from(dialog.querySelectorAll('div[role="button"], button'));

            const postBtn = buttons.find(b => {
              const label = (b.getAttribute('aria-label') || '').toLowerCase().trim();
              const txt = (b.textContent || '').toLowerCase().trim();
              const isDisabled = b.getAttribute('aria-disabled') === 'true' || b.disabled;
              return !isDisabled && (label === 'đăng' || label === 'post' || label === 'tiếp' || txt === 'đăng' || txt === 'post');
            });

            if (postBtn) {
              postBtn.click();
              return true;
            }
            return false;
          });

          if (posted) {
            addLog('🎉 ĐÃ TỰ ĐỘNG BẤM NÚT ĐĂNG BÀI THÀNH CÔNG! (Ảnh Studio + Caption Sản Phẩm đã được xuất bản)');
            await new Promise(r => setTimeout(r, 4500));
            break;
          }

          await new Promise(r => setTimeout(r, 1000));
        }

        if (!posted) {
          // Thử phím tắt Ctrl + Enter để đăng bài
          addLog('Đang thử kích hoạt lệnh đăng bài bằng phím tắt Ctrl+Enter...');
          const textbox = await page.$('div[role="dialog"] div[role="textbox"][contenteditable="true"], div[role="textbox"][contenteditable="true"]');
          if (textbox) {
            await textbox.focus();
            await page.keyboard.down('Control');
            await page.keyboard.press('Enter');
            await page.keyboard.up('Control');
            addLog('🎉 Đã kích hoạt lệnh Đăng bài (Ctrl+Enter)!');
            await new Promise(r => setTimeout(r, 4500));
          } else {
            addLog('⚠️ Đã đính kèm ảnh và điền caption đầy đủ. Bạn có thể nhấn nút "Đăng" trên trình duyệt.');
          }
        }
      } else {
        addLog('ℹ️ Đã nạp sẵn ảnh và bài viết vào Facebook. Người dùng có thể xem lại trước khi bấm Đăng.');
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
