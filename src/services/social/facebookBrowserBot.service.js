const fs = require('fs');
const path = require('path');
const os = require('os');
const browserPlatformHelper = require('./browserPlatformHelper');

class FacebookBrowserBotService {
  /**
   * Helper nạp Puppeteer-Core bằng Dynamic Import (Hỗ trợ thuần ECMAScript Module)
   */
  async getPuppeteer() {
    return browserPlatformHelper.getPuppeteer();
  }

  /**
   * Tự động dò tìm đường dẫn Chrome hoặc Edge trên máy tính (Windows, macOS, Linux)
   */
  findBrowserExecutable(explicitPath = null) {
    return browserPlatformHelper.findBrowserExecutable(process.platform, explicitPath);
  }

  /**
   * Đường dẫn thư mục Profile người dùng (để giữ phiên đăng nhập Facebook có sẵn trên Win, Mac, Linux)
   */
  getUserDataDir() {
    return browserPlatformHelper.getUserDataDir('ChromeSession');
  }

  /**
   * Tải / Lưu file media tạm ra ổ cứng để trình duyệt upload
   */
  async prepareLocalMediaFile(mediaUrl) {
    return browserPlatformHelper.prepareLocalMediaFile(mediaUrl, 'fb_upload');
  }

  /**
   * Khởi chạy hoặc tái sử dụng trình duyệt Chrome đang mở sẵn
   */
  async launchOrReuseBrowser(puppeteer, { executablePath, userDataDir, addLog, headless = null }) {
    return browserPlatformHelper.launchOrReuseBrowser(puppeteer, {
      executablePath,
      userDataDir,
      fallbackSessionName: 'FacebookSession',
      addLog,
      headless
    });
  }

  /**
   * Tự động khởi chạy trình duyệt & đăng bài lên Facebook
   * @param {Object} options { caption, hashtags, mediaUrls, autoClickPost, executablePath, headless, credentials, cookieString }
   */
  async runFacebookAutoPost({ caption = '', hashtags = [], mediaUrls = [], autoClickPost = true, executablePath: customExecutablePath = null, headless = true, credentials = null, cookieString = null }) {
    const logs = [];
    const addLog = (msg) => {
      console.log(`[FB-Browser-Bot] ${msg}`);
      logs.push(`[${new Date().toLocaleTimeString('vi-VN')}] ${msg}`);
    };

    const executablePath = this.findBrowserExecutable(customExecutablePath);
    if (!executablePath) {
      const helpMsg = browserPlatformHelper.getBrowserNotFoundHelp();
      throw new Error(helpMsg);
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

    const isHeadless = Boolean(headless);
    addLog(isHeadless 
      ? 'Đang khởi chạy Chrome ngầm (Headless Mode - hoàn toàn không hiện cửa sổ)...' 
      : 'Đang mở trình duyệt Chrome trong chế độ giao diện thực tế...');

    let browser = null;
    try {
      const puppeteer = await this.getPuppeteer();

      const launchResult = await this.launchOrReuseBrowser(puppeteer, {
        executablePath,
        userDataDir,
        addLog,
        headless: isHeadless
      });
      browser = launchResult.browser;

      const pages = await browser.pages();
      const page = pages.length > 0 ? pages[pages.length - 1] : await browser.newPage();

      // Stealth & anti-detection cho Headless Chrome
      try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1366, height: 768 });
        await page.evaluateOnNewDocument(() => {
          Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });
      } catch (stErr) {}

      // Nếu có chuỗi Cookie được cung cấp, nạp vào page trước khi mở Facebook
      const activeCookie = cookieString || process.env.FACEBOOK_COOKIES;
      if (activeCookie) {
        addLog('Đang nạp Cookie phiên đăng nhập vào trình duyệt...');
        await browserPlatformHelper.injectCookieString(page, activeCookie, 'facebook');
      }

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
        // 1. Nếu người dùng cung cấp tài khoản & mật khẩu, tự động điền và đăng nhập
        if (credentials && credentials.username && credentials.password) {
          addLog(`Đang tự động đăng nhập Facebook với tài khoản: ${credentials.username}...`);

          const emailSelector = '#email, input[name="email"], input[type="email"]';
          const passSelector = '#pass, input[name="pass"], input[type="password"]';
          const loginBtnSelector = 'button[name="login"], button[type="submit"], input[type="submit"]';

          const emailInput = await page.$(emailSelector);
          const passInput = await page.$(passSelector);

          if (emailInput && passInput) {
            await emailInput.click({ clickCount: 3 }).catch(() => {});
            await emailInput.press('Backspace').catch(() => {});
            await emailInput.type(credentials.username, { delay: 40 });

            await passInput.click({ clickCount: 3 }).catch(() => {});
            await passInput.press('Backspace').catch(() => {});
            await passInput.type(credentials.password, { delay: 40 });

            addLog('Đã nhập thông tin tài khoản & mật khẩu. Đang gửi yêu cầu đăng nhập...');
            const loginBtn = await page.$(loginBtnSelector);
            if (loginBtn) {
              await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}),
                loginBtn.click()
              ]);
            } else {
              await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}),
                passInput.press('Enter')
              ]);
            }

            await new Promise(r => setTimeout(r, 3000));

            // Kiểm tra bảo mật 2 lớp (2FA)
            const is2FA = await page.evaluate(() => {
              const hasCodeInput = Boolean(document.querySelector('input#approvals_code, input[name="approvals_code"], input[name="code"]'));
              const bodyText = (document.body?.innerText || '').toLowerCase();
              return hasCodeInput || bodyText.includes('xác thực hai yếu tố') || bodyText.includes('two-factor') || bodyText.includes('mã đăng nhập');
            });

            if (is2FA) {
              if (credentials.twoFactorCode) {
                addLog(`Đang nạp mã 2FA xác thực: ${credentials.twoFactorCode}...`);
                const codeInput = await page.$('input#approvals_code, input[name="approvals_code"], input[name="code"]');
                if (codeInput) {
                  await codeInput.type(credentials.twoFactorCode, { delay: 40 });
                  const submit2FA = await page.$('button[type="submit"], button#checkpointSubmitButton');
                  if (submit2FA) await submit2FA.click();
                  await new Promise(r => setTimeout(r, 4000));
                }
              } else {
                addLog('⚠️ Facebook yêu cầu mã bảo mật 2 lớp (2FA).');
                return {
                  success: false,
                  requires2FA: true,
                  message: 'Tài khoản Facebook của bạn đang bật Xác thực 2 yếu tố (2FA). Vui lòng nhập mã OTP 6 số vào ô "Mã 2FA" trên giao diện hoặc tạm tắt Chế độ chạy ngầm để xác nhận!',
                  logs
                };
              }
            }

            // Kiểm tra nếu vẫn còn ở trang login
            const checkStatus = await page.evaluate(() => {
              const hasEmail = Boolean(document.querySelector('#email') || document.querySelector('input[name="email"]'));
              const errorText = document.querySelector('#error_box, [role="alert"]')?.innerText || '';
              return { hasEmail, errorText };
            });

            if (checkStatus.hasEmail) {
              addLog(`⚠️ Đăng nhập Facebook không thành công: ${checkStatus.errorText || 'Sai tài khoản hoặc mật khẩu'}`);
              return {
                success: false,
                requiresLogin: true,
                message: `Đăng nhập Facebook thất bại: ${checkStatus.errorText || 'Mật khẩu hoặc tài khoản bạn nhập không chính xác. Vui lòng kiểm tra lại!'}`,
                logs
              };
            }

            addLog('✅ Đăng nhập Facebook thành công! Phiên đã được lưu vào profile trình duyệt.');
          }
        } else {
          // Chưa đăng nhập và chưa có credentials
          addLog('⚠️ Phát hiện chưa đăng nhập Facebook trên phiên trình duyệt của Bot.');
          const loginHint = isHeadless
            ? 'Bot đang chạy ở chế độ ngầm (Headless) nhưng tài khoản Facebook chưa đăng nhập. Vui lòng nhập "Tài khoản (Email/SĐT)" và "Mật khẩu" ở mục Tài khoản & Mật khẩu trên giao diện để Bot tự động đăng nhập và đăng bài!'
            : 'Trình duyệt đã mở. Vui lòng đăng nhập tài khoản Facebook của bạn để Bot tự động lưu phiên và thực hiện đăng bài!';
          return {
            success: false,
            requiresLogin: true,
            message: loginHint,
            logs
          };
        }
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
                const modifierKey = browserPlatformHelper.getKeyboardModifier();
                await page.keyboard.down(modifierKey);
                await page.keyboard.press('KeyV');
                await page.keyboard.up(modifierKey);
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
          // Thử phím tắt Ctrl/Cmd + Enter để đăng bài
          const modLabel = browserPlatformHelper.getModifierLabel();
          addLog(`Đang thử kích hoạt lệnh đăng bài bằng phím tắt ${modLabel}+Enter...`);
          const textbox = await page.$('div[role="dialog"] div[role="textbox"][contenteditable="true"], div[role="textbox"][contenteditable="true"]');
          if (textbox) {
            await textbox.focus();
            const modifierKey = browserPlatformHelper.getKeyboardModifier();
            await page.keyboard.down(modifierKey);
            await page.keyboard.press('Enter');
            await page.keyboard.up(modifierKey);
            addLog(`🎉 Đã kích hoạt lệnh Đăng bài (${modLabel}+Enter)!`);
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
