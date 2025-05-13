// Updated quiz.js with attempt tracking
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('quiz-form');
    const feedbackContainer = document.getElementById('feedback');
    const submitButton = document.getElementById('submit-btn');
    
    // Keep track of attempts for this question
    let attempts = 0;
    
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Increment attempts count
            attempts++;
            
            // Get the question ID
            const questionId = form.getAttribute('data-question-id');
            
            // Track this attempt in localStorage as a backup
            const localAttempts = JSON.parse(localStorage.getItem('quizAttempts') || '{}');
            localAttempts[questionId] = attempts;
            localStorage.setItem('quizAttempts', JSON.stringify(localAttempts));
            
            // Submit the form
            const formData = new FormData(form);
            fetch(`/quiz/${questionId}`, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                console.log("Received response:", data); // Debugging output
                feedbackContainer.innerHTML = `<div class="${data.feedback_class}">${data.feedback}</div>`;
                
                if (data.feedback_class === "feedback correct") {
                    // Update the button when the answer is correct
                    submitButton.textContent = data.is_last ? "Next" : "Next";
                    submitButton.classList.add("btn-success");
                    submitButton.classList.remove("btn-primary");
                    submitButton.setAttribute("data-next-id", data.next_id);
                    
                    // Update attempts count from server
                    if (data.attempts) {
                        attempts = data.attempts;
                    }
                    
                    // Disable all radio buttons after correct answer
                    document.querySelectorAll('input[type="radio"]').forEach(input => {
                        input.disabled = true;
                    });
                } else {
                    submitButton.textContent = "Check";
                    submitButton.classList.add("btn-primary");
                    submitButton.classList.remove("btn-success");
                }
            })
            .catch(error => console.log('Error:', error));
        });
        
        submitButton.addEventListener('click', function() {
            // Only handle navigation when button is "Next"
            if (submitButton.textContent === "Next") {
                const nextId = submitButton.getAttribute("data-next-id");
                console.log("Next question ID:", nextId);
                if (nextId) {
                    // Always use the standard path - our backend will handle special cases
                    window.location.href = `/quiz/${nextId}`;
                }
            }
        });
    }
});