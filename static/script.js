document.addEventListener('DOMContentLoaded', function() {
    const guessInput = document.getElementById('guess-input');
    const guessBtn = document.getElementById('guess-btn');
    const resetBtn = document.getElementById('reset-btn');
    const messageDiv = document.getElementById('message');
    const hintDiv = document.getElementById('hint');
    const attemptsSpan = document.getElementById('attempts');
    const rangeDisplay = document.getElementById('range-display');
    const historyList = document.getElementById('history-list');

    let gameOver = false;
    let maxAttempts = parseInt(attemptsSpan.textContent.split('/')[1]) || 10;

    // Focus input on load
    guessInput.focus();

    // Handle guess
    guessBtn.addEventListener('click', handleGuess);
    guessInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleGuess();
        }
    });

    // Handle reset
    resetBtn.addEventListener('click', resetGame);

    function handleGuess() {
        if (gameOver) {
            showMessage('Game is over! Click "New Game" to play again.', 'game-over');
            return;
        }

        const guess = guessInput.value.trim();
        if (!guess) {
            showMessage('Please enter a number!', 'error');
            guessInput.focus();
            return;
        }

        const guessNum = parseInt(guess);
        if (isNaN(guessNum)) {
            showMessage('Please enter a valid number!', 'error');
            guessInput.value = '';
            guessInput.focus();
            return;
        }

        // Send guess to server
        fetch('/guess', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `guess=${guessNum}`
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                showMessage(data.message, 'error');
                guessInput.value = '';
                guessInput.focus();
                return;
            }

            // Update UI
            updateUI(data);
            
            if (data.game_over) {
                gameOver = true;
                guessInput.disabled = true;
                guessBtn.disabled = true;
                if (data.won) {
                    showMessage(data.message, 'success');
                } else {
                    showMessage(data.message, 'game-over');
                }
                // Show the secret number
                if (data.secret) {
                    hintDiv.textContent = `🔢 The number was ${data.secret}`;
                }
            } else {
                showMessage(data.message, 'info');
                hintDiv.textContent = data.hint || '';
                guessInput.value = '';
                guessInput.focus();
            }

            // Update history
            if (data.history) {
                updateHistory(data.history);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showMessage('An error occurred. Please try again.', 'error');
        });
    }

    function resetGame() {
        fetch('/reset', {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                gameOver = false;
                guessInput.disabled = false;
                guessBtn.disabled = false;
                guessInput.value = '';
                guessInput.focus();
                
                // Reset UI
                showMessage('🎮 New game started! Guess the number.', 'info');
                hintDiv.textContent = '';
                attemptsSpan.textContent = `0 / ${data.max_attempts || maxAttempts}`;
                rangeDisplay.textContent = `${data.min_range} - ${data.max_range}`;
                historyList.innerHTML = '<p class="empty-history">No guesses yet. Start playing!</p>';
                
                // Update max attempts from response
                if (data.max_attempts) {
                    maxAttempts = data.max_attempts;
                }
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showMessage('Error resetting game. Please refresh the page.', 'error');
        });
    }

    function updateUI(data) {
        // Update attempts
        attemptsSpan.textContent = `${data.attempts || 0} / ${maxAttempts}`;
        
        // Update range
        if (data.min_range && data.max_range) {
            rangeDisplay.textContent = `${data.min_range} - ${data.max_range}`;
        }
        
        // Update hint
        if (data.hint) {
            hintDiv.textContent = data.hint;
        }
    }

    function updateHistory(history) {
        if (!history || history.length === 0) {
            historyList.innerHTML = '<p class="empty-history">No guesses yet. Start playing!</p>';
            return;
        }

        let html = '';
        history.forEach(item => {
            let resultText = '';
            let resultClass = '';
            
            if (item.result === 'low') {
                resultText = '⬆️ Too Low';
                resultClass = 'low';
            } else if (item.result === 'high') {
                resultText = '⬇️ Too High';
                resultClass = 'high';
            } else if (item.result === 'correct') {
                resultText = '🎯 Correct!';
                resultClass = 'correct';
            }
            
            html += `
                <div class="history-item ${resultClass}">
                    <span class="guess-number">#${item.attempt}: ${item.guess}</span>
                    <span class="guess-result">${resultText}</span>
                </div>
            `;
        });
        
        historyList.innerHTML = html;
        // Scroll to bottom
        historyList.scrollTop = historyList.scrollHeight;
    }

    function showMessage(text, type = 'info') {
        messageDiv.textContent = text;
        messageDiv.className = 'message ' + type;
    }

    // Initial message
    showMessage('🎯 Guess a number between 1 and 100!', 'info');
});
