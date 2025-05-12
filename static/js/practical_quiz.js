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

// Current user filter values
let filterValues = {
    exposure: 0,
    contrast: 0,
    highlights: 0,
    shadows: 0,
    warmth: 0,
    tint: 0,
    saturation: 0
};

// Get canvas and context
const canvas = document.getElementById('edit-canvas');
const ctx = canvas.getContext('2d');
const originalImage = new Image();
originalImage.crossOrigin = "anonymous"; // For security
originalImage.src = "/static/images/quiz_original.jpg";

// Load and draw the image
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

// Helper functions
function clamp(value, min = 0, max = 255) {
    return Math.max(min, Math.min(max, value));
}

// Apply filters to the image
function applyFilters() {
    ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;
    
    const exposure = filterValues.exposure;
    const contrast = filterValues.contrast;
    const highlights = filterValues.highlights;
    const shadows = filterValues.shadows;
    const warmth = filterValues.warmth;
    const tint = filterValues.tint;
    const saturation = filterValues.saturation;
    
    // Calculate contrast factor
    const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    
    // Process each pixel
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

// Initialize sliders and add event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const sliders = document.querySelectorAll('input[type="range"]');
    const feedbackContainer = document.getElementById('feedback');
    const checkButton = document.getElementById('check-btn');
    const resetButton = document.getElementById('reset-btn');
    
    // Set up event listeners for sliders
    sliders.forEach(slider => {
        const tool = slider.id.replace('-slider', '');
        
        slider.addEventListener('input', function() {
            const valueDisplay = this.closest('.slider-group').querySelector('.slider-value');
            if (valueDisplay) valueDisplay.textContent = this.value;
            
            filterValues[tool] = parseInt(this.value);
            applyFilters();
        });
    });
    
    // Check button handler
    checkButton.addEventListener('click', function() {
        const scores = evaluateEdit();
        const worstAdjustment = findWorstAdjustment(scores);
        
        if (isEditClose(scores)) {
            // Success
            feedbackContainer.innerHTML = `
                <div class="alert alert-success">
                    <strong>Great job!</strong> Your edit closely matches the target image.
                    <div class="mt-2">
                        <button class="btn btn-success" id="complete-btn">Complete Quiz</button>
                    </div>
                </div>
            `;
            
            // Add event listener to the complete button
            document.getElementById('complete-btn').addEventListener('click', function() {
                window.location.href = '/quiz/result';
            });
        } else {
            // Not close enough - provide hint
            const hint = getHint(worstAdjustment);
            feedbackContainer.innerHTML = `
                <div class="alert alert-warning">
                    <strong>Not quite there yet!</strong> ${hint}
                </div>
            `;
        }
    });
    
    // Reset button handler
    resetButton.addEventListener('click', function() {
        // Reset all sliders to default values
        sliders.forEach(slider => {
            const tool = slider.id.replace('-slider', '');
            slider.value = 0;
            
            const valueDisplay = slider.closest('.slider-group').querySelector('.slider-value');
            if (valueDisplay) valueDisplay.textContent = "0";
            
            filterValues[tool] = 0;
        });
        
        // Clear feedback
        feedbackContainer.innerHTML = '';
        
        // Reset image
        applyFilters();
    });
});

// Function to evaluate edit against target values
function evaluateEdit() {
    const scores = {};
    
    for (const [key, value] of Object.entries(targetValues)) {
        const userValue = filterValues[key];
        const difference = Math.abs(userValue - value);
        
        // Calculate a score between 0 and 1 (1 is perfect)
        // For most sliders with range -100 to 100, a difference of 20 or less is considered close
        const tolerance = 20;
        scores[key] = Math.max(0, 1 - (difference / tolerance));
    }
    
    return scores;
}

// Function to determine if the edit is close enough to target
function isEditClose(scores) {
    // Calculate average score
    const avgScore = Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.keys(scores).length;
    
    // Consider edit close if average score is above 0.75 (meaning most sliders are quite close)
    return avgScore > 0.75;
}

// Function to find the worst adjustment
function findWorstAdjustment(scores) {
    let worstKey = null;
    let worstScore = 1;
    
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

// Function to get a hint based on the worst adjustment
function getHint(worstAdjustment) {
    const { parameter, actual, target } = worstAdjustment;
    
    // Direction hints
    const direction = actual < target ? "too low" : "too high";
    
    // Parameter-specific hints
    const hints = {
        exposure: `The overall brightness is ${direction}. Try ${actual < target ? "increasing" : "decreasing"} the exposure.`,
        highlights: `The bright parts of the image are ${direction}. Try ${actual < target ? "increasing" : "decreasing"} the highlights.`,
        shadows: `The dark areas are ${direction}. Try ${actual < target ? "increasing" : "decreasing"} the shadows value.`,
        contrast: `The image has ${direction} contrast. Try ${actual < target ? "increasing" : "decreasing"} the contrast.`,
        saturation: `The colors are ${actual < target ? "too muted" : "too vibrant"}. Try ${actual < target ? "increasing" : "decreasing"} the saturation.`,
        warmth: `The image is ${actual < target ? "too cool" : "too warm"}. Try ${actual < target ? "increasing" : "decreasing"} the warmth.`,
        tint: `The image has ${actual < target ? "too much magenta" : "too much green"}. Try ${actual < target ? "increasing" : "decreasing"} the tint.`
    };
    
    return hints[parameter] || `Adjust the ${parameter} value - it's not quite right yet.`;
}