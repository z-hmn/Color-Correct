document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('quiz-form');
    const feedbackContainer = document.getElementById('feedback');
    const submitButton = document.getElementById('submit-btn');
    
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(form);
            const questionId = form.getAttribute('data-question-id');
            
            fetch(`/quiz/${questionId}`, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                console.log("Received response:", data); // Debugging output
                
                feedbackContainer.innerHTML = `<div class="${data.feedback_class}">${data.feedback}</div>`;
                
                if (data.feedback_class === "feedback correct") {
                    submitButton.textContent = data.is_last ? "Next" : "Next";
                    submitButton.classList.add("btn-success");
                    submitButton.classList.remove("btn-primary");
                    submitButton.setAttribute("data-next-id", data.next_id);
                    
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
        
        // Pre-select if user has previously chosen an answer
        // This could be implemented if you're storing previous answers in session
        // and passing them to the template
    }
});