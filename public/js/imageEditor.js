/**
 * AI Karik Image & Poster Studio Module
 * Comprehensive 3-Column Layered Canvas Editor with Filters, Background Removal,
 * Typography, Shapes, Transform, and Chat Integration.
 */

(function () {
    let canvas = null;
    let canvasWidth = 1080;
    let canvasHeight = 1350;
    let currentZoom = 1;
    let isCropping = false;
    let cropRect = null;
    let cropRatio = 'free';

    // History undo/redo state
    const history = [];
    let historyIndex = -1;
    let isStateProcessing = false;

    // Active layer filters state
    const activeFilters = {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        blur: 0,
        sharpen: 0,
        hue: 0
    };

    let isModuleInitialized = false;

    /**
     * Initialize the Studio Module
     */
    window.initImageEditorModule = function () {
        const modal = document.getElementById('imageEditorModal');
        if (!modal) return false;

        if (isModuleInitialized) return true;

        initFabricCanvas();
        setupEventListeners();
        setupTabs();
        setupPresetsAndDimensions();
        setupUploadAndAi();
        setupTypography();
        setupShapes();
        setupAdjustmentsAndFilters();
        setupTransformAndCrop();
        setupBackgroundTools();
        setupLayerManagement();
        setupExportAndChatIntegration();

        isModuleInitialized = true;
        return true;
    };

    /**
     * Initialize Fabric.js Canvas
     */
    function initFabricCanvas() {
        const fabricCanvasEl = document.getElementById('fabricCanvas');
        if (!fabricCanvasEl || typeof fabric === 'undefined') {
            console.warn('[ImageEditor] Fabric.js not loaded yet. Retrying...');
            setTimeout(initFabricCanvas, 300);
            return;
        }

        if (canvas) {
            canvas.dispose();
        }

        canvas = new fabric.Canvas('fabricCanvas', {
            width: canvasWidth,
            height: canvasHeight,
            backgroundColor: '#10131a',
            preserveObjectStacking: true,
            selection: true,
            fireRightClick: true,
            stopContextMenu: true
        });

        // Configure custom selection styling
        fabric.Object.prototype.transparentCorners = false;
        fabric.Object.prototype.cornerColor = '#d3bbff';
        fabric.Object.prototype.cornerStrokeColor = '#6d28d9';
        fabric.Object.prototype.borderColor = '#38bdf8';
        fabric.Object.prototype.cornerSize = 12;
        fabric.Object.prototype.cornerStyle = 'circle';
        fabric.Object.prototype.padding = 6;

        // Sync canvas events
        canvas.on('object:added', () => { onCanvasModified(); updateLayersList(); });
        canvas.on('object:removed', () => { onCanvasModified(); updateLayersList(); });
        canvas.on('object:modified', () => { onCanvasModified(); updateLayersList(); syncInspectorFromSelected(); });
        canvas.on('selection:created', (e) => onObjectSelected(e));
        canvas.on('selection:updated', (e) => onObjectSelected(e));
        canvas.on('selection:cleared', () => onSelectionCleared());

        // Keyboard shortcuts
        window.addEventListener('keydown', handleKeyShortcuts);

        // Fit canvas to screen on init
        setTimeout(fitCanvasToViewport, 100);
        saveHistoryState();
    }

    /**
     * Fit Canvas into Viewport smoothly
     */
    function fitCanvasToViewport() {
        const stage = document.getElementById('canvasStageContainer');
        const wrapper = document.getElementById('canvasViewportWrapper');
        if (!stage || !wrapper || !canvas) return;

        const stageWidth = stage.clientWidth - 80;
        const stageHeight = stage.clientHeight - 80;

        const scaleX = stageWidth / canvasWidth;
        const scaleY = stageHeight / canvasHeight;
        const scale = Math.min(scaleX, scaleY, 1.0); // max 100% on start

        setCanvasZoom(Math.max(scale, 0.15));
    }

    function setCanvasZoom(zoomLevel) {
        currentZoom = zoomLevel;
        const wrapper = document.getElementById('canvasViewportWrapper');
        const zoomText = document.getElementById('zoomPercentText');

        if (wrapper) {
            wrapper.style.width = `${canvasWidth}px`;
            wrapper.style.height = `${canvasHeight}px`;
            wrapper.style.transform = `scale(${currentZoom})`;
            wrapper.style.transformOrigin = 'center center';
        }

        if (zoomText) {
            zoomText.textContent = `${Math.round(currentZoom * 100)}%`;
        }
    }

    /**
     * History (Undo / Redo) Management
     */
    function saveHistoryState() {
        if (!canvas || isStateProcessing) return;

        const json = JSON.stringify(canvas.toJSON(['id', 'layerName', 'layerType', 'isLocked']));
        
        // Remove redo forward states if we make a new change
        if (historyIndex < history.length - 1) {
            history.splice(historyIndex + 1);
        }

        history.push(json);
        if (history.length > 30) history.shift();
        historyIndex = history.length - 1;

        updateUndoRedoButtons();
    }

    function onCanvasModified() {
        if (!isStateProcessing) {
            saveHistoryState();
        }
    }

    function undo() {
        if (historyIndex > 0) {
            historyIndex--;
            loadHistoryState(history[historyIndex]);
        }
    }

    function redo() {
        if (historyIndex < history.length - 1) {
            historyIndex++;
            loadHistoryState(history[historyIndex]);
        }
    }

    function loadHistoryState(jsonStr) {
        if (!canvas || !jsonStr) return;
        isStateProcessing = true;
        canvas.loadFromJSON(jsonStr, () => {
            canvas.renderAll();
            isStateProcessing = false;
            updateLayersList();
            updateUndoRedoButtons();
            syncInspectorFromSelected();
        });
    }

    function updateUndoRedoButtons() {
        const btnUndo = document.getElementById('btnUndo');
        const btnRedo = document.getElementById('btnRedo');
        if (btnUndo) btnUndo.disabled = (historyIndex <= 0);
        if (btnRedo) btnRedo.disabled = (historyIndex >= history.length - 1);
    }

    /**
     * Global Event Listeners & Shortcuts
     */
    function setupEventListeners() {
        // Studio Close & Clear
        const btnCloseStudio = document.getElementById('btnCloseStudio');
        const btnClearCanvas = document.getElementById('btnClearCanvas');
        const btnUndo = document.getElementById('btnUndo');
        const btnRedo = document.getElementById('btnRedo');
        const btnZoomIn = document.getElementById('btnZoomIn');
        const btnZoomOut = document.getElementById('btnZoomOut');
        const btnZoomFit = document.getElementById('btnZoomFit');

        if (btnCloseStudio) btnCloseStudio.addEventListener('click', window.closeImageEditor);
        if (btnUndo) btnUndo.addEventListener('click', undo);
        if (btnRedo) btnRedo.addEventListener('click', redo);

        if (btnClearCanvas) {
            btnClearCanvas.addEventListener('click', () => {
                if (confirm('Bạn có chắc muốn xóa toàn bộ các lớp trên Canvas không?')) {
                    canvas.clear();
                    canvas.backgroundColor = '#10131a';
                    canvas.renderAll();
                    saveHistoryState();
                    updateLayersList();
                }
            });
        }

        if (btnZoomIn) btnZoomIn.addEventListener('click', () => setCanvasZoom(Math.min(currentZoom + 0.1, 3.0)));
        if (btnZoomOut) btnZoomOut.addEventListener('click', () => setCanvasZoom(Math.max(currentZoom - 0.1, 0.15)));
        if (btnZoomFit) btnZoomFit.addEventListener('click', fitCanvasToViewport);

        window.addEventListener('resize', () => {
            if (!document.getElementById('imageEditorModal').classList.contains('hidden')) {
                fitCanvasToViewport();
            }
        });
    }

    function handleKeyShortcuts(e) {
        const modal = document.getElementById('imageEditorModal');
        if (!modal || modal.classList.contains('hidden') || !canvas) return;

        // Skip when typing in inputs/textareas
        const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;

        if (e.key === 'Delete' || e.key === 'Backspace') {
            const activeObj = canvas.getActiveObject();
            if (activeObj && !activeObj.isEditing) {
                e.preventDefault();
                canvas.remove(activeObj);
                canvas.discardActiveObject();
                canvas.renderAll();
            }
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            undo();
        } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
            e.preventDefault();
            redo();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            duplicateActiveLayer();
        }
    }

    /**
     * Sidebar Navigation Tabs Switching
     */
    function setupTabs() {
        const tabBtns = document.querySelectorAll('.studio-tab-btn');
        const tabPanes = document.querySelectorAll('.studio-tab-pane');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.getAttribute('data-tab');
                
                tabBtns.forEach(b => b.classList.remove('active'));
                tabPanes.forEach(p => p.classList.add('hidden'));

                btn.classList.add('active');
                const targetPane = document.getElementById(targetTab);
                if (targetPane) targetPane.classList.remove('hidden');
            });
        });
    }

    /**
     * Canvas Presets & Sizing
     */
    function setupPresetsAndDimensions() {
        const presetSelect = document.getElementById('canvasPresetSelect');
        const customInputs = document.getElementById('customDimensionsInputs');
        const customW = document.getElementById('customCanvasWidth');
        const customH = document.getElementById('customCanvasHeight');
        const btnApplyCustom = document.getElementById('btnApplyCustomDimensions');
        const dimDisplay = document.getElementById('canvasDimensionDisplay');

        if (!presetSelect) return;

        presetSelect.addEventListener('change', () => {
            const val = presetSelect.value;
            if (val === 'custom') {
                if (customInputs) {
                    customInputs.classList.remove('hidden');
                    customInputs.classList.add('flex');
                }
            } else {
                if (customInputs) {
                    customInputs.classList.add('hidden');
                    customInputs.classList.remove('flex');
                }
                const [w, h] = val.split('x').map(Number);
                resizeCanvasStage(w, h);
            }
        });

        if (btnApplyCustom) {
            btnApplyCustom.addEventListener('click', () => {
                const w = parseInt(customW.value, 10) || 1080;
                const h = parseInt(customH.value, 10) || 1080;
                resizeCanvasStage(w, h);
            });
        }

        function resizeCanvasStage(w, h) {
            canvasWidth = Math.max(100, Math.min(w, 4000));
            canvasHeight = Math.max(100, Math.min(h, 4000));

            if (dimDisplay) dimDisplay.textContent = `${canvasWidth} x ${canvasHeight} px`;

            if (canvas) {
                canvas.setWidth(canvasWidth);
                canvas.setHeight(canvasHeight);
                canvas.renderAll();
                fitCanvasToViewport();
                saveHistoryState();
            }
        }
    }

    /**
     * Tab 1: Image Upload, Drag & Drop, AI Prompt Generation
     */
    function setupUploadAndAi() {
        const dropZone = document.getElementById('studioDropZone');
        const fileInput = document.getElementById('studioFileInput');
        const stageContainer = document.getElementById('canvasStageContainer');
        const dragOverlay = document.getElementById('canvasDragOverlay');

        if (dropZone && fileInput) {
            dropZone.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) handleImageFile(file);
                fileInput.value = '';
            });
        }

        // Drag & Drop onto Stage Canvas
        if (stageContainer) {
            stageContainer.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (dragOverlay) dragOverlay.classList.remove('hidden');
            });
            stageContainer.addEventListener('dragleave', (e) => {
                if (e.relatedTarget === null || !stageContainer.contains(e.relatedTarget)) {
                    if (dragOverlay) dragOverlay.classList.add('hidden');
                }
            });
            stageContainer.addEventListener('drop', (e) => {
                e.preventDefault();
                if (dragOverlay) dragOverlay.classList.add('hidden');
                const file = e.dataTransfer.files[0];
                if (file && file.type.startsWith('image/')) {
                    handleImageFile(file);
                }
            });
        }

        // Stock Sample Click
        document.querySelectorAll('.stock-sample-img').forEach(img => {
            img.addEventListener('click', () => {
                insertImageFromUrl(img.src, 'Ảnh Mẫu Nghệ Thuật');
            });
        });

        // URL Image Importer
        const btnInsertUrl = document.getElementById('btnInsertFromUrl');
        const urlInput = document.getElementById('studioUrlInput');

        if (btnInsertUrl && urlInput) {
            btnInsertUrl.addEventListener('click', () => {
                const url = urlInput.value.trim();
                if (!url) {
                    alert('Vui lòng nhập đường link (URL) hình ảnh!');
                    urlInput.focus();
                    return;
                }
                insertImageFromUrl(url, 'Ảnh Nhập Từ URL');
                urlInput.value = '';
            });
            urlInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    btnInsertUrl.click();
                }
            });
        }
    }

    function handleImageFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            insertImageFromUrl(e.target.result, file.name || 'Ảnh Tải Lên');
        };
        reader.readAsDataURL(file);
    }

    function insertImageFromUrl(url, layerName = 'Hình Ảnh') {
        if (!canvas) return;

        fabric.Image.fromURL(url, (img) => {
            if (!img) return;

            // Scale to reasonable size inside canvas
            const maxW = canvasWidth * 0.8;
            const maxH = canvasHeight * 0.8;
            let scale = Math.min(maxW / img.width, maxH / img.height, 1);

            img.set({
                left: canvasWidth / 2,
                top: canvasHeight / 2,
                originX: 'center',
                originY: 'center',
                scaleX: scale,
                scaleY: scale,
                layerName: layerName,
                layerType: 'image'
            });

            canvas.add(img);
            canvas.setActiveObject(img);
            canvas.renderAll();
        }, { crossOrigin: 'anonymous' });
    }

    /**
     * Tab 2: Typography & Text Box
     */
    function setupTypography() {
        const btnHeading = document.getElementById('btnAddHeading');
        const btnSubheading = document.getElementById('btnAddSubheading');
        const btnBody = document.getElementById('btnAddBodyText');

        if (btnHeading) {
            btnHeading.addEventListener('click', () => {
                addTextToCanvas('TIÊU ĐỀ POSTER', {
                    fontSize: 64,
                    fontWeight: 'bold',
                    fontFamily: 'Sora',
                    fill: '#ffffff',
                    layerName: 'Tiêu Đề Lớn'
                });
            });
        }

        if (btnSubheading) {
            btnSubheading.addEventListener('click', () => {
                addTextToCanvas('Phụ đề & Slogan ấn tượng', {
                    fontSize: 36,
                    fontWeight: '600',
                    fontFamily: 'Inter',
                    fill: '#5de6ff',
                    layerName: 'Phụ Đề'
                });
            });
        }

        if (btnBody) {
            btnBody.addEventListener('click', () => {
                addTextToCanvas('Nội dung chi tiết hoặc mô tả sản phẩm của bạn...', {
                    fontSize: 24,
                    fontWeight: 'normal',
                    fontFamily: 'Inter',
                    fill: '#e1e2eb',
                    layerName: 'Văn Bản'
                });
            });
        }

        // Text Controls Binding
        const fontFamilySelect = document.getElementById('textFontFamily');
        const fontSizeInput = document.getElementById('textFontSize');
        const textColorPicker = document.getElementById('textColorPicker');
        const textColorHex = document.getElementById('textColorHex');
        const btnBold = document.getElementById('btnTextBold');
        const btnItalic = document.getElementById('btnTextItalic');
        const btnUnderline = document.getElementById('btnTextUnderline');
        const btnAlignLeft = document.getElementById('btnAlignLeft');
        const btnAlignCenter = document.getElementById('btnAlignCenter');
        const btnAlignRight = document.getElementById('btnAlignRight');
        const strokeColor = document.getElementById('textStrokeColor');
        const strokeWidth = document.getElementById('textStrokeWidth');
        const bgColor = document.getElementById('textBgColor');
        const btnClearBg = document.getElementById('btnClearTextBg');
        const shadowColor = document.getElementById('textShadowColor');
        const shadowBlur = document.getElementById('textShadowBlur');

        if (fontFamilySelect) {
            fontFamilySelect.addEventListener('change', () => {
                applyToActiveText(t => t.set('fontFamily', fontFamilySelect.value));
            });
        }

        if (fontSizeInput) {
            fontSizeInput.addEventListener('input', () => {
                const sz = parseInt(fontSizeInput.value, 10) || 24;
                applyToActiveText(t => t.set('fontSize', sz));
            });
        }

        if (textColorPicker && textColorHex) {
            textColorPicker.addEventListener('input', () => {
                textColorHex.value = textColorPicker.value;
                applyToActiveText(t => t.set('fill', textColorPicker.value));
            });
            textColorHex.addEventListener('input', () => {
                textColorPicker.value = textColorHex.value;
                applyToActiveText(t => t.set('fill', textColorHex.value));
            });
        }

        if (btnBold) {
            btnBold.addEventListener('click', () => {
                applyToActiveText(t => {
                    const isBold = t.fontWeight === 'bold' || t.fontWeight === '700';
                    t.set('fontWeight', isBold ? 'normal' : 'bold');
                });
            });
        }

        if (btnItalic) {
            btnItalic.addEventListener('click', () => {
                applyToActiveText(t => {
                    const isItalic = t.fontStyle === 'italic';
                    t.set('fontStyle', isItalic ? 'normal' : 'italic');
                });
            });
        }

        if (btnUnderline) {
            btnUnderline.addEventListener('click', () => {
                applyToActiveText(t => t.set('underline', !t.underline));
            });
        }

        if (btnAlignLeft) btnAlignLeft.addEventListener('click', () => applyToActiveText(t => t.set('textAlign', 'left')));
        if (btnAlignCenter) btnAlignCenter.addEventListener('click', () => applyToActiveText(t => t.set('textAlign', 'center')));
        if (btnAlignRight) btnAlignRight.addEventListener('click', () => applyToActiveText(t => t.set('textAlign', 'right')));

        if (strokeColor && strokeWidth) {
            const updateStroke = () => {
                const w = parseInt(strokeWidth.value, 10) || 0;
                applyToActiveText(t => {
                    t.set('stroke', w > 0 ? strokeColor.value : null);
                    t.set('strokeWidth', w);
                });
            };
            strokeColor.addEventListener('input', updateStroke);
            strokeWidth.addEventListener('input', updateStroke);
        }

        if (bgColor) {
            bgColor.addEventListener('input', () => {
                applyToActiveText(t => t.set('textBackgroundColor', bgColor.value));
            });
        }

        if (btnClearBg) {
            btnClearBg.addEventListener('click', () => {
                applyToActiveText(t => t.set('textBackgroundColor', ''));
            });
        }

        if (shadowColor && shadowBlur) {
            const updateShadow = () => {
                const blur = parseInt(shadowBlur.value, 10) || 0;
                applyToActiveText(t => {
                    t.set('shadow', blur > 0 ? new fabric.Shadow({
                        color: shadowColor.value,
                        blur: blur,
                        offsetX: 2,
                        offsetY: 2
                    }) : null);
                });
            };
            shadowColor.addEventListener('input', updateShadow);
            shadowBlur.addEventListener('input', updateShadow);
        }
    }

    function addTextToCanvas(textStr, options = {}) {
        if (!canvas) return;

        const textbox = new fabric.Textbox(textStr, {
            left: canvasWidth / 2,
            top: canvasHeight / 2,
            originX: 'center',
            originY: 'center',
            width: Math.min(canvasWidth * 0.7, 500),
            textAlign: 'center',
            layerType: 'text',
            ...options
        });

        canvas.add(textbox);
        canvas.setActiveObject(textbox);
        canvas.renderAll();
    }

    function applyToActiveText(callback) {
        if (!canvas) return;
        const active = canvas.getActiveObject();
        if (active && (active.type === 'textbox' || active.type === 'text' || active.type === 'i-text')) {
            callback(active);
            canvas.renderAll();
            saveHistoryState();
        }
    }

    /**
     * Tab 3: Shapes & Vectors
     */
    function setupShapes() {
        const shapeBtns = document.querySelectorAll('.shape-btn');
        const shapeFill = document.getElementById('shapeFillColor');
        const shapeStroke = document.getElementById('shapeStrokeColor');
        const shapeStrokeWidth = document.getElementById('shapeStrokeWidth');
        const shapeStrokeVal = document.getElementById('shapeStrokeWidthVal');

        shapeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const shapeType = btn.getAttribute('data-shape');
                addShapeToCanvas(shapeType);
            });
        });

        const updateActiveShape = () => {
            if (!canvas) return;
            const active = canvas.getActiveObject();
            if (active && active.layerType === 'shape') {
                const widthVal = parseInt(shapeStrokeWidth.value, 10) || 0;
                if (shapeStrokeVal) shapeStrokeVal.textContent = `${widthVal} px`;

                active.set({
                    fill: shapeFill.value,
                    stroke: widthVal > 0 ? shapeStroke.value : null,
                    strokeWidth: widthVal
                });
                canvas.renderAll();
                saveHistoryState();
            }
        };

        if (shapeFill) shapeFill.addEventListener('input', updateActiveShape);
        if (shapeStroke) shapeStroke.addEventListener('input', updateActiveShape);
        if (shapeStrokeWidth) shapeStrokeWidth.addEventListener('input', updateActiveShape);
    }

    function addShapeToCanvas(type) {
        if (!canvas) return;

        let shape = null;
        const cx = canvasWidth / 2;
        const cy = canvasHeight / 2;
        const fill = document.getElementById('shapeFillColor')?.value || '#a855f7';
        const stroke = document.getElementById('shapeStrokeColor')?.value || '#ffffff';
        const strokeW = parseInt(document.getElementById('shapeStrokeWidth')?.value, 10) || 0;

        const commonProps = {
            left: cx,
            top: cy,
            originX: 'center',
            originY: 'center',
            fill: fill,
            stroke: strokeW > 0 ? stroke : null,
            strokeWidth: strokeW,
            layerType: 'shape'
        };

        if (type === 'rect') {
            shape = new fabric.Rect({ ...commonProps, width: 200, height: 140, layerName: 'Hình Chữ Nhật' });
        } else if (type === 'roundedRect') {
            shape = new fabric.Rect({ ...commonProps, width: 200, height: 140, rx: 18, ry: 18, layerName: 'Hình Bo Góc' });
        } else if (type === 'circle') {
            shape = new fabric.Circle({ ...commonProps, radius: 90, layerName: 'Hình Tròn' });
        } else if (type === 'triangle') {
            shape = new fabric.Triangle({ ...commonProps, width: 180, height: 160, layerName: 'Hình Tam Giác' });
        } else if (type === 'star') {
            // 5-point star path
            const starPoints = calculateStarPoints(5, 90, 45);
            shape = new fabric.Polygon(starPoints, { ...commonProps, layerName: 'Ngôi Sao 5 Cánh' });
        } else if (type === 'line') {
            shape = new fabric.Line([cx - 100, cy, cx + 100, cy], {
                ...commonProps,
                stroke: fill,
                strokeWidth: Math.max(strokeW, 4),
                layerName: 'Đường Kẻ Thẳng'
            });
        } else if (type === 'arrow') {
            const pathData = 'M 0 0 L 140 0 M 110 -20 L 140 0 L 110 20';
            shape = new fabric.Path(pathData, {
                ...commonProps,
                fill: '',
                stroke: fill,
                strokeWidth: Math.max(strokeW, 5),
                layerName: 'Mũi Tên'
            });
        } else if (type === 'badge') {
            const badgePoints = calculateStarPoints(12, 90, 75);
            shape = new fabric.Polygon(badgePoints, { ...commonProps, layerName: 'Huy Hiệu VIP' });
        }

        if (shape) {
            canvas.add(shape);
            canvas.setActiveObject(shape);
            canvas.renderAll();
        }
    }

    function calculateStarPoints(arms, outerRadius, innerRadius) {
        const results = [];
        const angle = Math.PI / arms;
        for (let i = 0; i < 2 * arms; i++) {
            const r = (i & 1) === 0 ? outerRadius : innerRadius;
            const currAngle = i * angle - Math.PI / 2;
            results.push({
                x: r * Math.cos(currAngle),
                y: r * Math.sin(currAngle)
            });
        }
        return results;
    }

    /**
     * Tab 4: Adjustments & Filters (Brightness, Contrast, Blur, Sharpen, etc.)
     */
    function setupAdjustmentsAndFilters() {
        const sliderBrightness = document.getElementById('sliderBrightness');
        const sliderContrast = document.getElementById('sliderContrast');
        const sliderSaturation = document.getElementById('sliderSaturation');
        const sliderBlur = document.getElementById('sliderBlur');
        const sliderSharpen = document.getElementById('sliderSharpen');
        const sliderHue = document.getElementById('sliderHue');
        const btnReset = document.getElementById('btnResetAdjustments');

        const filterBtns = document.querySelectorAll('.filter-preset-btn');

        const updateFilters = () => {
            activeFilters.brightness = parseFloat(sliderBrightness.value) / 100;
            activeFilters.contrast = parseFloat(sliderContrast.value) / 100;
            activeFilters.saturation = parseFloat(sliderSaturation.value) / 100;
            activeFilters.blur = parseFloat(sliderBlur.value) / 25;
            activeFilters.sharpen = parseFloat(sliderSharpen.value) / 100;
            activeFilters.hue = parseFloat(sliderHue.value);

            // Update label badges
            document.getElementById('valBrightness').textContent = `${sliderBrightness.value}%`;
            document.getElementById('valContrast').textContent = `${sliderContrast.value}%`;
            document.getElementById('valSaturation').textContent = `${sliderSaturation.value}%`;
            document.getElementById('valBlur').textContent = `${sliderBlur.value} px`;
            document.getElementById('valSharpen').textContent = `${sliderSharpen.value}%`;
            document.getElementById('valHue').textContent = `${sliderHue.value}°`;

            applyFiltersToActiveImage();
        };

        [sliderBrightness, sliderContrast, sliderSaturation, sliderBlur, sliderSharpen, sliderHue].forEach(slider => {
            if (slider) slider.addEventListener('input', updateFilters);
        });

        if (btnReset) {
            btnReset.addEventListener('click', () => {
                resetAdjustmentSliders();
                applyFiltersToActiveImage();
            });
        }

        // Preset Filters
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = btn.getAttribute('data-filter');
                applyPresetFilter(preset);
            });
        });
    }

    function resetAdjustmentSliders() {
        document.getElementById('sliderBrightness').value = 0;
        document.getElementById('sliderContrast').value = 0;
        document.getElementById('sliderSaturation').value = 0;
        document.getElementById('sliderBlur').value = 0;
        document.getElementById('sliderSharpen').value = 0;
        document.getElementById('sliderHue').value = 0;

        document.getElementById('valBrightness').textContent = '0%';
        document.getElementById('valContrast').textContent = '0%';
        document.getElementById('valSaturation').textContent = '0%';
        document.getElementById('valBlur').textContent = '0 px';
        document.getElementById('valSharpen').textContent = '0%';
        document.getElementById('valHue').textContent = '0°';

        activeFilters.brightness = 0;
        activeFilters.contrast = 0;
        activeFilters.saturation = 0;
        activeFilters.blur = 0;
        activeFilters.sharpen = 0;
        activeFilters.hue = 0;
    }

    function applyFiltersToActiveImage() {
        if (!canvas) return;
        const active = canvas.getActiveObject();
        if (!active || active.type !== 'image') return;

        const filtersList = [];

        // 1. Brightness
        if (activeFilters.brightness !== 0) {
            filtersList.push(new fabric.Image.filters.Brightness({ brightness: activeFilters.brightness }));
        }

        // 2. Contrast
        if (activeFilters.contrast !== 0) {
            filtersList.push(new fabric.Image.filters.Contrast({ contrast: activeFilters.contrast }));
        }

        // 3. Saturation
        if (activeFilters.saturation !== 0) {
            filtersList.push(new fabric.Image.filters.Saturation({ saturation: activeFilters.saturation }));
        }

        // 4. Blur
        if (activeFilters.blur > 0) {
            filtersList.push(new fabric.Image.filters.Blur({ blur: activeFilters.blur }));
        }

        // 5. Sharpen (Convolution matrix)
        if (activeFilters.sharpen > 0) {
            const sh = activeFilters.sharpen;
            filtersList.push(new fabric.Image.filters.Convolute({
                matrix: [
                    0, -sh, 0,
                    -sh, 1 + 4 * sh, -sh,
                    0, -sh, 0
                ]
            }));
        }

        // 6. Hue Rotate
        if (activeFilters.hue > 0) {
            filtersList.push(new fabric.Image.filters.HueRotation({ rotation: activeFilters.hue / 360 }));
        }

        active.filters = filtersList;
        active.applyFilters();
        canvas.renderAll();
    }

    function applyPresetFilter(preset) {
        if (!canvas) return;
        const active = canvas.getActiveObject();
        if (!active || active.type !== 'image') {
            alert('Vui lòng click chọn một ảnh trên Canvas trước khi áp dụng bộ lọc!');
            return;
        }

        resetAdjustmentSliders();
        active.filters = [];

        if (preset === 'cyberpunk') {
            active.filters.push(
                new fabric.Image.filters.Contrast({ contrast: 0.25 }),
                new fabric.Image.filters.Saturation({ saturation: 0.5 }),
                new fabric.Image.filters.HueRotation({ rotation: 0.85 })
            );
        } else if (preset === 'cinematic') {
            active.filters.push(
                new fabric.Image.filters.Contrast({ contrast: 0.2 }),
                new fabric.Image.filters.Saturation({ saturation: -0.15 }),
                new fabric.Image.filters.Brightness({ brightness: -0.05 })
            );
        } else if (preset === 'vintage') {
            active.filters.push(
                new fabric.Image.filters.Sepia(),
                new fabric.Image.filters.Contrast({ contrast: 0.1 })
            );
        } else if (preset === 'bw') {
            active.filters.push(
                new fabric.Image.filters.Grayscale(),
                new fabric.Image.filters.Contrast({ contrast: 0.3 })
            );
        } else if (preset === 'sunset') {
            active.filters.push(
                new fabric.Image.filters.Saturation({ saturation: 0.35 }),
                new fabric.Image.filters.HueRotation({ rotation: 0.08 }),
                new fabric.Image.filters.Brightness({ brightness: 0.05 })
            );
        } else if (preset === 'hdr') {
            active.filters.push(
                new fabric.Image.filters.Contrast({ contrast: 0.4 }),
                new fabric.Image.filters.Saturation({ saturation: 0.3 }),
                new fabric.Image.filters.Convolute({
                    matrix: [0, -0.3, 0, -0.3, 2.2, -0.3, 0, -0.3, 0]
                })
            );
        } else if (preset === 'pastel') {
            active.filters.push(
                new fabric.Image.filters.Brightness({ brightness: 0.15 }),
                new fabric.Image.filters.Saturation({ saturation: -0.2 }),
                new fabric.Image.filters.Contrast({ contrast: -0.1 })
            );
        } else if (preset === 'cold') {
            active.filters.push(
                new fabric.Image.filters.HueRotation({ rotation: 0.55 }),
                new fabric.Image.filters.Contrast({ contrast: 0.15 })
            );
        }

        active.applyFilters();
        canvas.renderAll();
        saveHistoryState();
    }

    /**
     * Tab 5: Transform & Crop (Rotate, Flip, Interactive Crop)
     */
    function setupTransformAndCrop() {
        const btnRotateLeft = document.getElementById('btnRotateLeft');
        const btnRotateRight = document.getElementById('btnRotateRight');
        const btnFlipX = document.getElementById('btnFlipX');
        const btnFlipY = document.getElementById('btnFlipY');
        const sliderRotate = document.getElementById('sliderRotate');
        const valRotateAngle = document.getElementById('valRotateAngle');

        const btnStartCrop = document.getElementById('btnStartCrop');
        const btnApplyCrop = document.getElementById('btnApplyCrop');
        const cropRatioBtns = document.querySelectorAll('.crop-ratio-btn');

        if (btnRotateLeft) {
            btnRotateLeft.addEventListener('click', () => {
                applyTransform(obj => obj.rotate((obj.angle || 0) - 90));
            });
        }

        if (btnRotateRight) {
            btnRotateRight.addEventListener('click', () => {
                applyTransform(obj => obj.rotate((obj.angle || 0) + 90));
            });
        }

        if (btnFlipX) {
            btnFlipX.addEventListener('click', () => {
                applyTransform(obj => obj.set('flipX', !obj.flipX));
            });
        }

        if (btnFlipY) {
            btnFlipY.addEventListener('click', () => {
                applyTransform(obj => obj.set('flipY', !obj.flipY));
            });
        }

        if (sliderRotate && valRotateAngle) {
            sliderRotate.addEventListener('input', () => {
                const angle = parseInt(sliderRotate.value, 10) || 0;
                valRotateAngle.textContent = `${angle}°`;
                applyTransform(obj => obj.rotate(angle));
            });
        }

        // Crop Ratio Buttons
        cropRatioBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                cropRatioBtns.forEach(b => b.classList.remove('active', 'border-purple-500/40'));
                btn.classList.add('active', 'border-purple-500/40');
                cropRatio = btn.getAttribute('data-crop-ratio');
                adjustCropRectRatio();
            });
        });

        // Crop Tool Action
        if (btnStartCrop && btnApplyCrop) {
            btnStartCrop.addEventListener('click', () => {
                toggleCropMode(true);
            });

            btnApplyCrop.addEventListener('click', () => {
                applyCanvasCrop();
                toggleCropMode(false);
            });
        }
    }

    function applyTransform(callback) {
        if (!canvas) return;
        const active = canvas.getActiveObject();
        if (active) {
            callback(active);
            canvas.renderAll();
            saveHistoryState();
        }
    }

    function toggleCropMode(enabled) {
        isCropping = enabled;
        const btnStart = document.getElementById('btnStartCrop');
        const btnApply = document.getElementById('btnApplyCrop');

        if (enabled) {
            if (btnStart) btnStart.classList.add('bg-purple-800');
            if (btnApply) btnApply.disabled = false;

            // Create interactive crop rect
            if (cropRect) canvas.remove(cropRect);
            
            const w = canvasWidth * 0.7;
            const h = canvasHeight * 0.7;

            cropRect = new fabric.Rect({
                left: canvasWidth / 2,
                top: canvasHeight / 2,
                originX: 'center',
                originY: 'center',
                width: w,
                height: h,
                fill: 'rgba(0,0,0,0.3)',
                stroke: '#38bdf8',
                strokeWidth: 3,
                strokeDashArray: [6, 6],
                cornerColor: '#38bdf8',
                cornerSize: 14,
                transparentCorners: false,
                hasRotatingPoint: false,
                lockRotation: true,
                isCropGuide: true,
                selectable: true
            });

            canvas.add(cropRect);
            canvas.setActiveObject(cropRect);
            adjustCropRectRatio();
            canvas.renderAll();
        } else {
            if (btnStart) btnStart.classList.remove('bg-purple-800');
            if (btnApply) btnApply.disabled = true;

            if (cropRect) {
                canvas.remove(cropRect);
                cropRect = null;
                canvas.renderAll();
            }
        }
    }

    function adjustCropRectRatio() {
        if (!cropRect) return;
        let w = cropRect.width * (cropRect.scaleX || 1);
        let h = cropRect.height * (cropRect.scaleY || 1);

        if (cropRatio === '1:1') {
            const size = Math.min(w, h);
            w = size;
            h = size;
        } else if (cropRatio === '4:5') {
            h = w * (5 / 4);
        } else if (cropRatio === '16:9') {
            h = w * (9 / 16);
        }

        cropRect.set({
            width: w,
            height: h,
            scaleX: 1,
            scaleY: 1
        });
        canvas.renderAll();
    }

    function applyCanvasCrop() {
        if (!cropRect || !canvas) return;

        // Hide crop rect during snapshot
        cropRect.visible = false;
        canvas.renderAll();

        const bound = cropRect.getBoundingRect();
        const croppedDataUrl = canvas.toDataURL({
            left: Math.max(0, bound.left),
            top: Math.max(0, bound.top),
            width: Math.min(canvasWidth, bound.width),
            height: Math.min(canvasHeight, bound.height),
            format: 'png',
            enableRetinaScaling: false
        });

        // Clear canvas and set new dimensions
        canvas.clear();
        canvasWidth = Math.round(bound.width);
        canvasHeight = Math.round(bound.height);
        canvas.setWidth(canvasWidth);
        canvas.setHeight(canvasHeight);

        document.getElementById('canvasDimensionDisplay').textContent = `${canvasWidth} x ${canvasHeight} px`;

        // Load cropped image back as fresh base layer
        fabric.Image.fromURL(croppedDataUrl, (img) => {
            img.set({
                left: 0,
                top: 0,
                originX: 'left',
                originY: 'left',
                layerName: 'Ảnh Đã Cắt',
                layerType: 'image'
            });
            canvas.add(img);
            canvas.renderAll();
            fitCanvasToViewport();
            saveHistoryState();
        });
    }

    /**
     * Tab 6: Background Tools & Smart Background Removal (Magic Cut)
     */
    function setupBackgroundTools() {
        const btnRemoveBg = document.getElementById('btnRemoveBackground');
        const sliderTolerance = document.getElementById('sliderBgTolerance');
        const valTolerance = document.getElementById('valBgTolerance');
        const bgColorPicker = document.getElementById('canvasBgColorPicker');
        const btnTransparent = document.getElementById('btnTransparentBg');
        const gradBtns = document.querySelectorAll('.bg-grad-btn');

        if (sliderTolerance && valTolerance) {
            sliderTolerance.addEventListener('input', () => {
                valTolerance.textContent = sliderTolerance.value;
            });
        }

        if (btnRemoveBg) {
            btnRemoveBg.addEventListener('click', async () => {
                const active = canvas.getActiveObject();
                if (!active || active.type !== 'image') {
                    alert('Vui lòng chọn một layer ảnh cần xóa nền!');
                    return;
                }

                const btnText = document.getElementById('btnRemoveBackgroundText');
                btnRemoveBg.disabled = true;
                if (btnText) btnText.textContent = 'Đang phân tích & tách nền... 🪄';

                try {
                    const tolerance = parseInt(sliderTolerance.value, 10) || 30;
                    await processClientSideBackgroundRemoval(active, tolerance);
                } catch (err) {
                    console.error('[ImageStudio] Remove BG error:', err);
                    alert('Không thể tách nền ảnh này. Vui lòng thử lại!');
                } finally {
                    btnRemoveBg.disabled = false;
                    if (btnText) btnText.textContent = 'Xóa Nền Layer Đang Chọn';
                }
            });
        }

        // Canvas Solid Background
        if (bgColorPicker) {
            bgColorPicker.addEventListener('input', () => {
                canvas.backgroundColor = bgColorPicker.value;
                canvas.renderAll();
                saveHistoryState();
            });
        }

        // Transparent Checkerboard
        if (btnTransparent) {
            btnTransparent.addEventListener('click', () => {
                canvas.backgroundColor = '';
                canvas.renderAll();
                saveHistoryState();
            });
        }

        // Gradient Presets
        gradBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const gradStr = btn.getAttribute('data-bg-grad');
                const surface = document.getElementById('canvasBackgroundSurface');
                if (surface) {
                    surface.style.background = gradStr;
                }
                canvas.backgroundColor = '';
                canvas.renderAll();
                saveHistoryState();
            });
        });
    }

    /**
     * Smart Pixel-level Background Removal Algorithm (Chroma & Alpha Threshold)
     */
    function processClientSideBackgroundRemoval(imageObj, tolerance) {
        return new Promise((resolve) => {
            const imgElement = imageObj.getElement();
            const tempCanvas = document.createElement('canvas');
            const ctx = tempCanvas.getContext('2d');

            tempCanvas.width = imgElement.naturalWidth || imgElement.width;
            tempCanvas.height = imgElement.naturalHeight || imgElement.height;

            ctx.drawImage(imgElement, 0, 0);
            const imgData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const data = imgData.data;
            const w = tempCanvas.width;
            const h = tempCanvas.height;

            // Sample 4 corners to detect dominant background color
            const cornerIndices = [
                0, // top-left
                (w - 1) * 4, // top-right
                ((h - 1) * w) * 4, // bottom-left
                ((h - 1) * w + (w - 1)) * 4 // bottom-right
            ];

            let avgR = 0, avgG = 0, avgB = 0;
            cornerIndices.forEach(idx => {
                avgR += data[idx];
                avgG += data[idx + 1];
                avgB += data[idx + 2];
            });
            avgR = Math.round(avgR / 4);
            avgG = Math.round(avgG / 4);
            avgB = Math.round(avgB / 4);

            const tolSq = (tolerance * 2.5) ** 2;

            // Loop through pixels and make background alpha = 0
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                const distSq = (r - avgR) ** 2 + (g - avgG) ** 2 + (b - avgB) ** 2;

                if (distSq < tolSq) {
                    data[i + 3] = 0; // Transparent
                } else if (distSq < tolSq * 1.5) {
                    // Soft edge feathering
                    const alphaRatio = (distSq - tolSq) / (tolSq * 0.5);
                    data[i + 3] = Math.round(data[i + 3] * alphaRatio);
                }
            }

            ctx.putImageData(imgData, 0, 0);
            const processedUrl = tempCanvas.toDataURL('image/png');

            // Replace image object source
            fabric.Image.fromURL(processedUrl, (newImg) => {
                newImg.set({
                    left: imageObj.left,
                    top: imageObj.top,
                    originX: imageObj.originX,
                    originY: imageObj.originY,
                    scaleX: imageObj.scaleX,
                    scaleY: imageObj.scaleY,
                    angle: imageObj.angle,
                    flipX: imageObj.flipX,
                    flipY: imageObj.flipY,
                    layerName: `${imageObj.layerName || 'Ảnh'} (Đã Xóa Nền)`,
                    layerType: 'image'
                });

                const index = canvas.getObjects().indexOf(imageObj);
                canvas.remove(imageObj);
                canvas.insertAt(newImg, index);
                canvas.setActiveObject(newImg);
                canvas.renderAll();
                saveHistoryState();
                resolve();
            });
        });
    }

    /**
     * Right Column: Layer Management & List
     */
    function setupLayerManagement() {
        const btnDuplicate = document.getElementById('btnDuplicateLayer');
        const btnDelete = document.getElementById('btnDeleteLayer');
        const sliderOpacity = document.getElementById('sliderLayerOpacity');
        const valOpacity = document.getElementById('valLayerOpacity');

        const btnToFront = document.getElementById('btnLayerToFront');
        const btnUp = document.getElementById('btnLayerUp');
        const btnDown = document.getElementById('btnLayerDown');
        const btnToBack = document.getElementById('btnLayerToBack');

        if (btnDuplicate) btnDuplicate.addEventListener('click', duplicateActiveLayer);
        if (btnDelete) {
            btnDelete.addEventListener('click', () => {
                const active = canvas?.getActiveObject();
                if (active) {
                    canvas.remove(active);
                    canvas.discardActiveObject();
                    canvas.renderAll();
                }
            });
        }

        if (sliderOpacity && valOpacity) {
            sliderOpacity.addEventListener('input', () => {
                const op = parseInt(sliderOpacity.value, 10) / 100;
                valOpacity.textContent = `${sliderOpacity.value}%`;
                const active = canvas?.getActiveObject();
                if (active) {
                    active.set('opacity', op);
                    canvas.renderAll();
                    saveHistoryState();
                }
            });
        }

        if (btnToFront) btnToFront.addEventListener('click', () => { const a = canvas?.getActiveObject(); if (a) { canvas.bringToFront(a); canvas.renderAll(); updateLayersList(); saveHistoryState(); } });
        if (btnUp) btnUp.addEventListener('click', () => { const a = canvas?.getActiveObject(); if (a) { canvas.bringForward(a); canvas.renderAll(); updateLayersList(); saveHistoryState(); } });
        if (btnDown) btnDown.addEventListener('click', () => { const a = canvas?.getActiveObject(); if (a) { canvas.sendBackwards(a); canvas.renderAll(); updateLayersList(); saveHistoryState(); } });
        if (btnToBack) btnToBack.addEventListener('click', () => { const a = canvas?.getActiveObject(); if (a) { canvas.sendToBack(a); canvas.renderAll(); updateLayersList(); saveHistoryState(); } });
    }

    function duplicateActiveLayer() {
        if (!canvas) return;
        const active = canvas.getActiveObject();
        if (!active || active.isCropGuide) return;

        active.clone((cloned) => {
            cloned.set({
                left: active.left + 20,
                top: active.top + 20,
                layerName: `${active.layerName || 'Layer'} Copy`,
                layerType: active.layerType
            });
            canvas.add(cloned);
            canvas.setActiveObject(cloned);
            canvas.renderAll();
        });
    }

    function updateLayersList() {
        const listContainer = document.getElementById('studioLayersList');
        const countBadge = document.getElementById('layerCountBadge');
        if (!listContainer || !canvas) return;

        const objects = canvas.getObjects().filter(o => !o.isCropGuide);
        if (countBadge) countBadge.textContent = objects.length;

        if (objects.length === 0) {
            listContainer.innerHTML = `
                <div id="emptyLayersPlaceholder" class="p-6 text-center text-slate-500 space-y-2">
                    <span class="material-symbols-outlined text-3xl opacity-50">layers</span>
                    <p class="text-xs">Chưa có Layer nào trên Canvas.<br>Tải ảnh hoặc thêm Text để bắt đầu!</p>
                </div>
            `;
            return;
        }

        const activeObj = canvas.getActiveObject();
        listContainer.innerHTML = '';

        // Render from top layer to bottom layer (reverse of array index)
        for (let i = objects.length - 1; i >= 0; i--) {
            const obj = objects[i];
            const isActive = (obj === activeObj);

            let icon = 'image';
            if (obj.layerType === 'text' || obj.type === 'textbox') icon = 'title';
            else if (obj.layerType === 'shape') icon = 'shapes';

            const name = obj.layerName || (obj.text ? obj.text.substring(0, 15) : `Lớp ${i + 1}`);

            const item = document.createElement('div');
            item.className = `layer-item flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-700/60 hover:border-purple-400 cursor-pointer transition-all ${isActive ? 'active' : ''}`;
            
            item.innerHTML = `
                <div class="flex items-center gap-2 min-w-0 flex-1">
                    <span class="material-symbols-outlined text-sm text-purple-400 flex-shrink-0">${icon}</span>
                    <span class="text-xs font-medium text-slate-200 truncate">${escapeHtml(name)}</span>
                </div>
                <div class="flex items-center gap-1 flex-shrink-0">
                    <button class="btn-toggle-vis p-1 text-slate-400 hover:text-cyan-300 rounded" title="${obj.visible ? 'Ẩn layer' : 'Hiện layer'}">
                        <span class="material-symbols-outlined text-xs">${obj.visible !== false ? 'visibility' : 'visibility_off'}</span>
                    </button>
                    <button class="btn-toggle-lock p-1 text-slate-400 hover:text-amber-300 rounded" title="${obj.selectable ? 'Khóa layer' : 'Mở khóa'}">
                        <span class="material-symbols-outlined text-xs">${obj.selectable !== false ? 'lock_open' : 'lock'}</span>
                    </button>
                    <button class="btn-delete-item p-1 text-slate-400 hover:text-red-400 rounded" title="Xóa">
                        <span class="material-symbols-outlined text-xs">close</span>
                    </button>
                </div>
            `;

            // Layer item click -> select object
            item.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                canvas.setActiveObject(obj);
                canvas.renderAll();
                updateLayersList();
                syncInspectorFromSelected();
            });

            // Visibility toggle
            item.querySelector('.btn-toggle-vis').addEventListener('click', () => {
                obj.visible = !obj.visible;
                canvas.renderAll();
                updateLayersList();
                saveHistoryState();
            });

            // Lock toggle
            item.querySelector('.btn-toggle-lock').addEventListener('click', () => {
                const isSelectable = (obj.selectable !== false);
                obj.selectable = !isSelectable;
                obj.evented = !isSelectable;
                if (!obj.selectable && canvas.getActiveObject() === obj) {
                    canvas.discardActiveObject();
                }
                canvas.renderAll();
                updateLayersList();
                saveHistoryState();
            });

            // Delete item
            item.querySelector('.btn-delete-item').addEventListener('click', () => {
                canvas.remove(obj);
                canvas.renderAll();
                updateLayersList();
                saveHistoryState();
            });

            listContainer.appendChild(item);
        }
    }

    function onObjectSelected(e) {
        updateLayersList();
        syncInspectorFromSelected();
    }

    function onSelectionCleared() {
        updateLayersList();
    }

    function syncInspectorFromSelected() {
        if (!canvas) return;
        const active = canvas.getActiveObject();
        if (!active) return;

        // Opacity
        const sliderOpacity = document.getElementById('sliderLayerOpacity');
        const valOpacity = document.getElementById('valLayerOpacity');
        if (sliderOpacity && valOpacity) {
            const op = Math.round((active.opacity !== undefined ? active.opacity : 1) * 100);
            sliderOpacity.value = op;
            valOpacity.textContent = `${op}%`;
        }

        // Text Properties
        if (active.type === 'textbox' || active.type === 'text') {
            const fontSelect = document.getElementById('textFontFamily');
            const fontSize = document.getElementById('textFontSize');
            const textColor = document.getElementById('textColorPicker');
            const textHex = document.getElementById('textColorHex');

            if (fontSelect && active.fontFamily) fontSelect.value = active.fontFamily;
            if (fontSize && active.fontSize) fontSize.value = active.fontSize;
            if (textColor && textHex && active.fill) {
                textColor.value = active.fill;
                textHex.value = active.fill;
            }
        }
    }

    /**
     * Export File & Chat Integration
     */
    function setupExportAndChatIntegration() {
        const btnDownload = document.getElementById('btnDownloadImage');
        const btnSendToChat = document.getElementById('btnSendToChat');
        const formatSelect = document.getElementById('exportFormatSelect');
        const scaleSelect = document.getElementById('exportScaleSelect');

        if (btnDownload) {
            btnDownload.addEventListener('click', () => {
                const format = formatSelect.value || 'png';
                const multiplier = parseInt(scaleSelect.value, 10) || 1;

                const dataUrl = canvas.toDataURL({
                    format: format,
                    multiplier: multiplier,
                    quality: 0.95
                });

                const link = document.createElement('a');
                link.download = `karik_poster_${Date.now()}.${format === 'jpeg' ? 'jpg' : format}`;
                link.href = dataUrl;
                link.click();
            });
        }

        if (btnSendToChat) {
            btnSendToChat.addEventListener('click', async () => {
                btnSendToChat.disabled = true;
                const origHtml = btnSendToChat.innerHTML;
                btnSendToChat.innerHTML = `<span class="material-symbols-outlined text-sm animate-spin">sync</span> Đang tải vào Chat...`;

                try {
                    const dataUrl = canvas.toDataURL({
                        format: 'png',
                        multiplier: 1.5,
                        quality: 0.95
                    });

                    // Send base64 image directly to Chat module
                    if (typeof window.attachStudioImageToChat === 'function') {
                        await window.attachStudioImageToChat(dataUrl, `poster_design_${Date.now()}.png`);
                        window.closeImageEditor();
                    } else {
                        // Fallback download if chat hook is missing
                        const link = document.createElement('a');
                        link.download = `poster_${Date.now()}.png`;
                        link.href = dataUrl;
                        link.click();
                        window.closeImageEditor();
                    }
                } catch (err) {
                    console.error('[ImageStudio] Send to chat error:', err);
                    alert('Đã xảy ra lỗi khi gửi ảnh vào chat. Đang tải về máy...');
                } finally {
                    btnSendToChat.disabled = false;
                    btnSendToChat.innerHTML = origHtml;
                }
            });
        }
    }

    /**
     * Show Floating Studio Toast Notification
     */
    function showStudioToast(message, duration = 4500) {
        const toast = document.getElementById('studioToast');
        const toastText = document.getElementById('studioToastText');
        if (!toast || !toastText) return;

        toastText.textContent = message;
        toast.classList.remove('hidden');
        toast.classList.add('flex');

        setTimeout(() => {
            toast.classList.add('hidden');
            toast.classList.remove('flex');
        }, duration);
    }

    /**
     * Build Automated Poster from Image with AI Configurations (Title, Subtitle, Colors, Filters, Badges)
     */
    window.createPosterFromImage = function(imgSrc, config = {}) {
        if (!canvas) {
            initFabricCanvas();
        }

        // 1. Set Canvas Dimensions (Default 1080x1350 for Poster)
        const targetW = config.width || (config.preset === 'instagram' ? 1080 : 1080);
        const targetH = config.height || (config.preset === 'instagram' ? 1080 : 1350);
        canvasWidth = targetW;
        canvasHeight = targetH;
        canvas.setWidth(canvasWidth);
        canvas.setHeight(canvasHeight);

        const dimDisplay = document.getElementById('canvasDimensionDisplay');
        if (dimDisplay) dimDisplay.textContent = `${canvasWidth} x ${canvasHeight} px`;

        // 2. Set Canvas Background Color
        const bgColor = config.bg || '#0f172a';
        canvas.clear();
        canvas.setBackgroundColor(bgColor, canvas.renderAll.bind(canvas));

        // 3. Load User's Image and place on canvas
        fabric.Image.fromURL(imgSrc, (img) => {
            if (!img) return;

            // Scale image nicely to occupy the canvas body
            const maxImgW = canvasWidth * 0.92;
            const maxImgH = canvasHeight * 0.65;
            const scale = Math.min(maxImgW / img.width, maxImgH / img.height, 1);

            img.set({
                left: canvasWidth / 2,
                top: canvasHeight * 0.58,
                originX: 'center',
                originY: 'center',
                scaleX: scale,
                scaleY: scale,
                layerName: 'Ảnh Gốc Poster',
                layerType: 'image'
            });

            // 4. Apply Filter / Color Adjustments
            const filtersList = [];
            const filterName = (config.filter || '').toLowerCase();

            if (filterName === 'cinematic') {
                filtersList.push(
                    new fabric.Image.filters.Contrast({ contrast: 0.25 }),
                    new fabric.Image.filters.Saturation({ saturation: -0.1 }),
                    new fabric.Image.filters.Brightness({ brightness: -0.05 })
                );
            } else if (filterName === 'cyberpunk') {
                filtersList.push(
                    new fabric.Image.filters.Contrast({ contrast: 0.3 }),
                    new fabric.Image.filters.Saturation({ saturation: 0.4 }),
                    new fabric.Image.filters.HueRotation({ rotation: 0.85 })
                );
            } else if (filterName === 'vintage') {
                filtersList.push(
                    new fabric.Image.filters.Sepia(),
                    new fabric.Image.filters.Contrast({ contrast: 0.15 })
                );
            } else if (filterName === 'vibrant' || filterName === 'drama') {
                filtersList.push(
                    new fabric.Image.filters.Contrast({ contrast: 0.3 }),
                    new fabric.Image.filters.Saturation({ saturation: 0.35 })
                );
            }

            // Custom adjustments
            if (config.brightness) {
                filtersList.push(new fabric.Image.filters.Brightness({ brightness: config.brightness / 100 }));
            }
            if (config.contrast) {
                filtersList.push(new fabric.Image.filters.Contrast({ contrast: config.contrast / 100 }));
            }
            if (config.saturation) {
                filtersList.push(new fabric.Image.filters.Saturation({ saturation: config.saturation / 100 }));
            }

            if (filtersList.length > 0) {
                img.filters = filtersList;
                img.applyFilters();
            }

            canvas.add(img);

            // 5. Add Badge Shape (if specified)
            if (config.badge) {
                const badgeBox = new fabric.Rect({
                    width: 240,
                    height: 48,
                    rx: 24,
                    ry: 24,
                    fill: '#ef4444',
                    left: canvasWidth / 2,
                    top: 60,
                    originX: 'center',
                    originY: 'center',
                    shadow: new fabric.Shadow({ color: 'rgba(239, 68, 68, 0.6)', blur: 15, offsetX: 0, offsetY: 4 }),
                    layerName: 'Khung Huy Hiệu',
                    layerType: 'shape'
                });

                const badgeText = new fabric.IText(`🔥 ${String(config.badge).toUpperCase()}`, {
                    fontSize: 20,
                    fontWeight: 'bold',
                    fontFamily: config.fontFamily || 'Sora',
                    fill: '#ffffff',
                    left: canvasWidth / 2,
                    top: 60,
                    originX: 'center',
                    originY: 'center',
                    layerName: 'Chữ Huy Hiệu',
                    layerType: 'text'
                });

                canvas.add(badgeBox);
                canvas.add(badgeText);
            }

            // 6. Add Title Headline Layer
            const titleStr = config.title || 'TIÊU ĐỀ POSTER';
            const titleTop = config.badge ? 140 : 100;
            const titleObj = new fabric.IText(titleStr, {
                fontSize: 60,
                fontWeight: 'bold',
                fontFamily: config.fontFamily || 'Sora',
                fill: config.titleColor || '#facc15',
                textAlign: 'center',
                left: canvasWidth / 2,
                top: titleTop,
                originX: 'center',
                originY: 'center',
                shadow: new fabric.Shadow({ color: 'rgba(0, 0, 0, 0.9)', blur: 20, offsetX: 0, offsetY: 6 }),
                layerName: 'Tiêu Đề Poster',
                layerType: 'text'
            });
            canvas.add(titleObj);

            // 7. Add Subtitle / Caption Layer
            const subtitleStr = config.subtitle || config.caption || '';
            if (subtitleStr) {
                const subtitleObj = new fabric.IText(subtitleStr, {
                    fontSize: 28,
                    fontWeight: '600',
                    fontFamily: config.fontFamily || 'Inter',
                    fill: config.subtitleColor || '#ffffff',
                    textAlign: 'center',
                    left: canvasWidth / 2,
                    top: titleTop + 75,
                    originX: 'center',
                    originY: 'center',
                    shadow: new fabric.Shadow({ color: 'rgba(0, 0, 0, 0.8)', blur: 12, offsetX: 0, offsetY: 3 }),
                    layerName: 'Chú Thích & Slogan',
                    layerType: 'text'
                });
                canvas.add(subtitleObj);
            }

            // 8. Select Title by default for easy editing
            canvas.setActiveObject(titleObj);
            canvas.renderAll();
            updateLayersList();
            saveHistoryState();
            fitCanvasToViewport();
            showStudioToast('✨ AI Karik đã tự động thiết kế Poster (Tiêu đề, Màu sắc, Chú thích) cho bạn!');
        }, { crossOrigin: 'anonymous' });
    };

    /**
     * Autonomous Live Sequential Poster Creation:
     * 1. Opens Studio
     * 2. Sets canvas & background
     * 3. Places user image (Step 1)
     * 4. Applies color filter (Step 2)
     * 5. Adds Badge + Title text (Step 3)
     * 6. Adds Subtitle/Annotation text (Step 4)
     * 7. Exports high-res poster and sends back to chat!
     */
    window.autoBuildAndSendPoster = function(imgSrc, config = {}) {
        if (!isModuleInitialized) {
            window.initImageEditorModule();
        }

        const modal = document.getElementById('imageEditorModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
        }

        if (!canvas) {
            initFabricCanvas();
        }

        // Target Dimensions
        const targetW = config.width || (config.preset === 'instagram' ? 1080 : 1080);
        const targetH = config.height || (config.preset === 'instagram' ? 1080 : 1350);
        canvasWidth = targetW;
        canvasHeight = targetH;
        canvas.setWidth(canvasWidth);
        canvas.setHeight(canvasHeight);

        const dimDisplay = document.getElementById('canvasDimensionDisplay');
        if (dimDisplay) dimDisplay.textContent = `${canvasWidth} x ${canvasHeight} px`;

        const bgColor = config.bg || '#0f172a';
        canvas.clear();
        canvas.setBackgroundColor(bgColor, canvas.renderAll.bind(canvas));
        fitCanvasToViewport();

        showStudioToast('🖼️ Bước 1/4: Đang nạp ảnh gốc vào Studio...');

        // Step 1: Place User Image
        fabric.Image.fromURL(imgSrc, (img) => {
            if (!img) return;

            const maxImgW = canvasWidth * 0.92;
            const maxImgH = canvasHeight * 0.65;
            const scale = Math.min(maxImgW / img.width, maxImgH / img.height, 1);

            img.set({
                left: canvasWidth / 2,
                top: canvasHeight * 0.58,
                originX: 'center',
                originY: 'center',
                scaleX: scale,
                scaleY: scale,
                layerName: 'Ảnh Gốc Poster',
                layerType: 'image'
            });

            canvas.add(img);
            canvas.renderAll();
            updateLayersList();

            // Step 2: Apply Color Adjustments & Filters (after 400ms)
            setTimeout(() => {
                showStudioToast('🎨 Bước 2/4: Đang cân chỉnh màu sắc & bộ lọc Cinematic...');
                const filtersList = [];
                const filterName = (config.filter || 'cinematic').toLowerCase();

                if (filterName === 'cinematic') {
                    filtersList.push(
                        new fabric.Image.filters.Contrast({ contrast: 0.25 }),
                        new fabric.Image.filters.Saturation({ saturation: -0.1 }),
                        new fabric.Image.filters.Brightness({ brightness: -0.05 })
                    );
                } else if (filterName === 'cyberpunk') {
                    filtersList.push(
                        new fabric.Image.filters.Contrast({ contrast: 0.3 }),
                        new fabric.Image.filters.Saturation({ saturation: 0.4 }),
                        new fabric.Image.filters.HueRotation({ rotation: 0.85 })
                    );
                } else if (filterName === 'vintage') {
                    filtersList.push(
                        new fabric.Image.filters.Sepia(),
                        new fabric.Image.filters.Contrast({ contrast: 0.15 })
                    );
                } else if (filterName === 'vibrant' || filterName === 'drama') {
                    filtersList.push(
                        new fabric.Image.filters.Contrast({ contrast: 0.3 }),
                        new fabric.Image.filters.Saturation({ saturation: 0.35 })
                    );
                }

                if (config.brightness) {
                    filtersList.push(new fabric.Image.filters.Brightness({ brightness: config.brightness / 100 }));
                }
                if (config.contrast) {
                    filtersList.push(new fabric.Image.filters.Contrast({ contrast: config.contrast / 100 }));
                }
                if (config.saturation) {
                    filtersList.push(new fabric.Image.filters.Saturation({ saturation: config.saturation / 100 }));
                }

                if (filtersList.length > 0) {
                    img.filters = filtersList;
                    img.applyFilters();
                }
                canvas.renderAll();

                // Step 3: Add Title Headline & Badge (after 450ms)
                setTimeout(() => {
                    showStudioToast('✍️ Bước 3/4: Đang thiết kế Tiêu đề chính...');

                    if (config.badge) {
                        const badgeBox = new fabric.Rect({
                            width: 240,
                            height: 48,
                            rx: 24,
                            ry: 24,
                            fill: '#ef4444',
                            left: canvasWidth / 2,
                            top: 60,
                            originX: 'center',
                            originY: 'center',
                            shadow: new fabric.Shadow({ color: 'rgba(239, 68, 68, 0.6)', blur: 15, offsetX: 0, offsetY: 4 }),
                            layerName: 'Khung Huy Hiệu',
                            layerType: 'shape'
                        });

                        const badgeText = new fabric.IText(`🔥 ${String(config.badge).toUpperCase()}`, {
                            fontSize: 20,
                            fontWeight: 'bold',
                            fontFamily: config.fontFamily || 'Sora',
                            fill: '#ffffff',
                            left: canvasWidth / 2,
                            top: 60,
                            originX: 'center',
                            originY: 'center',
                            layerName: 'Chữ Huy Hiệu',
                            layerType: 'text'
                        });

                        canvas.add(badgeBox);
                        canvas.add(badgeText);
                    }

                    const titleStr = config.title || 'TIÊU ĐỀ POSTER';
                    const titleTop = config.badge ? 140 : 100;
                    const titleObj = new fabric.IText(titleStr, {
                        fontSize: 60,
                        fontWeight: 'bold',
                        fontFamily: config.fontFamily || 'Sora',
                        fill: config.titleColor || '#facc15',
                        textAlign: 'center',
                        left: canvasWidth / 2,
                        top: titleTop,
                        originX: 'center',
                        originY: 'center',
                        shadow: new fabric.Shadow({ color: 'rgba(0, 0, 0, 0.9)', blur: 20, offsetX: 0, offsetY: 6 }),
                        layerName: 'Tiêu Đề Poster',
                        layerType: 'text'
                    });
                    canvas.add(titleObj);
                    canvas.renderAll();
                    updateLayersList();

                    // Step 4: Add Subtitle & Annotations (after 450ms)
                    setTimeout(() => {
                        showStudioToast('📝 Bước 4/4: Đang gắn chú thích & thông tin chi tiết...');

                        const subtitleStr = config.subtitle || config.caption || '';
                        if (subtitleStr) {
                            const subtitleObj = new fabric.IText(subtitleStr, {
                                fontSize: 28,
                                fontWeight: '600',
                                fontFamily: config.fontFamily || 'Inter',
                                fill: config.subtitleColor || '#ffffff',
                                textAlign: 'center',
                                left: canvasWidth / 2,
                                top: titleTop + 75,
                                originX: 'center',
                                originY: 'center',
                                shadow: new fabric.Shadow({ color: 'rgba(0, 0, 0, 0.8)', blur: 12, offsetX: 0, offsetY: 3 }),
                                layerName: 'Chú Thích & Slogan',
                                layerType: 'text'
                            });
                            canvas.add(subtitleObj);
                        }

                        canvas.renderAll();
                        updateLayersList();
                        saveHistoryState();
                        showStudioToast('🚀 Đang xuất bản Poster chất lượng cao và gửi vào Chat...');

                        // Step 5: Export high-res poster and send back to chat (after 600ms)
                        setTimeout(() => {
                            try {
                                const completedDataUrl = canvas.toDataURL({
                                    format: 'png',
                                    multiplier: 1.5
                                });

                                if (typeof window.receiveCompletedPosterFromStudio === 'function') {
                                    window.receiveCompletedPosterFromStudio(completedDataUrl, config);
                                }

                                setTimeout(() => {
                                    window.closeImageEditor();
                                }, 1200);
                            } catch (expErr) {
                                console.error('[ImageStudio] Export error:', expErr);
                            }
                        }, 600);

                    }, 450);

                }, 450);

            }, 400);

        }, { crossOrigin: 'anonymous' });
    };

    /**
     * Global Controls: Open & Close Modal
     */
    window.openImageEditor = function (initialImageSrc = null, posterConfig = null) {
        if (!isModuleInitialized) {
            window.initImageEditorModule();
        }

        const modal = document.getElementById('imageEditorModal');
        if (!modal) {
            console.warn('[ImageStudio] Modal container #imageEditorModal not found in DOM yet.');
            return;
        }

        modal.classList.remove('hidden');
        modal.style.display = 'flex';

        if (!canvas) {
            initFabricCanvas();
        }

        setTimeout(() => {
            fitCanvasToViewport();
            if (initialImageSrc) {
                if (posterConfig && typeof posterConfig === 'object') {
                    window.createPosterFromImage(initialImageSrc, posterConfig);
                } else {
                    insertImageFromUrl(initialImageSrc, 'Ảnh Gốc Khung Chat');
                }
            }
        }, 150);
    };

    window.closeImageEditor = function () {
        const modal = document.getElementById('imageEditorModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
    };

    function escapeHtml(text) {
        if (!text) return '';
        return text.replace(/[&<>"']/g, function (m) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            }[m];
        });
    }

})();
