(function (root, factory) {
    const api = factory(root);
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root && root.document) {
        root.imageStudioPersonalization = api;
        root.initImageStudioPersonalization = api.init;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
    const PREFERENCES_KEY = 'karik_image_preferences';
    const HISTORY_KEY = 'karik_image_history';
    const MAX_HISTORY = 12;
    let selectedDesign = null;
    let latestVariants = [];
    let isInitialized = false;

    function safeParse(value, fallback) {
        try { return JSON.parse(value); } catch (error) { return fallback; }
    }

    function getUserSuffix(storage) {
        const user = safeParse(storage.getItem('user_info') || '{}', {});
        return String(user.email || user.id || 'guest').toLowerCase().replace(/[^a-z0-9@._-]/g, '');
    }

    function scopedKey(storage, key) {
        return `${key}:${getUserSuffix(storage)}`;
    }

    function normalizePreferences(value) {
        const source = value && typeof value === 'object' ? value : {};
        const brandColors = Array.isArray(source.brandColors)
            ? source.brandColors.filter(color => /^#[0-9a-f]{6}$/i.test(color)).slice(0, 4)
            : [];
        return {
            preferredStyles: Array.isArray(source.preferredStyles) ? [...new Set(source.preferredStyles)].slice(0, 6) : [],
            avoidedStyles: Array.isArray(source.avoidedStyles) ? [...new Set(source.avoidedStyles)].slice(0, 6) : [],
            brandColors,
            mood: String(source.mood || '').trim().slice(0, 80),
            audience: String(source.audience || '').trim().slice(0, 120),
            industry: String(source.industry || '').trim().slice(0, 80),
            density: ['airy', 'balanced', 'dense'].includes(source.density) ? source.density : 'balanced'
        };
    }

    function readPreferences(storage = root.localStorage) {
        if (!storage) return normalizePreferences({});
        return normalizePreferences(safeParse(storage.getItem(scopedKey(storage, PREFERENCES_KEY)) || '{}', {}));
    }

    function savePreferences(preferences, storage = root.localStorage) {
        const normalized = normalizePreferences(preferences);
        if (storage) storage.setItem(scopedKey(storage, PREFERENCES_KEY), JSON.stringify(normalized));
        return normalized;
    }

    function readHistory(storage = root.localStorage) {
        if (!storage) return [];
        const history = safeParse(storage.getItem(scopedKey(storage, HISTORY_KEY)) || '[]', []);
        return Array.isArray(history) ? history.slice(-MAX_HISTORY) : [];
    }

    function appendHistory(design, storage = root.localStorage) {
        if (!design || !design.signature) return readHistory(storage);
        const entry = {
            style: String(design.style || ''),
            layout: String(design.layout || ''),
            palette: String(design.palette || ''),
            signature: String(design.signature),
            createdAt: new Date().toISOString()
        };
        const history = readHistory(storage).filter(item => item.signature !== entry.signature);
        history.push(entry);
        const trimmed = history.slice(-MAX_HISTORY);
        if (storage) storage.setItem(scopedKey(storage, HISTORY_KEY), JSON.stringify(trimmed));
        return trimmed;
    }

    function getContext(storage = root.localStorage) {
        return { preferences: readPreferences(storage), history: readHistory(storage) };
    }

    function fieldValue(id) {
        return root.document?.getElementById(id)?.value?.trim() || '';
    }

    function getAspectRatio() {
        const preset = root.document?.getElementById('canvasPresetSelect')?.value || '1080x1350';
        return ({ '1080x1080': '1:1', '1080x1350': '4:5', '1080x1920': '9:16', '1920x1080': '16:9', '1200x1800': '2:3' })[preset] || '4:5';
    }

    function readForm() {
        const preferredStyle = fieldValue('studioPreferredStyle');
        const brandColors = [fieldValue('studioBrandColorPrimary'), fieldValue('studioBrandColorAccent')].filter(Boolean);
        return {
            brief: fieldValue('studioCreativeBrief'),
            aspectRatio: getAspectRatio(),
            variantCount: 3,
            preferences: normalizePreferences({
                preferredStyles: preferredStyle ? [preferredStyle] : [],
                brandColors,
                mood: fieldValue('studioMood'),
                audience: fieldValue('studioAudience'),
                industry: fieldValue('studioIndustry'),
                density: fieldValue('studioDensity')
            }),
            copy: {
                title: fieldValue('studioPosterTitle'),
                subtitle: fieldValue('studioPosterSubtitle'),
                cta: fieldValue('studioPosterCta')
            },
            history: readHistory()
        };
    }

    function setStatus(message, tone = 'info') {
        const status = root.document?.getElementById('studioCreativeStatus');
        if (!status) return;
        status.textContent = message;
        status.className = `text-[10px] ${tone === 'error' ? 'text-rose-300' : tone === 'success' ? 'text-emerald-300' : 'text-cyan-300'}`;
    }

    function populateForm() {
        const preferences = readPreferences();
        const values = {
            studioPreferredStyle: preferences.preferredStyles[0] || '',
            studioBrandColorPrimary: preferences.brandColors[0] || '#1D4ED8',
            studioBrandColorAccent: preferences.brandColors[1] || '#F59E0B',
            studioMood: preferences.mood,
            studioAudience: preferences.audience,
            studioIndustry: preferences.industry,
            studioDensity: preferences.density
        };
        Object.entries(values).forEach(([id, value]) => {
            const element = root.document?.getElementById(id);
            if (element) element.value = value;
        });
    }

    function renderVariants(variants) {
        const container = root.document?.getElementById('studioAiVariants');
        if (!container) return;
        container.innerHTML = variants.map((design, index) => {
            const colors = design.canvas?.background?.stops?.map(stop => stop.color) || [];
            const swatches = colors.map(color => `<span class="w-3 h-3 rounded-full border border-white/20" style="background:${color}"></span>`).join('');
            return `<button type="button" data-studio-variant="${index}" class="w-full p-2.5 rounded-xl bg-slate-950/80 border border-slate-700 hover:border-cyan-400 text-left transition-all">
                <span class="flex items-center justify-between gap-2"><strong class="text-[11px] text-white">${design.styleLabel}</strong><span class="flex gap-1">${swatches}</span></span>
                <span class="block text-[9px] text-slate-400 mt-1">${design.layout.replace(/_/g, ' ')} · ${design.palette}</span>
            </button>`;
        }).join('');
        container.classList.remove('hidden');
    }

    async function requestJson(url, body, method = 'POST') {
        const options = { method, headers: { 'Content-Type': 'application/json' } };
        if (body !== undefined) options.body = JSON.stringify(body);
        const response = await root.fetch(url, {
            ...options
        });
        const data = await response.json();
        if (!response.ok || data.error) throw new Error(data.message || data.error || 'Studio request failed');
        return data;
    }

    function applyDesign(design, imageSource) {
        selectedDesign = design;
        appendHistory(design);
        requestJson('/api/image/profile/history', { design }).catch(() => {});
        const source = imageSource || root.lastUploadedImageUrl || root.lastStudioEditedImage || null;
        if (typeof root.createPosterFromImage === 'function') root.createPosterFromImage(source, design);
        setStatus(`Đã áp dụng ${design.styleLabel}. Lần tạo sau sẽ tránh lặp kiểu này.`, 'success');
    }

    async function createVariants() {
        const payload = readForm();
        if (!payload.brief) {
            setStatus('Hãy nhập mục tiêu hoặc nội dung poster trước.', 'error');
            return [];
        }
        setStatus('Đang lập 3 art direction khác biệt...');
        const data = await requestJson('/api/image/design', payload);
        latestVariants = data.variants || [];
        selectedDesign = latestVariants[0] || null;
        if (root.document?.getElementById('studioRememberPreferences')?.checked) {
            savePreferences(payload.preferences);
            requestJson('/api/image/profile', { preferences: payload.preferences }, 'PUT').catch(() => {});
        }
        renderVariants(latestVariants);
        setStatus(`Đã tạo ${latestVariants.length} phương án không trùng lịch sử.`, 'success');
        return latestVariants;
    }

    async function generateKeyVisual() {
        try {
            if (!selectedDesign) await createVariants();
            if (!selectedDesign) return;
            setStatus('Đang sinh key visual không chứa chữ...');
            const data = await requestJson('/api/image/generate', { design: selectedDesign, aspectRatio: selectedDesign.preset });
            if (!data.imageData) throw new Error('Image provider did not return an image');
            const generatedDesign = data.design || selectedDesign;
            const visualLayer = generatedDesign.layers.find(layer => layer.id === 'main_subject');
            const overlayLayers = generatedDesign.layers.filter(layer => layer.id !== 'main_subject');
            const hybridDesign = {
                ...generatedDesign,
                layers: [
                    { ...visualLayer, id: 'generated_key_visual', x: 50, y: 50, width: 100, height: 100, fit: 'cover', removeBackground: false },
                    ...overlayLayers
                ]
            };
            applyDesign(hybridDesign, data.imageData);
            root.lastGeneratedKeyVisual = data.imageData;
            setStatus('Đã ghép key visual AI với typography có thể chỉnh sửa.', 'success');
        } catch (error) {
            setStatus(error.message, 'error');
        }
    }

    async function hydrateRemoteProfile() {
        try {
            const data = await requestJson('/api/image/profile', undefined, 'GET');
            if (data.preferences && Object.keys(data.preferences).length) savePreferences(data.preferences);
            if (Array.isArray(data.history) && root.localStorage) {
                root.localStorage.setItem(scopedKey(root.localStorage, HISTORY_KEY), JSON.stringify(data.history.slice(-MAX_HISTORY)));
            }
            populateForm();
        } catch (error) {
            // Local preferences remain available when the server is offline.
        }
    }

    function init() {
        if (isInitialized || !root.document?.getElementById('studioCreativeBrief')) return false;
        populateForm();
        hydrateRemoteProfile();
        root.document.getElementById('btnStudioCreateVariants')?.addEventListener('click', () => {
            createVariants().catch(error => setStatus(error.message, 'error'));
        });
        root.document.getElementById('btnStudioGenerateVisual')?.addEventListener('click', generateKeyVisual);
        root.document.getElementById('studioAiVariants')?.addEventListener('click', event => {
            const button = event.target.closest('[data-studio-variant]');
            if (!button) return;
            const design = latestVariants[Number(button.dataset.studioVariant)];
            if (design) applyDesign(design);
        });
        isInitialized = true;
        return true;
    }

    return { init, normalizePreferences, readPreferences, savePreferences, readHistory, appendHistory, getContext };
});
