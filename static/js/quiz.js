/*
 * Multiple-choice quiz interaction with attempt tracking.
 */
(function () {
    'use strict';

    function init() {
        const form = document.getElementById('quiz-form');
        if (!form) return;

        const feedbackContainer = document.getElementById('feedback');
        const submitButton = document.getElementById('submit-btn');

        let attempts = 0;
        let answeredCorrectly = false;

        function goToNext() {
            const nextId = submitButton.getAttribute('data-next-id');
            if (nextId) {
                window.location.href = `/quiz/${nextId}`;
            }
        }

        // The button is type="submit", so the submit event is the single entry
        // point for both checking an answer and advancing to the next question.
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            if (answeredCorrectly) {
                goToNext();
                return;
            }

            const selected = form.querySelector('input[name="answer"]:checked');
            if (!selected) {
                feedbackContainer.innerHTML =
                    '<div class="feedback incorrect">Please choose an answer first.</div>';
                return;
            }

            attempts++;

            const questionId = form.getAttribute('data-question-id');

            // Track this attempt in localStorage as a backup
            const localAttempts = JSON.parse(localStorage.getItem('quizAttempts') || '{}');
            localAttempts[questionId] = attempts;
            localStorage.setItem('quizAttempts', JSON.stringify(localAttempts));

            fetch(`/quiz/${questionId}`, {
                method: 'POST',
                body: new FormData(form)
            })
                .then(response => response.json())
                .then(data => {
                    feedbackContainer.innerHTML =
                        `<div class="${data.feedback_class}">${data.feedback}</div>`;

                    if (data.feedback_class === 'feedback correct') {
                        answeredCorrectly = true;

                        submitButton.textContent = 'Next';
                        submitButton.classList.add('btn-success');
                        submitButton.classList.remove('btn-primary');
                        submitButton.setAttribute('data-next-id', data.next_id);

                        if (data.attempts) {
                            attempts = data.attempts;
                        }

                        // Lock the options once the answer is correct
                        form.querySelectorAll('input[type="radio"]').forEach(input => {
                            input.disabled = true;
                        });
                    } else {
                        submitButton.textContent = 'Check';
                        submitButton.classList.add('btn-primary');
                        submitButton.classList.remove('btn-success');
                    }
                })
                .catch(error => console.error('Error:', error));
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
