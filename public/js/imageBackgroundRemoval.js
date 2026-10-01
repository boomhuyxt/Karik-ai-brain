(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.imageBackgroundRemoval = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
    'use strict';

    function median(values) {
        if (!values || values.length === 0) return 0;
        const sorted = values.slice().sort((a, b) => a - b);
        return sorted[Math.floor(sorted.length / 2)] || 0;
    }

    function colorDistanceSq(data, offset, color) {
        const dr = data[offset] - color[0];
        const dg = data[offset + 1] - color[1];
        const db = data[offset + 2] - color[2];
        return dr * dr + dg * dg + db * db;
    }

    function pixelDistance(data, off1, off2) {
        const dr = data[off1] - data[off2];
        const dg = data[off1 + 1] - data[off2 + 1];
        const db = data[off1 + 2] - data[off2 + 2];
        return Math.sqrt(dr * dr + dg * dg + db * db);
    }

    function getBorderOffsets(width, height) {
        const offsets = [];
        const stride = Math.max(1, Math.floor(Math.max(width, height) / 180));
        for (let x = 0; x < width; x += stride) {
            offsets.push(x * 4, ((height - 1) * width + x) * 4);
        }
        for (let y = stride; y < height - 1; y += stride) {
            offsets.push((y * width) * 4, (y * width + width - 1) * 4);
        }
        return offsets;
    }

    function estimateBackground(data, width, height) {
        const offsets = getBorderOffsets(width, height);
        // Only consider non-transparent border pixels if present
        const opaqueOffsets = offsets.filter(off => data[off + 3] > 30);
        const sampleOffsets = opaqueOffsets.length > 0 ? opaqueOffsets : offsets;

        const color = [
            median(sampleOffsets.map(offset => data[offset])),
            median(sampleOffsets.map(offset => data[offset + 1])),
            median(sampleOffsets.map(offset => data[offset + 2]))
        ];
        const distances = sampleOffsets
            .map(offset => Math.sqrt(colorDistanceSq(data, offset, color)))
            .sort((a, b) => a - b);
        const p90 = distances[Math.floor(distances.length * 0.9)] || 0;
        return { color, p90, offsets: sampleOffsets };
    }

    function removeBackgroundPixels(source, width, height, options = {}) {
        if (!source || source.length !== width * height * 4 || width < 2 || height < 2) {
            return { applied: false, reason: 'Dữ liệu ảnh không hợp lệ.' };
        }

        const totalPixels = width * height;

        // 1. Transparent PNG Pre-check: If already cut out (has transparency), preserve intact!
        let transparentCount = 0;
        for (let i = 3; i < source.length; i += 4) {
            if (source[i] < 30) transparentCount++;
        }
        if (transparentCount / totalPixels > 0.02) {
            return {
                applied: true,
                pixels: new Uint8ClampedArray(source),
                removedRatio: transparentCount / totalPixels,
                alreadyCutout: true,
                reason: 'Ảnh đã được tách nền trong suốt sẵn.'
            };
        }

        const data = new Uint8ClampedArray(source);
        const { color, p90, offsets } = estimateBackground(data, width, height);
        const tolerance = Math.max(8, Math.min(Number(options.tolerance) || 24, 80));
        const detailProtection = ['high', 'balanced', 'low'].includes(options.detailProtection)
            ? options.detailProtection
            : 'high';

        // Reject scenes where borders are wildly scattered and multicolour (protecting subject from corrupt background guess)
        if (p90 > Math.max(140, tolerance * 3.8)) {
            return { applied: false, reason: 'Nền ảnh có nhiều chi tiết hoặc ánh sáng quá phức tạp.' };
        }

        // Sample 4 corners, but ONLY keep corners that are consistent with median background (eliminating dark table/shadow wildcards)
        const rawCorners = [
            [data[0], data[1], data[2]],
            [data[(width - 1) * 4], data[(width - 1) * 4 + 1], data[(width - 1) * 4 + 2]],
            [data[((height - 1) * width) * 4], data[((height - 1) * width) * 4 + 1], data[((height - 1) * width) * 4 + 2]],
            [data[(height * width - 1) * 4], data[(height * width - 1) * 4 + 1], data[(height * width - 1) * 4 + 2]]
        ];
        const validCorners = [];
        const maxCornerDistance = Math.max(p90 * 1.5, tolerance * 1.4);
        for (let c = 0; c < rawCorners.length; c++) {
            const dr = rawCorners[c][0] - color[0];
            const dg = rawCorners[c][1] - color[1];
            const db = rawCorners[c][2] - color[2];
            if (Math.sqrt(dr * dr + dg * dg + db * db) <= maxCornerDistance) {
                validCorners.push(rawCorners[c]);
            }
        }

        // Strict thresholds tailored to protect product details
        const growthFactor = detailProtection === 'high' ? 1.05 : (detailProtection === 'balanced' ? 1.22 : 1.42);
        const borderAllowance = detailProtection === 'high' ? 0.2 : (detailProtection === 'balanced' ? 0.35 : 0.5);
        const threshold = Math.max(tolerance * growthFactor, p90 * 0.3 + tolerance * borderAllowance);
        const thresholdSq = threshold * threshold;

        // Maximum contrast step allowed between adjacent background pixels (Edge Barrier)
        const maxStepGrad = detailProtection === 'high'
            ? Math.max(10, tolerance * 0.45)
            : (detailProtection === 'balanced' ? Math.max(14, tolerance * 0.6) : Math.max(20, tolerance * 0.8));

        const visited = new Uint8Array(totalPixels);
        const queue = new Int32Array(totalPixels);
        let head = 0;
        let tail = 0;

        function matchesBackground(offset) {
            if (data[offset + 3] === 0) return true;
            if (colorDistanceSq(data, offset, color) <= thresholdSq) return true;
            for (let c = 0; c < validCorners.length; c++) {
                if (colorDistanceSq(data, offset, validCorners[c]) <= thresholdSq) return true;
            }
            return false;
        }

        function enqueue(pixelIndex) {
            if (visited[pixelIndex]) return;
            const offset = pixelIndex * 4;
            if (matchesBackground(offset)) {
                visited[pixelIndex] = 1;
                queue[tail++] = pixelIndex;
            }
        }

        // Start flood fill ONLY from border pixels
        offsets.forEach(offset => enqueue(offset / 4));

        // Subject Central Sanctuary Bounding Box (Core of product photo)
        const centerLeft = Math.floor(width * 0.22);
        const centerRight = Math.ceil(width * 0.78);
        const centerTop = Math.floor(height * 0.20);
        const centerBottom = Math.ceil(height * 0.82);

        let centerPixelsRemoved = 0;
        const totalCenterPixels = Math.max(1, (centerRight - centerLeft) * (centerBottom - centerTop));

        while (head < tail) {
            const current = queue[head++];
            const x = current % width;
            const y = Math.floor(current / width);
            const currOffset = current * 4;

            if (x >= centerLeft && x <= centerRight && y >= centerTop && y <= centerBottom) {
                centerPixelsRemoved++;
            }

            const checkNeighbor = (nIdx, nx, ny) => {
                if (visited[nIdx]) return;
                const nOffset = nIdx * 4;

                // 1. Must match global background color or corner distribution
                if (!matchesBackground(nOffset)) return;

                // 2. Edge Gradient Barrier: Cannot step across a strong color edge
                const stepDiff = pixelDistance(data, currOffset, nOffset);
                if (stepDiff > maxStepGrad) {
                    return; // Hit product contour boundary! Stop here.
                }

                // 3. Central Sanctuary: Be even stricter inside the product core
                if (nx >= centerLeft && nx <= centerRight && ny >= centerTop && ny <= centerBottom) {
                    if (stepDiff > maxStepGrad * 0.75) return;
                }

                visited[nIdx] = 1;
                queue[tail++] = nIdx;
            };

            if (x > 0) checkNeighbor(current - 1, x - 1, y);
            if (x < width - 1) checkNeighbor(current + 1, x + 1, y);
            if (y > 0) checkNeighbor(current - width, x, y - 1);
            if (y < height - 1) checkNeighbor(current + width, x, y + 1);
        }

        // Subject Collapse Protection (only applicable on real images >= 30x30)
        if (width >= 30 && height >= 30 && centerPixelsRemoved / totalCenterPixels > 0.90) {
            return {
                applied: false,
                reason: 'Màu sản phẩm trùng với màu nền. Studio giữ nguyên ảnh gốc để bảo toàn chi tiết.'
            };
        }

        // =========================================================================
        // STEP A: TOPOLOGICAL HOLE RECOVERY (Preserves 100% of internal highlights & logos)
        // Any pixel marked as background that is NOT reachable from the outer border
        // is an internal enclosed hole inside the product! Restore it to foreground!
        // =========================================================================
        const outerBgReachable = new Uint8Array(totalPixels);
        const reachQueue = new Int32Array(totalPixels);
        let rHead = 0;
        let rTail = 0;

        // Seed with visited background pixels on the outer image border
        for (let x = 0; x < width; x++) {
            if (visited[x] === 1 && !outerBgReachable[x]) {
                outerBgReachable[x] = 1;
                reachQueue[rTail++] = x;
            }
            const bot = (height - 1) * width + x;
            if (visited[bot] === 1 && !outerBgReachable[bot]) {
                outerBgReachable[bot] = 1;
                reachQueue[rTail++] = bot;
            }
        }
        for (let y = 1; y < height - 1; y++) {
            const left = y * width;
            if (visited[left] === 1 && !outerBgReachable[left]) {
                outerBgReachable[left] = 1;
                reachQueue[rTail++] = left;
            }
            const right = y * width + width - 1;
            if (visited[right] === 1 && !outerBgReachable[right]) {
                outerBgReachable[right] = 1;
                reachQueue[rTail++] = right;
            }
        }

        while (rHead < rTail) {
            const cur = reachQueue[rHead++];
            const cx = cur % width;
            const cy = Math.floor(cur / width);

            const checkReach = (nIdx) => {
                if (visited[nIdx] === 1 && !outerBgReachable[nIdx]) {
                    outerBgReachable[nIdx] = 1;
                    reachQueue[rTail++] = nIdx;
                }
            };

            if (cx > 0) checkReach(cur - 1);
            if (cx < width - 1) checkReach(cur + 1);
            if (cy > 0) checkReach(cur - width);
            if (cy < height - 1) checkReach(cur + width);
        }

        // Restore any unreachable holes back to FOREGROUND (visited = 0)
        for (let i = 0; i < totalPixels; i++) {
            if (visited[i] === 1 && !outerBgReachable[i]) {
                visited[i] = 0; // It is inside the product!
            }
        }

        // =========================================================================
        // STEP B: ISLAND PRUNING / DESPECKLING (Cleans all floating dots, specks & noise)
        // Detects connected components of foreground (visited === 0).
        // Disconnected small islands floating outside the main product are noise!
        // =========================================================================
        if (width >= 20 && height >= 20) {
            const labels = new Int32Array(totalPixels).fill(-1);
            let compCount = 0;
            const components = [];

            for (let i = 0; i < totalPixels; i++) {
                if (visited[i] === 1 || labels[i] !== -1) continue;
                compCount++;
                const compPixels = [i];
                labels[i] = compCount;
                let cHead = 0;

                while (cHead < compPixels.length) {
                    const cur = compPixels[cHead++];
                    const cx = cur % width;
                    const cy = Math.floor(cur / width);

                    const checkComp = (nIdx) => {
                        if (visited[nIdx] === 0 && labels[nIdx] === -1) {
                            labels[nIdx] = compCount;
                            compPixels.push(nIdx);
                        }
                    };

                    if (cx > 0) checkComp(cur - 1);
                    if (cx < width - 1) checkComp(cur + 1);
                    if (cy > 0) checkComp(cur - width);
                    if (cy < height - 1) checkComp(cur + width);
                }

                components.push({
                    id: compCount,
                    size: compPixels.length,
                    pixels: compPixels
                });
            }

            if (components.length > 1) {
                // Find the primary product component
                let maxComp = components[0];
                for (let c = 1; c < components.length; c++) {
                    if (components[c].size > maxComp.size) {
                        maxComp = components[c];
                    }
                }

                // Minimum size for a valid secondary product part (e.g. second shoe in a pair)
                // Any small disconnected component (< 0.12% of image or < 6% of main product) is a speckle/noise dot!
                const minIslandSize = Math.max(30, Math.min(250, totalPixels * 0.0012, maxComp.size * 0.06));

                for (let c = 0; c < components.length; c++) {
                    const comp = components[c];
                    if (comp.id !== maxComp.id && comp.size < minIslandSize) {
                        // PRUNE SPECKLE: Mark this floating noise island as background!
                        for (let p = 0; p < comp.pixels.length; p++) {
                            visited[comp.pixels[p]] = 1;
                        }
                    }
                }
            }
        }

        // =========================================================================
        // STEP C: CLEAN BORDER SCAVENGING (Stray noise near image borders)
        // If pixels right against the outer border (within 2 pixels) are not part
        // of a large foreground component, eliminate them cleanly.
        // =========================================================================
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (x < 2 || x >= width - 2 || y < 2 || y >= height - 2) {
                    const idx = y * width + x;
                    if (visited[idx] === 0 && matchesBackground(idx * 4)) {
                        visited[idx] = 1;
                    }
                }
            }
        }

        let finalRemovedCount = 0;
        for (let i = 0; i < totalPixels; i++) {
            if (visited[i] === 1) finalRemovedCount++;
        }
        const removedRatio = finalRemovedCount / totalPixels;
        if (removedRatio < 0.005 || removedRatio > 0.985) {
            return { applied: false, reason: 'Không xác định được ranh giới chủ thể an toàn.' };
        }

        // =========================================================================
        // STEP D: SMART ANTI-ALIASED FEATHERING (No dirty halos, crisp natural edges)
        // =========================================================================
        for (let pixel = 0; pixel < totalPixels; pixel++) {
            if (visited[pixel]) {
                const x = pixel % width;
                const y = Math.floor(pixel / width);
                const touchesSubject =
                    (x > 0 && !visited[pixel - 1]) ||
                    (x < width - 1 && !visited[pixel + 1]) ||
                    (y > 0 && !visited[pixel - width]) ||
                    (y < height - 1 && !visited[pixel + width]);

                if (touchesSubject) {
                    // Soft, subtle edge blending (anti-aliasing)
                    const distToBg = Math.sqrt(colorDistanceSq(data, pixel * 4, color));
                    // If very close to background color, set to 0. Only soft transition gets a smooth 15-35 alpha
                    const softAlpha = Math.min(35, Math.max(0, Math.round((distToBg / (threshold + 1)) * 30)));
                    data[pixel * 4 + 3] = softAlpha;
                } else {
                    data[pixel * 4 + 3] = 0; // Pure clean transparency, no noise dots!
                }
            } else {
                data[pixel * 4 + 3] = 255; // 100% solid, crisp product foreground!
            }
        }

        return {
            applied: true,
            pixels: data,
            removedRatio,
            confidence: Math.max(0, Math.min(1, 1 - (p90 / 120))),
            detailProtection
        };
    }

    return { removeBackgroundPixels, estimateBackground };
});
