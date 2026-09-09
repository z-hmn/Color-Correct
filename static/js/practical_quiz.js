/*
 * Practical quiz — match the target edit.
 *
 * Wrapped in an IIFE so its state does not collide with main.js, which is
 * loaded on every page.
 */
(function () {
    'use strict';

    const canvas = document.getElementById('edit-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Target values that represent the correct edit
    const targetValues = {
        exposure: -30,
        highlights: 20,
        shadows: -15,
        contrast: 5,
        saturation: 10,
        warmth: 30,
        tint: 15
    };

    // Per-tool tolerance when scoring the user's edit
    const tolerances = {
        exposure: 35,
        highlights: 30,
        shadows: 30,
        contrast: 25,
        saturation: 25,
        warmth: 35,
        tint: 30
    };

    // Current user filter values
    const filterValues = {
        exposure: 0,
        contrast: 0,
        highlights: 0,
        shadows: 0,
        warmth: 0,
        tint: 0,
        saturation: 0
    };

    const originalImage = new Image();
    originalImage.crossOrigin = 'anonymous';
    originalImage.src = '/static/images/quiz_original.jpg';

    originalImage.onload = () => {
        // Maintain aspect ratio but fit within a reasonable size
        const maxWidth = 500;
        let width = originalImage.width;
        let height = originalImage.height;

        if (width > maxWidth) {
            const ratio = maxWidth / width;
            width = maxWidth;
            height = height * ratio;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(originalImage, 0, 0, width, height);
        applyFilters();
    };

    function clamp(value, min = 0, max = 255) {
        return Math.max(min, Math.min(max, value));
    }

    function applyFilters() {
        if (!originalImage.complete || !canvas.width) return;

        ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

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
            const avg = (r + g + b) / 3;
            if (avg > 127) {
                const factor = (avg - 127) / 128;
                r -= highlights * factor;
                g -= highlights * factor;
                b -= highlights * factor;
            }

            // Shadows: affect dark areas more
            if (avg < 127) {
                const factor = (127 - avg) / 128;
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
            const gray = 0.3 * r + 0.59 * g + 0.11 * b;
            r = gray + (r - gray) * (1 + saturation / 100);
            g = gray + (g - gray) * (1 + saturation / 100);
            b = gray + (b - gray) * (1 + saturation / 100);

            data[i] = clamp(r);
            data[i + 1] = clamp(g);
            data[i + 2] = clamp(b);
        }

        ctx.putImageData(imageData, 0, 0);
    }

    /* ---------------------------------------------------------------------
       Scoring
       --------------------------------------------------------------------- */

    function evaluateEdit() {
        const scores = {};

        for (const [key, value] of Object.entries(targetValues)) {
            const difference = Math.abs(filterValues[key] - value);
            const tolerance = tolerances[key] || 25;
            scores[key] = Math.max(0, 1 - (difference / tolerance));
        }

        return scores;
    }

    function isEditClose(scores) {
        const values = Object.values(scores);
        const avgScore = values.reduce((sum, score) => sum + score, 0) / values.length;
        return avgScore > 0.75;
    }

    function findWorstAdjustment(scores) {
        let worstKey = null;
        let worstScore = Infinity;

        for (const [key, score] of Object.entries(scores)) {
            if (score < worstScore) {
                worstScore = score;
                worstKey = key;
            }
        }

        return {
            parameter: worstKey,
            score: worstScore,
            actual: filterValues[worstKey],
            target: targetValues[worstKey]
        };
    }

    function getHint(worstAdjustment) {
        const { parameter, actual, target } = worstAdjustment;
        const direction = actual < target ? 'too low' : 'too high';
        const verb = actual < target ? 'increasing' : 'decreasing';

        const hints = {
            exposure: `The overall brightness is ${direction}. Try ${verb} the exposure.`,
            highlights: `The bright parts of the image are ${direction}. Try ${verb} the highlights.`,
            shadows: `The dark areas are ${direction}. Try ${verb} the shadows value.`,
            contrast: `The image has ${direction} contrast. Try ${verb} the contrast.`,
            saturation: `The colors are ${actual < target ? 'too muted' : 'too vibrant'}. Try ${verb} the saturation.`,
            warmth: `The image is ${actual < target ? 'too cool' : 'too warm'}. Try ${verb} the warmth.`,
            tint: `The image has ${actual < target ? 'too much magenta' : 'too much green'}. Try ${verb} the tint.`
        };

        return hints[parameter] || `Adjust the ${parameter} value — it's not quite right yet.`;
    }

    /* ---------------------------------------------------------------------
       Submission
       --------------------------------------------------------------------- */

    const feedbackContainer = document.getElementById('feedback');

    function showSuccess() {
        feedbackContainer.innerHTML = `
            <div class="alert alert-success">
                <strong>Great job!</strong> Your edit closely matches the target image.
                <div class="mt-2">
                    <button class="btn btn-success" id="complete-btn">Complete Quiz</button>
                </div>
            </div>
        `;

        document.getElementById('complete-btn').addEventListener('click', function () {
            window.location.href = '/quiz/result';
        });
    }

    function submitPracticalResults() {
        const scores = evaluateEdit();
        const isClose = isEditClose(scores);

        // If not close, give a targeted hint without hitting the server
        if (!isClose) {
            const hint = getHint(findWorstAdjustment(scores));
            feedbackContainer.innerHTML = `
                <div class="alert alert-warning">
                    <strong>Not quite there yet!</strong> ${hint}
                </div>
            `;
            return;
        }

        fetch('/quiz/practical/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ values: filterValues, is_close_enough: true })
        })
            .then(response => response.json())
            .then(data => {
                if (data.is_correct || isClose) {
                    showSuccess();
                } else {
                    feedbackContainer.innerHTML = `
                        <div class="alert alert-warning">
                            <strong>Not quite there yet!</strong> Keep adjusting your values.
                        </div>
                    `;
                }
            })
            .catch(error => {
                console.error('Error:', error);
                // Don't block the user on a server hiccup if the edit was close
                if (isClose) showSuccess();
            });
    }

    /* ---------------------------------------------------------------------
       Wiring
       --------------------------------------------------------------------- */

    function init() {
        const sliders = document.querySelectorAll('input[type="range"]');
        const checkButton = document.getElementById('check-btn');
        const resetButton = document.getElementById('reset-btn');
        let attempts = 0;

        sliders.forEach(slider => {
            const tool = slider.id.replace('-slider', '');
            if (!(tool in filterValues)) return;

            slider.addEventListener('input', function () {
                const group = this.closest('.slider-group');
                const valueDisplay = group && group.querySelector('.slider-value');
                if (valueDisplay) valueDisplay.textContent = this.value;

                filterValues[tool] = parseInt(this.value, 10);
                applyFilters();
            });
        });

        if (checkButton) {
            checkButton.addEventListener('click', function () {
                attempts++;

                // Track attempts locally as a backup to the server-side count
                const localAttempts = JSON.parse(localStorage.getItem('quizAttempts') || '{}');
                localAttempts['4'] = attempts;
                localStorage.setItem('quizAttempts', JSON.stringify(localAttempts));

                submitPracticalResults();
            });
        }

        if (resetButton) {
            resetButton.addEventListener('click', function () {
                sliders.forEach(slider => {
                    const tool = slider.id.replace('-slider', '');
                    if (!(tool in filterValues)) return;

                    slider.value = 0;
                    const group = slider.closest('.slider-group');
                    const valueDisplay = group && group.querySelector('.slider-value');
                    if (valueDisplay) valueDisplay.textContent = '0';

                    filterValues[tool] = 0;
                });

                feedbackContainer.innerHTML = '';
                applyFilters();
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
