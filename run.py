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
        session['current_lesson_start_time'] = None
    
    return render_template('home.html')

# Learning route
@app.route('/learn/<int:lesson_id>')
def learn(lesson_id):
    data = load_data()
    
    # Track time spent on previous lesson
    if 'current_lesson_start_time' in session and session['current_lesson_start_time']:
        previous_lesson_id = session.get('current_lesson_id')
        if previous_lesson_id:
            start_time = datetime.strptime(session['current_lesson_start_time'], '%Y-%m-%d %H:%M:%S')
            end_time = datetime.now()
            time_spent = (end_time - start_time).total_seconds()
            
            # Store time spent in learning_progress
            if 'learning_progress' in session:
                if str(previous_lesson_id) in session['learning_progress']:
                    session['learning_progress'][str(previous_lesson_id)]['time_spent'] = time_spent
                else:
                    session['learning_progress'][str(previous_lesson_id)] = {
                        'visited': True,
                        'time': session['current_lesson_start_time'],
                        'time_spent': time_spent
                    }
                session.modified = True
    
    # Set current lesson start time
    session['current_lesson_start_time'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    session['current_lesson_id'] = lesson_id

    # Track user's progress
    if 'learning_progress' in session:
        session['learning_progress'][str(lesson_id)] = {
            'visited': True,
            'time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        session.modified = True

    # Validate lesson_id
    if lesson_id < 1 or lesson_id > len(data['lessons']) + 1:  # +1 for practice page
        return redirect(url_for('learn', lesson_id=1))
    
    # Special case for the review page
    if lesson_id == 8:  # Assuming the review page is after the 7 tools (at position 8)
        lesson = data['lessons'][7]  # Use the "Putting It All Together" lesson data
        total_lessons = len(data['lessons']) + 1  # +1 for the practice page
        next_lesson = 9  # The practice page
        
        return render_template('learn_review.html',
                           lesson=lesson,
                           lesson_id=lesson_id,
                           next_lesson=next_lesson,
                           total_lessons=total_lessons,
                           lessons=data['lessons'])
    
    # Special case for the practice page
    elif lesson_id == 9:  # Practice page
        lesson = data['lessons'][7]  # Use the "Putting It All Together" lesson data
        total_lessons = len(data['lessons']) + 1  # +1 for the practice page
        
        return render_template('learn_practice.html',
                           lesson=lesson,
                           lesson_id=lesson_id,
                           total_lessons=total_lessons,
                           lessons=data['lessons'])
    
    # Regular lesson pages
    else:
        if lesson_id == 8:  # Original "Putting It All Together" - redirect to new review page
            return redirect(url_for('learn', lesson_id=8))
            
        lesson = data['lessons'][lesson_id - 1]
        total_lessons = len(data['lessons']) + 1  # +1 for practice page
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
    total_questions = len(quiz_content)
    
    # Track time spent on previous quiz question
    if 'current_question_start_time' in session and session['current_question_start_time']:
        previous_question_id = session.get('current_question_id')
        if previous_question_id:
            start_time = datetime.strptime(session['current_question_start_time'], '%Y-%m-%d %H:%M:%S')
            end_time = datetime.now()
            time_spent = (end_time - start_time).total_seconds()
            
            # Store time spent
            if 'quiz_time_spent' not in session:
                session['quiz_time_spent'] = {}
            session['quiz_time_spent'][str(previous_question_id)] = time_spent
            session.modified = True
    
    # Set current question start time
    session['current_question_start_time'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    session['current_question_id'] = question_id
    
    # Ensure question_id is valid
    if question_id < 1 or question_id > total_questions:
        return redirect(url_for('quiz', question_id=1))
    
    # Special case for the practical question (assuming it's question 4)
    if question_id == 4:  # Practical question
        return render_template('practical_quiz.html', question_id=question_id, total_questions=total_questions)
    
    # Regular quiz questions
    question = next((q for q in quiz_content if q['id'] == question_id), None)
    if not question:
        return redirect(url_for('quiz', question_id=1))
    
    # Determine if it is the last question of the multiple choice section
    is_last = question_id == 3  # Your last MC question
    next_id = question_id + 1
    
    # Handle POST request
    if request.method == 'POST':
        selected_answer = request.form.get('answer')
        is_correct = selected_answer == question['correct_answer']
        
        # Store the answer
        if 'quiz_answers' not in session:
            session['quiz_answers'] = {}
        session['quiz_answers'][str(question_id)] = is_correct
        session.modified = True
        
        if is_correct:
            feedback_message = "Correct! " + question['explanation']
            feedback_class = "feedback correct"
        else:
            feedback_message = "Incorrect. Try again."
            feedback_class = "feedback incorrect"
        
        # AJAX response
        return jsonify({
            'feedback': feedback_message,
            'feedback_class': feedback_class,
            'next_id': next_id,
            'is_last': is_last
        })
    
    # Render quiz template
    return render_template('quiz.html',
                        question=question,
                        question_id=question_id,
                        next_id=next_id,
                        is_last=is_last,
                        total_questions=total_questions)

# Add route for practical quiz submission
@app.route('/quiz/practical/submit', methods=['POST'])
def submit_practical():
    data = request.json
    user_values = data.get('values', {})
    
    # Get target values from quiz_content
    quiz_content = load_quiz_content()
    question = next((q for q in quiz_content if q['id'] == 4), None)
    
    if not question:
        return jsonify({'success': False, 'message': 'Question not found'})
    
    target_values = question.get('target_values', {})
    tolerance = question.get('tolerance', 15)
    
    # Evaluate the user's edit
    score = 0
    total_params = len(target_values)
    
    for param, target in target_values.items():
        user_value = user_values.get(param, 0)
        difference = abs(user_value - target)
        
        # Mark as correct if within tolerance
        if difference <= tolerance:
            score += 1
            
    # Store the result in session
    if 'quiz_answers' not in session:
        session['quiz_answers'] = {}
    
    is_correct = score / total_params >= 0.7  # At least 70% accuracy required
    session['quiz_answers']['4'] = is_correct
    session.modified = True
    
    return jsonify({
        'success': True,
        'is_correct': is_correct,
        'score': score,
        'total': total_params
    })

# Add route for quiz results
@app.route('/quiz/result')
def quiz_result():
    # Calculate score
    quiz_answers = session.get('quiz_answers', {})
    correct = sum(1 for answer in quiz_answers.values() if answer)
    total = len(load_quiz_content())
    score = int((correct / total) * 100) if total > 0 else 0
    
    # Calculate time spent
    quiz_time_spent = session.get('quiz_time_spent', {})
    total_time = sum(quiz_time_spent.values())
    
    # Reset quiz progress
    session['current_question_start_time'] = None
    session['current_question_id'] = None
    
    return render_template('quiz_result.html',
                          score=score,
                          correct=correct,
                          total=total,
                          time_spent=total_time)

if __name__ == '__main__':
    app.run(debug=True)