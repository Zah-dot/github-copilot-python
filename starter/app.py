import time

from flask import Flask, render_template, jsonify, request
import sudoku_logic
import random

app = Flask(__name__)

# Keep a simple in-memory store for current puzzle and solution
CURRENT = {
    'puzzle': None,
    'solution': None,
    'difficulty': None,
    'hints_used': 0,
    'timer_started_at': None,
    'timer_completed_at': None,
    'timer_elapsed_seconds': 0,
    'completed': False,
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/new')
def new_game():
    difficulty = request.args.get('difficulty', 'easy')
    clues = request.args.get('clues')

    try:
        if clues is not None:
            puzzle, solution = sudoku_logic.generate_puzzle(clues=clues, difficulty=difficulty)
        else:
            puzzle, solution = sudoku_logic.generate_puzzle(difficulty=difficulty)
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400

    CURRENT['puzzle'] = puzzle
    CURRENT['solution'] = solution
    CURRENT['difficulty'] = difficulty
    CURRENT['hints_used'] = 0
    CURRENT['timer_started_at'] = time.time()
    CURRENT['timer_completed_at'] = None
    CURRENT['timer_elapsed_seconds'] = 0
    CURRENT['completed'] = False
    return jsonify({
        'puzzle': puzzle,
        'difficulty': difficulty,
        'timer_started_at': CURRENT['timer_started_at'],
        'timer_elapsed_seconds': CURRENT['timer_elapsed_seconds'],
        'completed': CURRENT['completed'],
    })

@app.route('/check', methods=['POST'])
def check_solution():
    data = request.json
    board = data.get('board')
    solution = CURRENT.get('solution')
    if solution is None:
        return jsonify({'error': 'No game in progress'}), 400
    CURRENT['completed'] = False
    incorrect = []
    for i in range(sudoku_logic.SIZE):
        for j in range(sudoku_logic.SIZE):
            if board[i][j] != solution[i][j]:
                incorrect.append([i, j])

    solved = not incorrect
    if solved:
        CURRENT['completed'] = True
        CURRENT['timer_completed_at'] = time.time()
        if CURRENT['timer_started_at'] is not None:
            CURRENT['timer_elapsed_seconds'] = max(0, int(CURRENT['timer_completed_at'] - CURRENT['timer_started_at']))
        else:
            CURRENT['timer_elapsed_seconds'] = 0
        return jsonify({
            'incorrect': [],
            'solved': True,
            'completed': True,
            'elapsed_seconds': CURRENT['timer_elapsed_seconds'],
            'timer_completed_at': CURRENT['timer_completed_at'],
        })

    CURRENT['timer_completed_at'] = None
    if CURRENT['timer_started_at'] is not None:
        CURRENT['timer_elapsed_seconds'] = max(0, int(time.time() - CURRENT['timer_started_at']))
    else:
        CURRENT['timer_elapsed_seconds'] = 0
    return jsonify({
        'incorrect': incorrect,
        'solved': False,
        'completed': False,
        'elapsed_seconds': CURRENT['timer_elapsed_seconds'],
    })


@app.route('/hint', methods=['POST'])
def provide_hint():
    """Provide a single hint: fill exactly one currently empty cell with the correct value.

    Expects JSON: { 'board': <9x9 int grid> }
    Returns JSON: { 'cell': [row, col], 'value': n, 'hints_used': k }
    """
    data = request.json
    board = data.get('board')
    solution = CURRENT.get('solution')
    puzzle = CURRENT.get('puzzle')
    if solution is None or puzzle is None:
        return jsonify({'error': 'No game in progress'}), 400

    # Find candidate cells that are empty on the player's board and not prefilled in the original puzzle
    candidates = []
    for i in range(sudoku_logic.SIZE):
        for j in range(sudoku_logic.SIZE):
            # Do not overwrite prefilled cells from the original puzzle
            if puzzle[i][j] != 0:
                continue
            # Do not overwrite player's existing entries
            if board[i][j] != 0:
                continue
            candidates.append((i, j))

    if not candidates:
        return jsonify({'error': 'No available cells to hint'}), 400

    # Choose one candidate (random to avoid bias)
    row, col = random.choice(candidates)
    value = solution[row][col]

    # Update the in-memory puzzle to lock the hinted value
    CURRENT['puzzle'][row][col] = value
    CURRENT['hints_used'] = CURRENT.get('hints_used', 0) + 1

    return jsonify({'cell': [row, col], 'value': value, 'hints_used': CURRENT['hints_used']})

if __name__ == '__main__':
    app.run(debug=True)