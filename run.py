from flask import Flask, render_template, request, session, redirect, url_for, jsonify
import json
import os
from datetime import datetime
import uuid

app = Flask(__name__)
app.secret_key = 'your_secret_key'  # Change this in production

# Load data from JSON file
def load_data():
    with open('data.json', 'r') as file:
        return json.load(file)

# Load quiz content
def load_quiz_content():
    try:
        with open('quiz_content.json', 'r') as file:
            return json.load(file)
    except Exception as e:
        print(f"Error loading quiz content: {e}")
        return []

# Home page route
@app.route('/')
def home():
    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())
        session['start_time'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        session['learning_progress'] = {}
        session['quiz_answers'] = {}
    
    return render_template('home.html')

# Learning route
@app.route('/learn/<int:lesson_id>')
def learn(lesson_id):
    data = load_data()

    # Track user's progress
    if 'learning_progress' in session:
        session['learning_progress'][str(lesson_id)] = {
            'visited': True,
            'time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        session.modified = True

    # Validate lesson_id
    if lesson_id < 1 or lesson_id > len(data['lessons']):
        return redirect(url_for('learn', lesson_id=1))

    lesson = data['lessons'][lesson_id - 1]
    total_lessons = len(data['lessons'])
    next_lesson = lesson_id + 1 if lesson_id < total_lessons else None

    return render_template('learn.html',
                           lesson=lesson,
                           lesson_id=lesson_id,
                           next_lesson=next_lesson,
                           total_lessons=total_lessons,
                           lessons=data['lessons'])

# Integrated approach - Modify your existing quiz route to handle both regular and practical questions

@app.route('/quiz/<int:question_id>', methods=['GET', 'POST'])
def quiz(question_id):
    quiz_content = load_quiz_content()
    
    print(f"Quiz route accessed with question_id: {question_id}")
    
    # Special case for the practical question (assuming it's question 4)
    if question_id == 4:  # Practical question
        print("Rendering practical quiz template")
        return render_template('practical_quiz.html')
    
    # Regular quiz questions
    question = next((q for q in quiz_content if q['id'] == question_id), None)
    if not question:
        print(f"Invalid question ID: {question_id}")
        return redirect(url_for('quiz', question_id=1))
    
    # Determine if it is the last question of the multiple choice section
    is_last = question_id == 3  # Your last MC question
    next_id = question_id + 1
    
    # Handle POST request
    if request.method == 'POST':
        selected_answer = request.form.get('answer')
        print(f"Selected Answer: {selected_answer}")
        print(f"Correct Answer: {question['correct_answer']}")
        
        if selected_answer == question['correct_answer']:
            session['quiz_answers'][str(question_id)] = True
            feedback_message = "Correct! " + question['explanation']
            feedback_class = "feedback correct"
        else:
            feedback_message = "Incorrect. Try again."
            feedback_class = "feedback incorrect"
        
        # Log the response data
        response_data = {
            'feedback': feedback_message,
            'feedback_class': feedback_class,
            'next_id': next_id,
            'is_last': is_last
        }
        print(f"Response Data: {response_data}")
        
        # AJAX response
        return jsonify(response_data)
    
    # Render quiz template
    return render_template('quiz.html',
                        question=question,
                        question_id=question_id,
                        next_id=next_id,
                        is_last=is_last)

if __name__ == '__main__':
    app.run(debug=True)
