from flask import Flask, render_template, request, jsonify, session
import random
import os

app = Flask(__name__)
app.secret_key = os.urandom(24)  # Secure secret key for sessions

# Game settings
MIN_NUMBER = 1
MAX_NUMBER = 100
MAX_ATTEMPTS = 10

@app.route('/')
def index():
    """Render the main game page."""
    # Initialize or reset game state
    session['secret_number'] = random.randint(MIN_NUMBER, MAX_NUMBER)
    session['attempts'] = 0
    session['game_over'] = False
    session['max_attempts'] = MAX_ATTEMPTS
    session['min_range'] = MIN_NUMBER
    session['max_range'] = MAX_NUMBER
    session['history'] = []
    return render_template('index.html', 
                         min_num=MIN_NUMBER, 
                         max_num=MAX_NUMBER,
                         max_attempts=MAX_ATTEMPTS)

@app.route('/guess', methods=['POST'])
def guess():
    """Handle the user's guess."""
    if session.get('game_over', False):
        return jsonify({
            'success': False,
            'message': 'Game is over! Please start a new game.',
            'game_over': True
        })
    
    try:
        guess = int(request.form.get('guess', ''))
    except ValueError:
        return jsonify({
            'success': False,
            'message': 'Please enter a valid number.'
        })
    
    secret = session['secret_number']
    attempts = session.get('attempts', 0) + 1
    session['attempts'] = attempts
    
    # Get current range
    min_range = session.get('min_range', MIN_NUMBER)
    max_range = session.get('max_range', MAX_NUMBER)
    
    # Check the guess
    if guess < MIN_NUMBER or guess > MAX_NUMBER:
        return jsonify({
            'success': False,
            'message': f'Please enter a number between {MIN_NUMBER} and {MAX_NUMBER}.'
        })
    
    # Determine result
    if guess < secret:
        message = f'Too low! Try a higher number.'
        min_range = max(min_range, guess + 1)
        hint = '⬆️ Go higher!'
    elif guess > secret:
        message = f'Too high! Try a lower number.'
        max_range = min(max_range, guess - 1)
        hint = '⬇️ Go lower!'
    else:
        message = f'🎉 Congratulations! You guessed it in {attempts} attempts!'
        session['game_over'] = True
        hint = '🎯 Perfect!'
        
        # Save history
        history = session.get('history', [])
        history.append({
            'guess': guess,
            'result': 'correct',
            'attempt': attempts
        })
        session['history'] = history
        
        return jsonify({
            'success': True,
            'message': message,
            'game_over': True,
            'won': True,
            'attempts': attempts,
            'hint': hint,
            'secret': secret,
            'history': session['history']
        })
    
    # Update range
    session['min_range'] = min_range
    session['max_range'] = max_range
    
    # Save history
    history = session.get('history', [])
    history.append({
        'guess': guess,
        'result': 'low' if guess < secret else 'high',
        'attempt': attempts
    })
    session['history'] = history
    
    # Check if max attempts reached
    if attempts >= MAX_ATTEMPTS:
        session['game_over'] = True
        return jsonify({
            'success': True,
            'message': f'💔 Game Over! You\'ve used all {MAX_ATTEMPTS} attempts. The number was {secret}.',
            'game_over': True,
            'won': False,
            'attempts': attempts,
            'hint': hint,
            'secret': secret,
            'history': session['history'],
            'min_range': min_range,
            'max_range': max_range
        })
    
    return jsonify({
        'success': True,
        'message': message,
        'game_over': False,
        'attempts': attempts,
        'hint': hint,
        'min_range': min_range,
        'max_range': max_range,
        'history': session['history']
    })

@app.route('/reset', methods=['POST'])
def reset():
    """Reset the game."""
    session['secret_number'] = random.randint(MIN_NUMBER, MAX_NUMBER)
    session['attempts'] = 0
    session['game_over'] = False
    session['min_range'] = MIN_NUMBER
    session['max_range'] = MAX_NUMBER
    session['history'] = []
    return jsonify({
        'success': True,
        'message': 'Game reset! New number generated.',
        'min_range': MIN_NUMBER,
        'max_range': MAX_NUMBER,
        'max_attempts': MAX_ATTEMPTS
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
