(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.imageBackgroundRemoval = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
    'use strict';

    function median(values) {
        const sorted = values.slice().sort((a, b) => a - b);
        return sorted[Math.floor(sorted.length / 2)] || 0;
    }

    function colorDistanceSq(data, offset, color) {
        const dr = data[offset] - color[0];
        const dg = data[offset + 1] - color[1];
        const db = data[offset + 2] - color[2];
        return dr * dr + dg * dg + db * db;
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
        const color = [
            median(offsets.map(offset => data[offset])),
            median(offsets.map(offset => data[offset + 1])),
            median(offsets.map(offset => data[offset + 2]))
        ];
        const distances = offsets
            .map(offset => Math.sqrt(colorDistanceSq(data, offset, color)))
            .sort((a, b) => a - b);
        const p90 = distances[Math.floor(distances.length * 0.9)] || 0;
        return { color, p90, offsets };
    }

    function removeBackgroundPixels(source, width, height, options = {}) {
        if (!source || source.length !== width * height * 4 || width < 2 || height < 2) {
            return { applied: false, reason: 'Dữ liệu ảnh không hợp lệ.' };
        }

        const data = new Uint8ClampedArray(source);
        const { color, p90, offsets } = estimateBackground(data, width, height);
        const tolerance = Math.max(8, Math.min(Number(options.tolerance) || 28, 80));
        const detailProtection = ['high', 'balanced', 'low'].includes(options.detailProtection)
            ? options.detailProtection
            : 'high';

        // A broad/multicolour border usually means a real scene, not a removable studio background.
        if (p90 > Math.max(78, tolerance * 2.1)) {
            return { applied: false, reason: 'Nền ảnh có nhiều chi tiết hoặc ánh sáng quá phức tạp.' };
        }

        const growthFactor = detailProtection === 'high' ? 1.15 : (detailProtection === 'balanced' ? 1.35 : 1.65);
        const borderAllowance = detailProtection === 'high' ? 0.3 : (detailProtection === 'balanced' ? 0.5 : 0.7);
        const threshold = Math.max(tolerance * growthFactor, p90 + tolerance * borderAllowance);
        const thresholdSq = threshold * threshold;
        const visited = new Uint8Array(width * height);
        const queue = new Int32Array(width * height);
        let head = 0;
        let tail = 0;

        function enqueue(pixelIndex) {
            if (visited[pixelIndex]) return;
            const offset = pixelIndex * 4;
            if (data[offset + 3] === 0 || colorDistanceSq(data, offset, color) <= thresholdSq) {
                visited[pixelIndex] = 1;
                queue[tail++] = pixelIndex;
            }
        }

        offsets.forEach(offset => enqueue(offset / 4));
        while (head < tail) {
            const current = queue[head++];
            const x = current % width;
            const y = Math.floor(current / width);
            if (x > 0) enqueue(current - 1);
            if (x < width - 1) enqueue(current + 1);
            if (y > 0) enqueue(current - width);
            if (y < height - 1) enqueue(current + width);
        }

        const removedRatio = tail / (width * height);
        if (removedRatio < 0.015 || removedRatio > 0.94) {
            return { applied: false, reason: 'Không xác định được ranh giới chủ thể an toàn.' };
        }

        // Feather only the removable background side. Foreground alpha is never reduced.
        for (let pixel = 0; pixel < visited.length; pixel += 1) {
            if (!visited[pixel]) continue;
            const x = pixel % width;
            const y = Math.floor(pixel / width);
            const touchesSubject =
                (x > 0 && !visited[pixel - 1]) ||
                (x < width - 1 && !visited[pixel + 1]) ||
                (y > 0 && !visited[pixel - width]) ||
                (y < height - 1 && !visited[pixel + width]);
            data[pixel * 4 + 3] = touchesSubject ? 48 : 0;
        }

        return {
            applied: true,
            pixels: data,
            removedRatio,
            confidence: Math.max(0, Math.min(1, 1 - (p90 / 100))),
            detailProtection
        };
    }

    return { removeBackgroundPixels, estimateBackground };
});
