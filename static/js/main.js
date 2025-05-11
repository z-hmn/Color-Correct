let filterValues = {
    exposure: 0,
    contrast: 0,
    highlights: 0,
    shadows: 0,
    warmth: 0,
    tint: 0,
    saturation: 0
};

const canvas = document.getElementById('edit-canvas');
const ctx = canvas.getContext('2d');
const originalImage = new Image();
originalImage.crossOrigin = "anonymous"; // For safety
originalImage.src = "/static/images/original.jpg";

originalImage.onload = () => {
    canvas.width = originalImage.width;
    canvas.height = originalImage.height;
    ctx.drawImage(originalImage, 0, 0);
    applyFilters();
};

function clamp(value, min = 0, max = 255) {
    return Math.max(min, Math.min(max, value));
}

function applyFilters() {
    ctx.drawImage(originalImage, 0, 0);
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;

    const exposure = filterValues.exposure;
    const contrast = filterValues.contrast;
    const highlights = filterValues.highlights;
    const shadows = filterValues.shadows;
    const warmth = filterValues.warmth;
    const tint = filterValues.tint;
    const saturation = filterValues.saturation;

    const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));

    for (let i = 0; i < data.length; i += 4) {
        let r = data[i], g = data[i + 1], b = data[i + 2];

        // Exposure
        r += exposure;
        g += exposure;
        b += exposure;

        // Highlights: affect bright areas more
        let avg = (r + g + b) / 3;
        if (avg > 127) {
            let factor = (avg - 127) / 128;
            r -= highlights * factor;
            g -= highlights * factor;
            b -= highlights * factor;
        }

        // Shadows: affect dark areas more
        if (avg < 127) {
            let factor = (127 - avg) / 128;
            r += shadows * factor;
            g += shadows * factor;
            b += shadows * factor;
        }

        // Contrast
        r = contrastFactor * (r - 128) + 128;
        g = contrastFactor * (g - 128) + 128;
        b = contrastFactor * (b - 128) + 128;

        // Warmth: shift red/yellow
        r += warmth * 0.6;
        b -= warmth * 0.6;

        // Tint: green/magenta shift
        g += tint * 0.5;
        r -= tint * 0.25;
        b += tint * 0.25;

        // Saturation
        let gray = 0.3 * r + 0.59 * g + 0.11 * b;
        r = gray + (r - gray) * (1 + saturation / 100);
        g = gray + (g - gray) * (1 + saturation / 100);
        b = gray + (b - gray) * (1 + saturation / 100);

        // Clamp and apply
        data[i] = clamp(r);
        data[i + 1] = clamp(g);
        data[i + 2] = clamp(b);
    }

    ctx.putImageData(imageData, 0, 0);
}

document.addEventListener('DOMContentLoaded', () => {
    const sliders = document.querySelectorAll('input[type="range"]');

    sliders.forEach(slider => {
        const tool = slider.id.replace('-slider', '');
        slider.addEventListener('input', function () {
            const valueDisplay = this.closest('.slider-group').querySelector('.slider-value');
            if (valueDisplay) valueDisplay.textContent = this.value;

            filterValues[tool] = parseInt(this.value);
            applyFilters();
        });
    });
});
