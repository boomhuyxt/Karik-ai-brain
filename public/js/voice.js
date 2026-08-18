/**
 * Karik AI Voice Manager - 100% Pure JavaScript Real-Time Voice & Live Call Engine
 * Architecture:
 * - Hands-Free Live Voice Call (Đàm thoại 2 chiều liên tục bằng JavaScript)
 * - Instant Barge-In / Interruption (Nói chen ngang là tự động ngắt câu cũ của AI)
 * - Local Wake Word Engine ("Hey Karik", "Chào Karik", "Alo Karik", "Karik ơi", "Hey Jarvis")
 * - High-Fidelity Server-side Voice TTS (/api/tts) + SpeechSynthesis Fallback
 * - Dynamic Audio Reactive 3D Orb & Wave Visualizer (Web Audio API AnalyserNode)
 * - Live Call Duration Timer & Zero Python Dependencies
 */

class JarvisVoiceManager {
    constructor() {
        this.isWakeWordActive = true;
        this.isCallActive = false;
        this.currentLang = 'vi-VN';

        // Audio & Visualizer State
        this.audioCtx = null;
        this.analyser = null;
        this.dataArray = null;
        this.isAnalysing = false;
        this.localMicStream = null;
        this.currentAudioElement = null;

        // Call Timer
        this.callStartTime = 0;
        this.callTimerInterval = null;

        // Recognition instances
        this.wakeRecognition = null;
        this.callRecognition = null;
        this.isProcessingAI = false;
        this.silenceTimeout = null;

        // Wake Word Keywords
        this.wakeKeywords = [
            'nối hay karik', 'nói hay karik', 'hello karik', 'hey karik', 'hay karik', 'hi karik', 'chào karik', 'ơi karik', 'ok karik', 'ê karik', 'alo karik',
            'karik ơi', 'chào karik ơi', 'ca rik', 'kha rik', 'ca rít', 'kha rít', 'karik', 'ka rít', 'carrick',
            'hey jarvis', 'hello jarvis', 'jarvis', 'da vít', 'da vit'
        ].sort((a, b) => b.length - a.length);

        this.initAudioElement();
    }

    init() {
        this.setupLocalWakeWordRecognition();
        this.bindUIControls();
        this.setupGlobalUnlock();
        this.updateStatusBadge('🟢 Lắng nghe "Hey Karik"...');
        console.log('🎙️ [Karik JS Voice Engine]: Khởi động thành công (Zero Python Dependency).');
    }

    initAudioElement() {
        if (!this.currentAudioElement) {
            let el = document.getElementById('jarvisLiveAudio');
            if (!el) {
                el = document.createElement('audio');
                el.id = 'jarvisLiveAudio';
                el.autoplay = true;
                el.playsInline = true;
                el.style.display = 'none';
                document.body.appendChild(el);
            }
            this.currentAudioElement = el;
        }
    }

    setupGlobalUnlock() {
        const unlock = () => {
            if (this.audioCtx && this.audioCtx.state === 'suspended') {
                this.audioCtx.resume().catch(() => { });
            }
            if (this.currentAudioElement && this.currentAudioElement.paused) {
                this.currentAudioElement.play().catch(() => { });
            }
            if (this.isWakeWordActive && !this.isCallActive) {
                this.startWakeWordListening();
            }
        };
        window.addEventListener('click', unlock, { once: false });
        window.addEventListener('pointerdown', unlock, { once: false });
        window.addEventListener('keydown', unlock, { once: false });
        window.addEventListener('touchstart', unlock, { once: false });
    }

    // ==========================================
    // 🗣️ Local Wake Word Recognition
    // ==========================================

    setupLocalWakeWordRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn('[WakeWord]: Trình duyệt không hỗ trợ Web Speech API.');
            return;
        }

        try {
            this.wakeRecognition = new SpeechRecognition();
            this.wakeRecognition.continuous = true;
            this.wakeRecognition.interimResults = true;
            this.wakeRecognition.lang = this.currentLang;

            this.wakeRecognition.onresult = (event) => {
                if (this.isCallActive) return;

                let transcript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    transcript += event.results[i][0].transcript + ' ';
                }
                const clean = transcript.toLowerCase().trim();
                const matched = this.wakeKeywords.find(kw => clean.includes(kw));

                if (matched && !this.isCallActive) {
                    console.log(`⚡ [Wake Word Matched!]: "${matched}" -> Bắt đầu cuộc gọi thoại JS.`);
                    this.startLiveCall();
                }
            };

            this.wakeRecognition.onerror = (e) => {
                if (e.error !== 'no-speech' && e.error !== 'aborted') {
                    console.warn('[WakeWord Error]:', e.error);
                }
            };

            this.wakeRecognition.onend = () => {
                if (this.isWakeWordActive && !this.isCallActive) {
                    setTimeout(() => this.startWakeWordListening(), 300);
                }
            };

            if (this.isWakeWordActive) {
                this.startWakeWordListening();
            }
        } catch (e) {
            console.error('[WakeWord Setup Error]:', e);
        }
    }

    startWakeWordListening() {
        if (!this.wakeRecognition || this.isCallActive) return;
        try {
            this.wakeRecognition.start();
        } catch (e) { }
    }

    stopWakeWordListening() {
        if (this.wakeRecognition) {
            try { this.wakeRecognition.stop(); } catch (e) { }
        }
    }

    // ==========================================
    // 📞 Live Hands-Free Duplex Voice Call (JS)
    // ==========================================

    async startLiveCall() {
        if (this.isCallActive) return;
        this.isCallActive = true;

        this.stopWakeWordListening();
        this.openChatWindow();
        this.playCallConnectChime();
        this.showLiveCallBanner(true);
        this.updateCallButtonUI(true);
        this.updateStatusBadge('📞 Cuộc gọi trực tiếp đang diễn ra (Hãy nói tự nhiên)...');
        this.showWaveAnimation('Karik: Em đang nghe đây sếp ơi, sếp cứ nói tự nhiên nhé!');

        // 1. Initialize Microphone stream & Audio Analyser
        await this.initMicrophoneAnalyser();

        // 2. Start Live Continuous Speech Recognition
        this.startCallSpeechRecognition();

        // Speak welcome acknowledgment
        this.speakText("Em đang nghe đây sếp ơi!").catch(() => {});
    }

    endLiveCall() {
        this.isCallActive = false;
        this.isProcessingAI = false;

        this.stopCallSpeechRecognition();
        this.stopSpeaking();
        this.stopMicrophoneAnalyser();

        this.showLiveCallBanner(false);
        this.updateCallButtonUI(false);
        this.updateStatusBadge('🟢 Lắng nghe "Hey Karik"...');
        this.hideWaveAnimation();

        if (this.isWakeWordActive) {
            setTimeout(() => this.startWakeWordListening(), 400);
        }
    }

    startCallSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        if (this.callRecognition) {
            try { this.callRecognition.stop(); } catch (e) {}
        }

        this.callRecognition = new SpeechRecognition();
        this.callRecognition.continuous = true;
        this.callRecognition.interimResults = true;
        this.callRecognition.lang = this.currentLang;

        let finalAccumulatedTranscript = '';

        this.callRecognition.onresult = (event) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const text = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalAccumulatedTranscript += text + ' ';
                } else {
                    interimTranscript += text;
                }
            }

            const currentSpoken = (finalAccumulatedTranscript + interimTranscript).trim();

            if (currentSpoken.length > 0) {
                // Instant Barge-In: Stop AI audio immediately if user speaks!
                this.stopSpeaking();
                this.showWaveAnimation(`🎤 Đang nghe: "${currentSpoken}"`);
                this.updateStatusBadge('🎤 Đang nghe sếp nói...');

                // Reset debounce timer to detect pause in speech
                clearTimeout(this.silenceTimeout);
                this.silenceTimeout = setTimeout(() => {
                    if (currentSpoken.length >= 2 && !this.isProcessingAI && this.isCallActive) {
                        finalAccumulatedTranscript = '';
                        this.processUserSpeechInCall(currentSpoken);
                    }
                }, 850);
            }
        };

        this.callRecognition.onerror = (e) => {
            if (e.error !== 'no-speech' && e.error !== 'aborted') {
                console.warn('[CallRecognition Error]:', e.error);
            }
        };

        this.callRecognition.onend = () => {
            if (this.isCallActive && !this.isProcessingAI) {
                setTimeout(() => {
                    if (this.isCallActive) {
                        try { this.callRecognition.start(); } catch (e) {}
                    }
                }, 200);
            }
        };

        try {
            this.callRecognition.start();
        } catch (e) {
            console.warn('[CallRecognition Start Exception]:', e);
        }
    }

    stopCallSpeechRecognition() {
        if (this.callRecognition) {
            try { this.callRecognition.stop(); } catch (e) {}
            this.callRecognition = null;
        }
        clearTimeout(this.silenceTimeout);
    }

    async processUserSpeechInCall(userText) {
        if (!userText || !userText.trim()) return;
        this.isProcessingAI = true;

        this.appendUserMessage(userText);
        this.showWaveAnimation('🤖 AI Karik đang suy nghĩ...');
        this.updateStatusBadge('🤖 AI Karik đang suy nghĩ...');

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userText
                })
            });

            const result = await response.json();
            const aiReply = result.reply || result.message || 'Dạ, em đã nhận được thông tin từ sếp.';

            this.appendAiMessage(aiReply);
            this.showWaveAnimation('🔊 AI Karik đang trả lời...');
            this.updateStatusBadge('🔊 AI Karik đang trả lời...');

            // Speak AI Reply with Instant High-Quality Voice
            await this.speakText(aiReply);

            if (this.isCallActive) {
                this.showWaveAnimation('Karik đang lắng nghe sếp nói...');
                this.updateStatusBadge('📞 Cuộc gọi trực tiếp (Hãy nói tự nhiên)...');
                this.startCallSpeechRecognition();
            }

        } catch (err) {
            console.error('[ProcessUserSpeech Error]:', err);
            this.showWaveAnimation('⚠️ Gặp lỗi kết nối AI, vui lòng thử lại.');
            this.updateStatusBadge('⚠️ Lỗi xử lý AI');
        } finally {
            this.isProcessingAI = false;
        }
    }

    // ==========================================
    // 🔊 High-Fidelity TTS Voice Playback Engine
    // ==========================================

    async speakText(text) {
        if (!text || !text.trim()) return;

        // Clean text for speech
        const clean = text
            .replace(/```[\s\S]*?```/g, ' Đã có đoạn mã đính kèm. ')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/[*#_~>]/g, '')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/https?:\/\/\S+/g, '')
            .replace(/---\n?/g, '')
            .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
            .trim()
            .slice(0, 450);

        if (!clean) return;

        return new Promise((resolve) => {
            this.stopSpeaking();

            const ttsUrl = `/api/tts?text=${encodeURIComponent(clean)}&lang=${encodeURIComponent(this.currentLang.startsWith('vi') ? 'vi' : 'en')}`;

            if (this.currentAudioElement) {
                this.currentAudioElement.src = ttsUrl;
                this.currentAudioElement.onended = () => resolve();
                this.currentAudioElement.onerror = () => {
                    // Fallback to browser SpeechSynthesis
                    this.speakViaSpeechSynthesis(clean, resolve);
                };

                this.currentAudioElement.play().catch(() => {
                    this.speakViaSpeechSynthesis(clean, resolve);
                });
            } else {
                this.speakViaSpeechSynthesis(clean, resolve);
            }
        });
    }

    speakViaSpeechSynthesis(text, onEnded) {
        if (!('speechSynthesis' in window)) {
            if (onEnded) onEnded();
            return;
        }

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = this.currentLang;
        utterance.rate = 1.05;
        utterance.pitch = 1.0;

        utterance.onend = () => {
            if (onEnded) onEnded();
        };
        utterance.onerror = () => {
            if (onEnded) onEnded();
        };

        window.speechSynthesis.speak(utterance);
    }

    stopSpeaking() {
        if (this.currentAudioElement) {
            this.currentAudioElement.pause();
            this.currentAudioElement.removeAttribute('src');
            this.currentAudioElement.load();
        }
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }

    // ==========================================
    // 🌊 Web Audio Analyser & Dynamic 3D Orb
    // ==========================================

    async initMicrophoneAnalyser() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;

            if (!this.audioCtx) this.audioCtx = new AudioCtx();
            if (this.audioCtx.state === 'suspended') await this.audioCtx.resume();

            if (!this.localMicStream) {
                this.localMicStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });
            }

            const source = this.audioCtx.createMediaStreamSource(this.localMicStream);
            this.analyser = this.audioCtx.createAnalyser();
            this.analyser.fftSize = 256;
            source.connect(this.analyser);

            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            this.startVolumeLoop();
        } catch (err) {
            console.warn('[MicrophoneAnalyser Notice]:', err.message);
        }
    }

    stopMicrophoneAnalyser() {
        this.isAnalysing = false;
        if (this.localMicStream) {
            this.localMicStream.getTracks().forEach(t => t.stop());
            this.localMicStream = null;
        }
        this.updateOrbBubble(0);
    }

    startVolumeLoop() {
        if (this.isAnalysing) return;
        this.isAnalysing = true;

        const updateVolume = () => {
            if (!this.isAnalysing || !this.isCallActive) {
                this.updateOrbBubble(0);
                return;
            }

            if (this.analyser && this.dataArray) {
                this.analyser.getByteFrequencyData(this.dataArray);
                let sum = 0;
                for (let i = 0; i < this.dataArray.length; i++) {
                    sum += this.dataArray[i];
                }
                const average = sum / this.dataArray.length;
                const volumePercent = Math.min(100, Math.round((average / 128) * 100));
                this.updateOrbBubble(volumePercent);
            }

            requestAnimationFrame(updateVolume);
        };
        updateVolume();
    }

    updateOrbBubble(volumePercent) {
        const orbContainer = document.getElementById('voiceOrbContainer');
        const orbBubble = document.getElementById('voiceOrbBubble');
        const volPercentText = document.getElementById('voiceVolumePercent');

        if (!orbContainer || !orbBubble) return;

        if (this.isCallActive) {
            orbContainer.classList.remove('hidden');
            orbContainer.classList.add('flex');

            const scale = 1 + (volumePercent / 100) * 0.55;
            const glowRadius = 25 + Math.round((volumePercent / 100) * 45);
            const glowOpacity = 0.5 + (volumePercent / 100) * 0.5;

            orbBubble.style.transform = `scale(${scale.toFixed(2)})`;
            orbBubble.style.boxShadow = `0 0 ${glowRadius}px rgba(56, 189, 248, ${glowOpacity.toFixed(2)})`;

            if (volPercentText) volPercentText.textContent = `${volumePercent}%`;
        } else {
            orbContainer.classList.add('hidden');
            orbContainer.classList.remove('flex');
            orbBubble.style.transform = 'scale(1)';
        }
    }

    // ==========================================
    // 🎨 UI Helpers & Chat Integration
    // ==========================================

    showLiveCallBanner(show) {
        const banner = document.getElementById('liveCallBanner');
        const durationText = document.getElementById('callDuration');

        if (show) {
            if (banner) {
                banner.classList.remove('hidden');
                banner.classList.add('flex');
            }
            this.callStartTime = Date.now();
            clearInterval(this.callTimerInterval);
            this.callTimerInterval = setInterval(() => {
                const elapsedSec = Math.floor((Date.now() - this.callStartTime) / 1000);
                const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
                const secs = String(elapsedSec % 60).padStart(2, '0');
                if (durationText) durationText.textContent = `${mins}:${secs}`;
            }, 1000);
        } else {
            if (banner) {
                banner.classList.add('hidden');
                banner.classList.remove('flex');
            }
            clearInterval(this.callTimerInterval);
            if (durationText) durationText.textContent = '00:00';
        }
    }

    updateCallButtonUI(inCall) {
        const callBtn = document.getElementById('btnWebRTCCall');
        const icon = document.getElementById('callBtnIcon');
        const label = document.getElementById('callBtnLabel');

        if (!callBtn) return;

        if (inCall) {
            callBtn.className = 'flex items-center gap-1 bg-red-950/80 hover:bg-red-800/90 border border-red-400/50 px-2 py-0.5 rounded-full text-red-200 text-[10px] font-semibold transition-all active:scale-95 shadow-[0_0_10px_rgba(239,68,68,0.4)]';
            if (icon) icon.textContent = 'call_end';
            if (icon) icon.className = 'material-symbols-outlined text-[12px] text-red-400';
            if (label) label.textContent = 'Tắt gọi';
        } else {
            callBtn.className = 'flex items-center gap-1 bg-emerald-950/80 hover:bg-emerald-800/90 border border-emerald-400/50 px-2 py-0.5 rounded-full text-emerald-200 text-[10px] font-semibold transition-all active:scale-95 shadow-[0_0_10px_rgba(16,185,129,0.3)]';
            if (icon) icon.textContent = 'call';
            if (icon) icon.className = 'material-symbols-outlined text-[12px] text-emerald-400';
            if (label) label.textContent = 'Gọi AI';
        }
    }

    openChatWindow() {
        const chatBox = document.getElementById('chatBoxContainer');
        const minPill = document.getElementById('jarvisMinPill');

        if (minPill) {
            minPill.classList.add('hidden');
            minPill.classList.remove('flex');
        }

        if (chatBox) {
            chatBox.classList.remove('hidden', 'scale-95', 'opacity-0');
            chatBox.classList.add('flex', 'scale-100', 'opacity-100');
        }
    }

    minimizeChatWindow() {
        const chatBox = document.getElementById('chatBoxContainer');
        const minPill = document.getElementById('jarvisMinPill');

        if (chatBox) {
            chatBox.classList.add('hidden');
            chatBox.classList.remove('flex');
        }

        if (minPill) {
            minPill.classList.remove('hidden');
            minPill.classList.add('flex');
        }
    }

    appendUserMessage(text) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages || !text) return;

        const userDiv = document.createElement('div');
        userDiv.className = 'bg-transparent p-1.5 text-white self-end ml-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] transition-all animate-fadeIn';
        userDiv.innerHTML = `
            <strong class="text-purple-300 font-bold text-xs flex items-center gap-1.5 mb-0.5 text-glow">
                <span class="material-symbols-outlined text-sm text-purple-400">account_circle</span>
                Bạn (Voice):
            </strong>
            <div class="text-white font-semibold text-xs leading-relaxed tracking-wide">${this.escapeHtml(text)}</div>
        `;
        chatMessages.appendChild(userDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    appendAiMessage(text) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages || !text) return;

        const renderFn = typeof window.renderCustomMarkdown === 'function' ? window.renderCustomMarkdown : (t => t);
        const aiDiv = document.createElement('div');
        aiDiv.className = 'bg-transparent p-1.5 text-slate-100 self-start mr-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] transition-all animate-fadeIn';
        aiDiv.innerHTML = `
            <strong class="text-cyan-300 font-bold text-xs flex items-center justify-between mb-1 text-glow">
                <span class="flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-sm text-cyan-400">smart_toy</span>
                    AI Karik Voice:
                    <span class="text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 px-1 py-0.2 rounded font-mono">JS Engine</span>
                </span>
            </strong>
            <div class="text-slate-100 font-medium text-xs leading-relaxed border-t border-purple-500/20 pt-1 mt-0.5">
                ${renderFn(text)}
            </div>
        `;
        chatMessages.appendChild(aiDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        if (typeof window.fetchAndRenderGraph === 'function') window.fetchAndRenderGraph();
        if (typeof window.fetchSystemTokenUsage === 'function') window.fetchSystemTokenUsage();
    }

    bindUIControls() {
        const btnCall = document.getElementById('btnWebRTCCall');
        const btnEndCall = document.getElementById('btnEndCall');
        const btnMicToggle = document.getElementById('btnMicToggle');
        const btnLangToggle = document.getElementById('btnLangToggle');
        const btnWakeWordToggle = document.getElementById('btnWakeWordToggle');
        const btnMinimizeChat = document.getElementById('btnMinimizeChat');
        const jarvisMinPill = document.getElementById('jarvisMinPill');

        if (btnCall) {
            btnCall.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.isCallActive) {
                    this.endLiveCall();
                } else {
                    this.startLiveCall();
                }
            });
        }

        if (btnEndCall) {
            btnEndCall.addEventListener('click', (e) => {
                e.stopPropagation();
                this.endLiveCall();
            });
        }

        if (btnMicToggle) {
            btnMicToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.isCallActive) {
                    this.endLiveCall();
                } else {
                    this.startLiveCall();
                }
            });
        }

        if (btnLangToggle) {
            btnLangToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.currentLang = (this.currentLang === 'vi-VN') ? 'en-US' : 'vi-VN';
                const isVi = this.currentLang.startsWith('vi');
                const langIcon = document.getElementById('langIcon');
                const langBtnLabel = document.getElementById('langBtnLabel');
                if (langIcon) langIcon.textContent = isVi ? '🇻🇳' : '🇺🇸';
                if (langBtnLabel) langBtnLabel.textContent = isVi ? 'VI' : 'EN';
                if (this.wakeRecognition) this.wakeRecognition.lang = this.currentLang;
                if (this.callRecognition) this.callRecognition.lang = this.currentLang;
            });
        }

        if (btnWakeWordToggle) {
            btnWakeWordToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.isWakeWordActive = !this.isWakeWordActive;
                const wakeWordIcon = document.getElementById('wakeWordIcon');
                const wakeWordBtnLabel = document.getElementById('wakeWordBtnLabel');

                if (this.isWakeWordActive) {
                    this.startWakeWordListening();
                    if (wakeWordIcon) wakeWordIcon.className = 'material-symbols-outlined text-[12px] text-emerald-400';
                    if (wakeWordBtnLabel) wakeWordBtnLabel.textContent = 'ON';
                    this.updateStatusBadge('Lắng nghe "Hey Karik"...');
                } else {
                    this.stopWakeWordListening();
                    if (wakeWordIcon) wakeWordIcon.className = 'material-symbols-outlined text-[12px] text-slate-400';
                    if (wakeWordBtnLabel) wakeWordBtnLabel.textContent = 'OFF';
                    this.updateStatusBadge('Tắt lắng nghe tự động');
                }
            });
        }

        if (btnMinimizeChat) {
            btnMinimizeChat.addEventListener('click', (e) => {
                e.stopPropagation();
                this.minimizeChatWindow();
            });
        }

        if (jarvisMinPill) {
            jarvisMinPill.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openChatWindow();
                this.startLiveCall();
            });
        }
    }

    playCallConnectChime() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            if (!this.audioCtx) this.audioCtx = new AudioCtx();
            if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, this.audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.2);

            gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.35);

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.35);
        } catch (e) { }
    }

    showWaveAnimation(label) {
        const waveContainer = document.getElementById('voiceWaveContainer');
        const waveLabel = document.getElementById('voiceWaveLabel');
        if (waveContainer) {
            waveContainer.classList.remove('hidden');
            waveContainer.classList.add('flex');
        }
        if (waveLabel && label) waveLabel.textContent = label;
    }

    hideWaveAnimation() {
        const waveContainer = document.getElementById('voiceWaveContainer');
        if (waveContainer) {
            waveContainer.classList.add('hidden');
            waveContainer.classList.remove('flex');
        }
        this.updateOrbBubble(0);
    }

    updateStatusBadge(text) {
        const statusText = document.getElementById('voiceStatusText');
        if (statusText) statusText.textContent = text;
    }

    escapeHtml(str) {
        return (str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
    }
}

// Global instance initialization
window.jarvisVoice = new JarvisVoiceManager();
