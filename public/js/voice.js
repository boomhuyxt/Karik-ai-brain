/**
 * Jarvis AI Voice Manager
 * Handles 'Hey Jarvis' Wake Word Detection & Gemini 3.1 Flash TTS (Iapetus Voice) Playback
 */
class JarvisVoiceManager {
    constructor() {
        this.isWakeWordActive = true;
        this.isListeningForPrompt = false;
        this.isSpeaking = false;
        this.recognition = null;
        this.currentAudio = null;
        this.audioCtx = null;
        
        // Target keywords for wake word trigger (including Vietnamese phonetic variations)
        this.wakeKeywords = [
            'nối hay jarvis', 'nói hay jarvis', 'nối hay harvis', 'nói hay harvis', 'nối hay davis', 'nói hay davis',
            'hey jarvis', 'hey harvis', 'hey davis',
            'hay jarvis', 'hay harvis', 'hay davis',
            'hi jarvis', 'hi harvis', 'hi davis',
            'chào jarvis', 'chào harvis', 'chào davis',
            'ơi jarvis', 'ơi harvis', 'ơi davis',
            'ok jarvis', 'ok harvis', 'ok davis',
            'jarvis', 'harvis', 'davis',
            'gia vít', 'ha vít', 'đa vít'
        ].sort((a, b) => b.length - a.length);
    }

    init() {
        this.setupSpeechRecognition();
        this.bindUIControls();
        this.updateStatusBadge('Lắng nghe "Hey Jarvis"...');
    }

    setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn('⚠️ Web Speech API không được hỗ trợ trên trình duyệt này. Giọng nói vẫn có thể phát qua Gemini TTS.');
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

        // 1. Check for Wake Word "Hey Jarvis"
        if (!this.isListeningForPrompt) {
            const detectedKeyword = this.wakeKeywords.find(kw => combinedText.includes(kw));
            if (detectedKeyword) {
                console.log(`🎙️ Wake Word Detected: "${detectedKeyword}"`);
                this.triggerWakeWordActivation();
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

    async triggerWakeWordActivation() {
        if (this.isSpeaking) return;

        // Auto open / pop up AI Chat window!
        this.openChatWindow();

        this.playWakeChime();
        this.isSpeaking = true;
        this.stopListening();

        const greetingText = "Sếp cần gì ạ?";
        this.updateStatusBadge(`⚡ Jarvis: "${greetingText}"`);
        this.showWaveAnimation(`Jarvis: ${greetingText}`);
        this.appendGreetingMessage(greetingText);

        // Speak "Sếp cần gì ạ?" out loud to the user
        await this.speakWithFallback(greetingText);

        // Transition to active prompt capture mode after greeting
        this.isSpeaking = false;
        this.isListeningForPrompt = true;
        this.initAudioAnalyser();

        this.updateStatusBadge('🎤 Đang lắng nghe sếp nói...');
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
                    <span class="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-400/40 px-1 py-0.2 rounded font-mono">Orus Voice</span>
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
                    this.updateStatusBadge('Lắng nghe "Hey Jarvis"...');
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

    submitVoiceQuery(query) {
        const chatForm = document.getElementById('chatForm');
        const chatInput = document.getElementById('chatInput');
        if (chatInput) chatInput.value = query;

        if (chatForm && typeof window.sendChatMessage === 'function') {
            window.sendChatMessage(query, true); // true indicates voice request
        }
    }

    // Play Gemini 3.1 Flash TTS Audio or fallback
    async playVoiceResponse(audioData, mimeType, replyText) {
        this.isSpeaking = true;
        this.stopListening();
        this.showWaveAnimation('Jarvis đang trả lời (Giọng Iapetus)...');

        if (audioData) {
            try {
                await this.playAudioFromBase64(audioData, mimeType || 'audio/wav');
            } catch (err) {
                console.warn('[Audio Playback Failed, using SpeechSynthesis]:', err);
                await this.speakWithFallback(replyText);
            }
        } else {
            await this.speakWithFallback(replyText);
        }

        this.isSpeaking = false;
        this.hideWaveAnimation();
        this.updateStatusBadge('Lắng nghe "Hey Jarvis"...');
        if (this.isWakeWordActive) {
            this.startListening();
        }
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

    speakWithFallback(text) {
        return new Promise((resolve) => {
            if (!('speechSynthesis' in window)) {
                return resolve();
            }
            window.speechSynthesis.cancel();

            // Clean text markdown before speaking
            const cleanText = text
                .replace(/[*#`_~>]/g, '')
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                .replace(/---/g, '')
                .slice(0, 300); // Limit fallback speech length

            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.lang = 'vi-VN';
            utterance.rate = 1.0;
            utterance.pitch = 1.0;

            utterance.onend = () => resolve();
            utterance.onerror = () => resolve();

            window.speechSynthesis.speak(utterance);
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

            // Dynamic scale (from 1.0 up to 1.6x) and pulsing glow shadow according to real-time audio volume
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
