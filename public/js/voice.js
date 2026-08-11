/**
 * Jarvis AI Voice Manager
 * Handles 'Hey Jarvis' Wake Word Detection & Electron/Chromium Web Speech API Voice Playback
 */
class JarvisVoiceManager {
    constructor() {
        this.isWakeWordActive = true;
        this.isListeningForPrompt = false;
        this.isSpeaking = false;
        this.isListeningState = false;
        this.recognition = null;
        this.synth = window.speechSynthesis || null;
        this.selectedVoice = null;
        this.currentAudio = null;
        this.audioCtx = null;
        this.promptTimeout = null;
        this.silenceTimer = null;
        this.hearingSilenceTimer = null;

        // Target keywords for wake word trigger (including extensive Vietnamese phonetic variations)
        this.wakeKeywords = [
            'nối hay jarvis', 'nói hay jarvis', 'nối hay harvis', 'nói hay harvis', 'nối hay davis', 'nói hay davis', 'nối hey da vít', 'nói hey da vít',
            'nói hey gia vít', 'nối hey gia vít', 'nói hay gia vít', 'nối hay gia vít',
            'hey jarvis', 'hey harvis', 'hey davis', 'hey da vít', 'hey đa vít', 'hey davit', 'hey gia vít', 'hey ha vít', 'hey giá vít', 'hey già vít', 'hey dá vít',
            'hay jarvis', 'hay harvis', 'hay davis', 'hay da vít', 'hay đa vít', 'hay gia vít', 'hay ha vít',
            'hi jarvis', 'hi harvis', 'hi davis', 'hi da vít', 'hi gia vít',
            'chào jarvis', 'chào harvis', 'chào davis', 'chào da vít', 'chào gia vít',
            'ơi jarvis', 'ơi harvis', 'ơi davis', 'ơi da vít', 'ơi gia vít', 'ơi ha vít',
            'ok jarvis', 'ok harvis', 'ok davis', 'ok da vít', 'ok gia vít',
            'ê jarvis', 'ê da vít', 'ê gia vít', 'alo jarvis', 'alo da vít', 'alo gia vít',
            'hây da vít', 'nói hây da vít', 'hây đa vít', 'nói hây đa vít', 'hây gia vít', 'nói hây gia vít',
            'giao vít', 'diao vít', 'dzo vít', 'dô vít', 'zơ vít', 'dơ vít', 'da vịt', 'gia vịt', 'hay ra buýt', 'hay javic',
            'jarvis', 'harvis', 'davis', 'da vít', 'đa vít', 'gia vít', 'ha vít', 'giá vít', 'già vít', 'dá vít', 'dà vít', 'xa vít', 'cha vít', 'tra vít', 'ra vít', 'xe buýt', 'jabit', 'tra vính', 'trà vinh'
        ].sort((a, b) => b.length - a.length);
    }

    init() {
        this.setupSpeechRecognition();
        this.initVoices();
        this.bindUIControls();
        this.setupGlobalUnlock();
        this.updateStatusBadge('🟢 Lắng nghe "Hey Jarvis"...');
    }

    setupGlobalUnlock() {
        const unlock = () => {
            if (this.audioCtx && this.audioCtx.state === 'suspended') {
                this.audioCtx.resume().catch(() => { });
            }
            if (this.isWakeWordActive && !this.isListeningState && !this.isSpeaking) {
                this.startListening();
            }
        };
        window.addEventListener('click', unlock);
        window.addEventListener('pointerdown', unlock);
        window.addEventListener('keydown', unlock);
        window.addEventListener('touchstart', unlock);
    }

    initVoices() {
        if (!this.synth) return;
        const loadVoices = () => {
            try {
                const voices = this.synth.getVoices();
                if (voices && voices.length > 0) {
                    // Set top priority to Microsoft NamMinh voice for direct browser speech
                    this.selectedVoice = voices.find(v => v.name.toLowerCase().includes('namminh') || v.name.toLowerCase().includes('nam minh')) ||
                        voices.find(v => v.lang === 'vi-VN' || v.lang.startsWith('vi')) ||
                        voices.find(v => v.lang.includes('vi')) ||
                        voices[0];
                    if (this.selectedVoice) {
                        console.log(`🎙️ [Browser Voice]: Đã kích hoạt giọng "${this.selectedVoice.name}" (${this.selectedVoice.lang})`);
                    }
                }
            } catch (e) {
                console.warn('[Voices Load Error]:', e);
            }
        };
        loadVoices();
        if (typeof this.synth.onvoiceschanged !== 'undefined') {
            this.synth.onvoiceschanged = loadVoices;
        }
    }

    setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn('⚠️ Web Speech API không được hỗ trợ trên trình duyệt này. Giọng nói vẫn có thể phát qua Chromium Speech Synthesis.');
            this.updateStatusBadge('Trình duyệt không hỗ trợ Mic');
            return;
        }

        try {
            if (this.recognition) {
                try { this.recognition.abort(); } catch (e) { }
            }
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'vi-VN'; // Primary Vietnamese speech recognition

            this.recognition.onstart = () => {
                this.isListeningState = true;
                console.log('🎙️ [SpeechRecognition]: Micro đã bật và đang lắng nghe...');
                if (!this.isListeningForPrompt && !this.isSpeaking) {
                    this.updateStatusBadge('🟢 Lắng nghe "Hey Jarvis"...');
                }
            };

            this.recognition.onresult = (event) => this.handleSpeechResult(event);
            this.recognition.onerror = (event) => this.handleSpeechError(event);
            this.recognition.onend = () => this.handleSpeechEnd();

            if (this.isWakeWordActive) {
                this.startListening();
            }
        } catch (err) {
            console.error('[VoiceManager Init Error]:', err);
        }
    }

    startListening() {
        if (!this.recognition || this.isSpeaking || this.isListeningState) return;
        try {
            this.isListeningState = true;
            this.recognition.start();
        } catch (e) {
            console.warn('[startListening Warning]:', e.name, e.message);
            this.isListeningState = false;
            // Schedule a retry regardless of error type to prevent permanent death
            setTimeout(() => {
                if (this.isWakeWordActive && !this.isSpeaking && !this.isListeningState) {
                    this.startListening();
                }
            }, 300);
        }
    }

    stopListening() {
        this.isListeningState = false;
        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch (e) {
                try { this.recognition.abort(); } catch (err) { }
            }
        }
    }

    handleSpeechResult(event) {
        if (this.isSpeaking) return;

        let fullTranscript = '';
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = 0; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
            } else {
                interimTranscript += transcript + ' ';
            }
            fullTranscript += transcript + ' ';
        }

        const rawCombined = (finalTranscript + interimTranscript).trim();
        if (!rawCombined) return;

        // Clean punctuation & normalize for keyword matching
        const cleanCombined = rawCombined
            .toLowerCase()
            .replace(/[.,?!:;]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        console.log(`🎙️ [Mic Hearing]: "${cleanCombined}"`);

        // Show live mic hearing text on status badge for visual feedback
        if (!this.isListeningForPrompt && !this.isSpeaking) {
            const snippet = cleanCombined.length > 25 ? '...' + cleanCombined.slice(-25) : cleanCombined;
            this.updateStatusBadge(`🟢 Đang nghe: "${snippet}"`);

            // 3-second silence timer: reset status badge & restart mic session if no new speech
            if (this.hearingSilenceTimer) clearTimeout(this.hearingSilenceTimer);
            this.hearingSilenceTimer = setTimeout(() => {
                if (!this.isListeningForPrompt && !this.isSpeaking) {
                    console.log('⏱️ 3s silence reached, resetting listening state...');
                    this.updateStatusBadge('🟢 Lắng nghe "Hey Jarvis"...');
                    this.stopListening();
                    setTimeout(() => this.startListening(), 200);
                }
            }, 3000);
        }

        // 1. Check for Wake Word when NOT yet listening for prompt
        if (!this.isListeningForPrompt) {
            const detectedKeyword = this.wakeKeywords.find(kw => cleanCombined.includes(kw));
            if (detectedKeyword) {
                console.log(`⚡ [Wake Word Matched!]: "${detectedKeyword}" in "${cleanCombined}"`);
                if (this.hearingSilenceTimer) clearTimeout(this.hearingSilenceTimer);

                let trailingPrompt = cleanCombined;
                this.wakeKeywords.forEach(kw => {
                    const safeKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    trailingPrompt = trailingPrompt.replace(new RegExp(safeKw, 'gi'), '');
                });
                trailingPrompt = trailingPrompt.trim();

                this.triggerWakeWordActivation(trailingPrompt);
            }
            return;
        }

        // 2. Capture Prompt after Wake Word activated
        if (this.isListeningForPrompt) {
            const chatInput = document.getElementById('chatInput');
            let cleanedPrompt = cleanCombined;
            this.wakeKeywords.forEach(kw => {
                const safeKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                cleanedPrompt = cleanedPrompt.replace(new RegExp(safeKw, 'gi'), '').trim();
            });

            if (chatInput && cleanedPrompt) {
                chatInput.value = cleanedPrompt;
            }

            // Cancel prompt timeout as soon as user starts speaking
            if (cleanedPrompt.length > 0 && this.promptTimeout) {
                clearTimeout(this.promptTimeout);
                this.promptTimeout = null;
            }

            if (cleanedPrompt.length > 0) {
                const snippet = cleanedPrompt.length > 25 ? '...' + cleanedPrompt.slice(-25) : cleanedPrompt;
                this.updateStatusBadge(`🎤 Đang nghe yêu cầu: "${snippet}"`);
            }

            // Reset silence detection timer whenever user speaks
            if (cleanedPrompt.length > 1) {
                if (this.silenceTimer) clearTimeout(this.silenceTimer);
                this.silenceTimer = setTimeout(() => {
                    if (this.isListeningForPrompt && cleanedPrompt.length > 1) {
                        this.processAndSubmitPrompt(cleanedPrompt);
                    }
                }, 1600); // 1.6 seconds of silence auto-submits query
            }

            // If final result marked by browser, process immediately
            if (finalTranscript.trim()) {
                let textToSend = finalTranscript.trim();
                this.wakeKeywords.forEach(kw => {
                    const safeKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    textToSend = textToSend.replace(new RegExp(safeKw, 'gi'), '').trim();
                });

                if (textToSend.length > 1) {
                    this.processAndSubmitPrompt(textToSend);
                }
            }
        }
    }

    processAndSubmitPrompt(textToSend) {
        if (!this.isListeningForPrompt) return;
        if (this.silenceTimer) clearTimeout(this.silenceTimer);
        if (this.promptTimeout) clearTimeout(this.promptTimeout);
        if (this.hearingSilenceTimer) clearTimeout(this.hearingSilenceTimer);

        this.isListeningForPrompt = false;
        this.hideWaveAnimation();
        this.updateStatusBadge('⚡ Đã nhận yêu cầu, đang xử lý...');
        this.submitVoiceQuery(textToSend, false);
    }

    async triggerWakeWordActivation(initialPrompt = '') {
        if (this.isSpeaking) return;

        // Clear any previous prompt / silence timers
        if (this.promptTimeout) clearTimeout(this.promptTimeout);
        if (this.silenceTimer) clearTimeout(this.silenceTimer);
        if (this.hearingSilenceTimer) clearTimeout(this.hearingSilenceTimer);

        // Auto open / pop up AI Chat window!
        this.openChatWindow();

        this.playWakeChime();
        this.isSpeaking = true;
        this.stopListening();

        const cleanInitialPrompt = (initialPrompt || '').trim();

        // Only treat as one-sentence command if prompt is at least 6 chars (real command)
        if (cleanInitialPrompt.length >= 6) {
            // Case: User said wake word + request in one sentence (e.g. "Hey da vít phân tích ghi chú")
            const ackText = `Dạ! Đã nhận yêu cầu của sếp, em đang xử lý đây ạ!`;
            this.updateStatusBadge(`⚡ Jarvis: "${ackText}"`);
            this.showWaveAnimation(`Jarvis: Đã nhận yêu cầu...`);
            this.appendGreetingMessage(ackText);

            this.speakText("Dạ! Đã nhận yêu cầu của sếp, em đang xử lý đây ạ!").catch(() => { });

            this.isSpeaking = false;
            this.submitVoiceQuery(cleanInitialPrompt, true); // true = skip duplicate TTS acknowledgment
            return;
        }

        // Case: User called wake word ("Hey Da Vít" / "Hey Jarvis") -> AI MUST RESPOND FIRST OUT LOUD
        const greetingText = "Dạ! Em nghe đây sếp, sếp cần gì ạ?";
        this.updateStatusBadge(`⚡ Jarvis: "${greetingText}"`);
        this.showWaveAnimation(`Jarvis: ${greetingText}`);
        this.appendGreetingMessage(greetingText);

        // Speak greeting out loud via Electron/Chromium SpeechSynthesis BEFORE listening for command
        await this.speakText(greetingText);

        // Transition to active prompt capture mode AFTER greeting completes
        this.isSpeaking = false;
        this.isListeningForPrompt = true;
        this.initAudioAnalyser();

        this.updateStatusBadge('🎤 Đang lắng nghe sếp nói yêu cầu...');
        this.showWaveAnimation('Sếp ơi, hãy nói câu hỏi/yêu cầu...');

        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.value = '';
            chatInput.placeholder = 'Sếp ơi, hãy nói câu hỏi/yêu cầu...';
            chatInput.focus();
        }

        // Clean mic session restart for prompt capture
        this.stopListening();
        setTimeout(() => {
            if (this.isWakeWordActive && this.isListeningForPrompt) {
                this.startListening();
            }
        }, 150);

        // 8-second safety timeout if user doesn't speak any command after greeting
        if (this.promptTimeout) clearTimeout(this.promptTimeout);
        this.promptTimeout = setTimeout(() => {
            if (this.isListeningForPrompt) {
                console.log('⏱️ 8s Prompt timeout reached without speech, resetting to wake word mode.');
                this.isListeningForPrompt = false;
                this.hideWaveAnimation();
                this.updateStatusBadge('🟢 Lắng nghe "Hey Jarvis"...');
                if (chatInput) {
                    chatInput.placeholder = 'Nói "Hey Jarvis" hoặc nhập câu hỏi...';
                }
                this.stopListening();
                setTimeout(() => this.startListening(), 200);
            }
        }, 8000);
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
            chatBox.classList.add('flex', 'scale-100', 'opacity-100', 'ring-4', 'ring-cyan-400', 'shadow-[0_0_60px_rgba(56,189,248,0.9)]');
            setTimeout(() => {
                chatBox.classList.remove('ring-4', 'ring-cyan-400', 'shadow-[0_0_60px_rgba(56,189,248,0.9)]');
            }, 3000);
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

    appendGreetingMessage(text) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;

        const aiDiv = document.createElement('div');
        aiDiv.className = 'bg-transparent p-1.5 text-slate-100 self-start mr-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] transition-all animate-fadeIn';
        aiDiv.innerHTML = `
            <strong class="text-cyan-300 font-bold text-xs flex items-center justify-between mb-1 text-glow">
                <span class="flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-sm text-cyan-400">smart_toy</span>
                    AI JarVis Assistant:
                    <span class="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-1 py-0.2 rounded font-mono">Chromium Voice</span>
                </span>
            </strong>
            <div class="text-slate-100 font-medium text-xs leading-relaxed border-t border-purple-500/20 pt-1 mt-0.5">
                ${text}
            </div>
        `;
        chatMessages.appendChild(aiDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    handleSpeechError(event) {
        this.isListeningState = false;
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            console.warn('[SpeechRecognition Error]: Quyền Mic bị từ chối hoặc bị khóa.');
            this.updateStatusBadge('⚠️ Click vào màn hình để cấp quyền Mic');
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
            console.warn('[SpeechRecognition Error]:', event.error);
        }
    }

    handleSpeechEnd() {
        this.isListeningState = false;
        // Automatically restart speech recognition if wake word active and not speaking
        if (this.isWakeWordActive && !this.isSpeaking) {
            setTimeout(() => this.startListening(), 300);
        }
    }

    bindUIControls() {
        const btnWakeWordToggle = document.getElementById('btnWakeWordToggle');
        const btnMicToggle = document.getElementById('btnMicToggle');
        const btnMinimizeChat = document.getElementById('btnMinimizeChat');
        const jarvisMinPill = document.getElementById('jarvisMinPill');

        if (btnWakeWordToggle) {
            btnWakeWordToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.isWakeWordActive = !this.isWakeWordActive;
                const wakeWordIcon = document.getElementById('wakeWordIcon');
                const wakeWordBtnLabel = document.getElementById('wakeWordBtnLabel');

                if (this.isWakeWordActive) {
                    this.startListening();
                    if (wakeWordIcon) wakeWordIcon.className = 'material-symbols-outlined text-[13px] text-emerald-400';
                    if (wakeWordBtnLabel) wakeWordBtnLabel.textContent = 'Hey Jarvis: ON';
                    this.updateStatusBadge('Lắng nghe "Hey Jarvis / Hey Da Vít"...');
                } else {
                    this.stopListening();
                    if (wakeWordIcon) wakeWordIcon.className = 'material-symbols-outlined text-[13px] text-slate-400';
                    if (wakeWordBtnLabel) wakeWordBtnLabel.textContent = 'Hey Jarvis: OFF';
                    this.updateStatusBadge('Tắt lắng nghe tự động');
                    this.hideWaveAnimation();
                }
            });
        }

        if (btnMicToggle) {
            btnMicToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.triggerWakeWordActivation();
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
                this.triggerWakeWordActivation();
            });
        }
    }

    async submitVoiceQuery(query, skipAck = false) {
        if (!query || !query.trim()) return;

        if (this.promptTimeout) clearTimeout(this.promptTimeout);
        if (this.silenceTimer) clearTimeout(this.silenceTimer);
        if (this.hearingSilenceTimer) clearTimeout(this.hearingSilenceTimer);

        this.isListeningForPrompt = false;
        this.isSpeaking = true;
        this.stopListening();
        this.updateStatusBadge('⚡ Đã nhận yêu cầu, đang xử lý...');

        const chatForm = document.getElementById('chatForm');
        const chatInput = document.getElementById('chatInput');
        if (chatInput) chatInput.value = query;

        // 1. Immediately send chat message to AI backend without delay!
        if (typeof window.sendChatMessage === 'function') {
            window.sendChatMessage(query, true); // true = voice request
        }

        // 2. Play vocal acknowledgment in background if requested
        if (!skipAck) {
            this.speakText("Dạ! Đã nhận yêu cầu của sếp, em đang xử lý đây ạ!").catch(() => { });
        }
    }

    // Play Voice Response using Electron/Chromium SpeechSynthesis
    async playVoiceResponse(audioData, mimeType, replyText) {
        this.isSpeaking = true;
        this.stopListening();
        this.showWaveAnimation('Jarvis đang trả lời (Electron/Chromium Voice)...');

        if (audioData) {
            try {
                await this.playAudioFromBase64(audioData, mimeType || 'audio/wav');
            } catch (err) {
                await this.speakText(replyText);
            }
        } else {
            await this.speakText(replyText);
        }

        this.isSpeaking = false;
        this.hideWaveAnimation();
        this.updateStatusBadge('Lắng nghe "Hey Jarvis / Hey Da Vít"...');
        if (this.isWakeWordActive) {
            setTimeout(() => this.startListening(), 300);
        }
    }

    async speakText(text) {
        const cleanText = this.cleanTextForSpeech(text);
        if (!cleanText) return;

        // 1. Try playing via Server Audio Stream API (/api/tts) first for 100% guaranteed voice playback
        try {
            if (this.currentAudio) {
                try { this.currentAudio.pause(); } catch (e) { }
            }
            const ttsUrl = `/api/tts?text=${encodeURIComponent(cleanText)}`;
            this.currentAudio = new Audio(ttsUrl);

            await new Promise((resolve, reject) => {
                let completed = false;
                const finish = () => {
                    if (completed) return;
                    completed = true;
                    this.updateOrbBubble(0);
                    resolve();
                };

                this.currentAudio.onended = () => finish();
                this.currentAudio.onerror = (e) => reject(e);

                const simulatedVolInterval = setInterval(() => {
                    if (this.isSpeaking && this.currentAudio && !this.currentAudio.paused) {
                        const simulatedVol = Math.floor(Math.random() * 45) + 35;
                        this.updateOrbBubble(simulatedVol);
                    } else {
                        clearInterval(simulatedVolInterval);
                    }
                }, 100);

                this.currentAudio.play().catch(err => {
                    clearInterval(simulatedVolInterval);
                    reject(err);
                });
            });
            return;
        } catch (err) {
            console.warn('[Server Audio Playback fallback to SpeechSynthesis]:', err);
        }

        // 2. Fallback to Web SpeechSynthesis if server audio stream fails
        return new Promise((resolve) => {
            if (!this.synth) {
                console.warn('⚠️ Web Speech Synthesis (SpeechSynthesis) không được hỗ trợ trên môi trường này.');
                return resolve();
            }

            try {
                if (this.synth.paused) {
                    this.synth.resume();
                }
                this.synth.cancel();
            } catch (e) { }

            if (!this.selectedVoice) {
                this.initVoices();
            }

            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.lang = 'vi-VN';
            utterance.rate = 1.0;
            utterance.pitch = 1.0;

            if (this.selectedVoice) {
                utterance.voice = this.selectedVoice;
            }

            let completed = false;
            const finish = () => {
                if (completed) return;
                completed = true;
                clearInterval(simulatedVolInterval);
                clearTimeout(safetyTimeout);
                this.updateOrbBubble(0);
                resolve();
            };

            const simulatedVolInterval = setInterval(() => {
                if (this.isSpeaking) {
                    const simulatedVol = Math.floor(Math.random() * 45) + 35;
                    this.updateOrbBubble(simulatedVol);
                } else {
                    clearInterval(simulatedVolInterval);
                }
            }, 100);

            const timeoutMs = Math.max(3000, (cleanText.length / 10) * 1000 + 3000);
            const safetyTimeout = setTimeout(() => {
                finish();
            }, timeoutMs);

            utterance.onend = () => finish();
            utterance.onerror = (err) => finish();

            try {
                this.synth.speak(utterance);
                if (this.synth.paused) {
                    this.synth.resume();
                }
            } catch (err) {
                finish();
            }
        });
    }

    cleanTextForSpeech(text) {
        if (!text) return '';
        return text
            .replace(/```[\s\S]*?```/g, ' Đã có đoạn mã đính kèm. ')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/[*#_~>]/g, '')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/https?:\/\/\S+/g, '')
            .replace(/---\n?/g, '')
            .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
            .slice(0, 500)
            .trim();
    }

    speakWithFallback(text) {
        return this.speakText(text);
    }

    playAudioFromBase64(base64Data, mimeType) {
        return new Promise((resolve, reject) => {
            try {
                if (this.currentAudio) {
                    try { this.currentAudio.pause(); } catch (e) { }
                }
                const audioSrc = `data:${mimeType};base64,${base64Data}`;
                this.currentAudio = new Audio(audioSrc);
                this.currentAudio.onended = () => resolve();
                this.currentAudio.onerror = (e) => reject(e);
                this.currentAudio.play().catch(err => reject(err));
            } catch (err) {
                reject(err);
            }
        });
    }

    playWakeChime() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            if (!this.audioCtx) this.audioCtx = new AudioCtx();
            if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

            const osc1 = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();

            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(587.33, this.audioCtx.currentTime); // D5 note
            osc1.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.15); // A5 note

            gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.3);

            osc1.connect(gain);
            gain.connect(this.audioCtx.destination);

            osc1.start();
            osc1.stop(this.audioCtx.currentTime + 0.3);
        } catch (e) {
            // Audio context permission error, silent ignore
        }
    }

    async initAudioAnalyser() {
        if (this.analyser) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!this.audioCtx) this.audioCtx = new AudioCtx();
            if (this.audioCtx.state === 'suspended') await this.audioCtx.resume();

            const source = this.audioCtx.createMediaStreamSource(stream);
            this.analyser = this.audioCtx.createAnalyser();
            this.analyser.fftSize = 256;
            source.connect(this.analyser);

            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            this.startVolumeLoop();
        } catch (err) {
            console.warn('[AudioAnalyser Error]:', err);
        }
    }

    startVolumeLoop() {
        if (this.isAnalysing) return;
        this.isAnalysing = true;

        const updateVolume = () => {
            if (!this.isAnalysing) return;

            if (this.analyser && this.isListeningForPrompt) {
                this.analyser.getByteFrequencyData(this.dataArray);
                let sum = 0;
                for (let i = 0; i < this.dataArray.length; i++) {
                    sum += this.dataArray[i];
                }
                const average = sum / this.dataArray.length;
                const volumePercent = Math.min(100, Math.round((average / 128) * 100));

                this.updateOrbBubble(volumePercent);
            } else if (this.isSpeaking) {
                // Pulsing animation while AI speaks
                const simulatedVol = Math.floor(Math.random() * 45) + 35;
                this.updateOrbBubble(simulatedVol);
            } else {
                this.updateOrbBubble(0);
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

        if (this.isListeningForPrompt || this.isSpeaking) {
            orbContainer.classList.remove('hidden');
            orbContainer.classList.add('flex');

            const scale = 1 + (volumePercent / 100) * 0.55;
            const glowRadius = 25 + Math.round((volumePercent / 100) * 45);
            const glowOpacity = 0.5 + (volumePercent / 100) * 0.5;

            orbBubble.style.transform = `scale(${scale.toFixed(2)})`;
            orbBubble.style.boxShadow = `0 0 ${glowRadius}px rgba(56, 189, 248, ${glowOpacity.toFixed(2)})`;

            if (volPercentText) {
                volPercentText.textContent = `${volumePercent}%`;
            }
        } else {
            orbContainer.classList.add('hidden');
            orbContainer.classList.remove('flex');
            orbBubble.style.transform = 'scale(1)';
        }
    }

    showWaveAnimation(label) {
        const waveContainer = document.getElementById('voiceWaveContainer');
        const waveLabel = document.getElementById('voiceWaveLabel');
        if (waveContainer) waveContainer.classList.remove('hidden');
        if (waveContainer) waveContainer.classList.add('flex');
        if (waveLabel && label) waveLabel.textContent = label;
    }

    hideWaveAnimation() {
        const waveContainer = document.getElementById('voiceWaveContainer');
        if (waveContainer) waveContainer.classList.add('hidden');
        if (waveContainer) waveContainer.classList.remove('flex');
        this.updateOrbBubble(0);
    }

    updateStatusBadge(text) {
        const statusText = document.getElementById('voiceStatusText');
        if (statusText) statusText.textContent = text;
    }
}

// Global instance initialization
window.jarvisVoice = new JarvisVoiceManager();

