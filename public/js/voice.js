/**
 * Jarvis AI Voice Manager
 * Handles 'Hey Jarvis' Wake Word Detection & Electron/Chromium Web Speech API Voice Playback
 */
class JarvisVoiceManager {
    constructor() {
        this.isWakeWordActive = true;
        this.isListeningForPrompt = false;
        this.isSpeaking = false;
        this.recognition = null;
        this.synth = window.speechSynthesis || null;
        this.selectedVoice = null;
        this.currentAudio = null;
        this.audioCtx = null;
        
        // Target keywords for wake word trigger (including Vietnamese phonetic variations)
        this.wakeKeywords = [
            'nối hay jarvis', 'nói hay jarvis', 'nối hay harvis', 'nói hay harvis', 'nối hay davis', 'nói hay davis', 'nối hey da vít', 'nói hey da vít',
            'hey jarvis', 'hey harvis', 'hey davis', 'hey da vít', 'hey đa vít', 'hey davit',
            'hay jarvis', 'hay harvis', 'hay davis', 'hay da vít', 'hay đa vít',
            'hi jarvis', 'hi harvis', 'hi davis', 'hi da vít',
            'chào jarvis', 'chào harvis', 'chào davis', 'chào da vít',
            'ơi jarvis', 'ơi harvis', 'ơi davis', 'ơi da vít',
            'ok jarvis', 'ok harvis', 'ok davis', 'ok da vít',
            'jarvis', 'harvis', 'davis', 'da vít', 'đa vít',
            'gia vít', 'ha vít'
        ].sort((a, b) => b.length - a.length);
    }

    init() {
        this.setupSpeechRecognition();
        this.initVoices();
        this.bindUIControls();
        this.updateStatusBadge('Lắng nghe "Hey Jarvis / Hey Da Vít"...');
    }

    initVoices() {
        if (!this.synth) return;
        const loadVoices = () => {
            try {
                const voices = this.synth.getVoices();
                if (voices && voices.length > 0) {
                    this.selectedVoice = voices.find(v => v.lang === 'vi-VN' || v.lang.startsWith('vi')) || 
                                        voices.find(v => v.lang.includes('vi')) || 
                                        voices[0];
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
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'vi-VN'; // Primary Vietnamese speech recognition

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
        if (!this.recognition || this.isSpeaking) return;
        try {
            this.recognition.start();
        } catch (e) {
            // Recognition might already be running
        }
    }

    stopListening() {
        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch (e) {}
        }
    }

    handleSpeechResult(event) {
        if (this.isSpeaking) return;

        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript.toLowerCase().trim();
            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
            } else {
                interimTranscript += transcript + ' ';
            }
        }

        const combinedText = (finalTranscript + interimTranscript).trim();

        // 1. Check for Wake Word in wakeKeywords list
        if (!this.isListeningForPrompt) {
            const detectedKeyword = this.wakeKeywords.find(kw => combinedText.includes(kw));
            if (detectedKeyword) {
                console.log(`🎙️ Wake Word Detected: "${detectedKeyword}" in "${combinedText}"`);
                
                // Extract any prompt text spoken immediately after wake word
                let trailingPrompt = combinedText;
                this.wakeKeywords.forEach(kw => {
                    trailingPrompt = trailingPrompt.replace(new RegExp(`^.*?${kw}`, 'i'), '').trim();
                });

                this.triggerWakeWordActivation(trailingPrompt);
            }
            return;
        }

        // 2. Capture Prompt after Wake Word activated
        if (this.isListeningForPrompt) {
            const chatInput = document.getElementById('chatInput');
            if (chatInput && combinedText) {
                // Strip the wake word prefix if present in the prompt
                let cleanedPrompt = combinedText;
                this.wakeKeywords.forEach(kw => {
                    cleanedPrompt = cleanedPrompt.replace(new RegExp(`^${kw}`, 'i'), '').trim();
                });
                if (cleanedPrompt) {
                    chatInput.value = cleanedPrompt;
                }
            }

            // If final result, send query automatically
            if (finalTranscript.trim()) {
                let textToSend = finalTranscript.trim();
                this.wakeKeywords.forEach(kw => {
                    textToSend = textToSend.replace(new RegExp(`^${kw}`, 'i'), '').trim();
                });

                if (textToSend.length > 1) {
                    this.isListeningForPrompt = false;
                    this.hideWaveAnimation();
                    this.updateStatusBadge('Đang gửi câu hỏi...');
                    this.submitVoiceQuery(textToSend);
                }
            }
        }
    }

    async triggerWakeWordActivation(initialPrompt = '') {
        if (this.isSpeaking) return;

        // Auto open / pop up AI Chat window!
        this.openChatWindow();

        this.playWakeChime();
        this.isSpeaking = true;
        this.stopListening();

        const cleanInitialPrompt = (initialPrompt || '')
            .replace(new RegExp(this.wakeKeywords.join('|'), 'gi'), '')
            .trim();

        if (cleanInitialPrompt.length > 2) {
            // Case: User said wake word + request in one sentence (e.g. "Hey da vít phân tích ghi chú")
            const ackText = `Dạ! Đã nhận yêu cầu của sếp, em đang xử lý đây ạ!`;
            this.updateStatusBadge(`⚡ Jarvis: "${ackText}"`);
            this.showWaveAnimation(`Jarvis: Đã nhận yêu cầu...`);
            this.appendGreetingMessage(ackText);

            await this.speakText("Dạ! Đã nhận yêu cầu của sếp, em đang xử lý đây ạ!");

            this.isSpeaking = false;
            this.submitVoiceQuery(cleanInitialPrompt);
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

        if (this.isWakeWordActive) {
            this.startListening();
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
        if (event.error !== 'no-speech') {
            console.warn('[SpeechRecognition Error]:', event.error);
        }
    }

    handleSpeechEnd() {
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
            btnWakeWordToggle.addEventListener('click', () => {
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
            btnMicToggle.addEventListener('click', () => {
                this.triggerWakeWordActivation();
            });
        }

        if (btnMinimizeChat) {
            btnMinimizeChat.addEventListener('click', () => {
                this.minimizeChatWindow();
            });
        }

        if (jarvisMinPill) {
            jarvisMinPill.addEventListener('click', () => {
                this.openChatWindow();
            });
        }
    }

    async submitVoiceQuery(query) {
        if (!query) return;

        this.isSpeaking = true;
        this.stopListening();
        this.updateStatusBadge('⚡ Đã nhận yêu cầu, đang xử lý...');
        
        // Speak vocal acknowledgment out loud
        await this.speakText("Dạ! Đã nhận yêu cầu của sếp, em đang xử lý đây ạ!");
        
        this.isSpeaking = false;

        const chatForm = document.getElementById('chatForm');
        const chatInput = document.getElementById('chatInput');
        if (chatInput) chatInput.value = query;

        if (chatForm && typeof window.sendChatMessage === 'function') {
            window.sendChatMessage(query, true); // true indicates voice request
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
            this.startListening();
        }
    }

    speakText(text) {
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
            } catch (e) {}

            const cleanText = this.cleanTextForSpeech(text);
            if (!cleanText) return resolve();

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
                console.warn('[SpeechSynthesis Safety Timeout triggered]');
                finish();
            }, timeoutMs);

            utterance.onend = () => finish();
            utterance.onerror = (err) => {
                console.warn('[SpeechSynthesis Error]:', err);
                finish();
            };

            try {
                this.synth.speak(utterance);
                if (this.synth.paused) {
                    this.synth.resume();
                }
            } catch (err) {
                console.error('[SpeechSynthesis Speak Error]:', err);
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
                    this.currentAudio.pause();
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

