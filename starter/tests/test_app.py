import sys
import time
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import app


def test_index_route_renders_main_page():
    client = app.app.test_client()

    response = client.get('/')

    assert response.status_code == 200
    assert b'<title>Sudoku Game</title>' in response.data
    assert b'id="sudoku-board"' in response.data
    assert b'id="theme-toggle"' in response.data
    assert b'sudoku-theme' in response.data


def test_new_game_route_returns_9x9_puzzle_json():
    client = app.app.test_client()
    app.CURRENT['puzzle'] = None
    app.CURRENT['solution'] = None

    response = client.get('/new')
    data = response.get_json()

    assert response.status_code == 200
    assert 'puzzle' in data
    assert len(data['puzzle']) == app.sudoku_logic.SIZE
    assert all(len(row) == app.sudoku_logic.SIZE for row in data['puzzle'])
    assert app.CURRENT['solution'] is not None


def test_new_game_route_accepts_all_difficulty_levels():
    client = app.app.test_client()
    for difficulty in ['easy', 'medium', 'hard']:
        response = client.get(f'/new?difficulty={difficulty}')
        data = response.get_json()

        assert response.status_code == 200, data
        assert 'puzzle' in data
        assert data['difficulty'] == difficulty
        assert len(data['puzzle']) == app.sudoku_logic.SIZE


def test_new_game_route_rejects_invalid_difficulty():
    client = app.app.test_client()
    response = client.get('/new?difficulty=legendary')
    data = response.get_json()

    assert response.status_code == 400
    assert 'Invalid difficulty' in data['error']


def test_check_route_without_active_game_returns_error():
    client = app.app.test_client()
    app.CURRENT['puzzle'] = None
    app.CURRENT['solution'] = None

    response = client.post('/check', json={'board': [[0 for _ in range(9)] for _ in range(9)]})
    data = response.get_json()

    assert response.status_code == 400
    assert data['error'] == 'No game in progress'


def test_check_route_accepts_correct_solution():
    client = app.app.test_client()
    client.get('/new')
    solution = deepcopy(app.CURRENT['solution'])

    response = client.post('/check', json={'board': solution})
    data = response.get_json()

    assert response.status_code == 200
    assert data['incorrect'] == []
    assert data['completed'] is True
    assert app.CURRENT['completed'] is True


def test_check_route_reports_incorrect_cells():
    client = app.app.test_client()
    client.get('/new')
    solution = deepcopy(app.CURRENT['solution'])
    incorrect_board = deepcopy(solution)

    wrong_row = 0
    wrong_col = 0
    wrong_value = 9 if solution[wrong_row][wrong_col] != 9 else 8
    incorrect_board[wrong_row][wrong_col] = wrong_value

    response = client.post('/check', json={'board': incorrect_board})
    data = response.get_json()

    assert response.status_code == 200
    assert [wrong_row, wrong_col] in data['incorrect']


def test_generate_puzzle_and_check_route_are_consistent():
    client = app.app.test_client()
    response = client.get('/new')
    puzzle = response.get_json()['puzzle']
    solution = app.CURRENT['solution']

    assert response.status_code == 200
    assert len(puzzle) == 9
    assert len(solution) == 9
    assert all(cell in range(0, 10) for row in puzzle for cell in row)
    assert all(cell in range(1, 10) for row in solution for cell in row)


def test_hint_route_without_active_game_returns_error():
    client = app.app.test_client()
    app.CURRENT['puzzle'] = None
    app.CURRENT['solution'] = None

    response = client.post('/hint', json={'board': [[0 for _ in range(9)] for _ in range(9)]})
    data = response.get_json()

    assert response.status_code == 400
    assert data['error'] == 'No game in progress'


def test_hint_route_provides_hint_and_increments_count():
    client = app.app.test_client()
    # start a new game
    response = client.get('/new')
    data = response.get_json()
    puzzle = deepcopy(data['puzzle'])
    solution = deepcopy(app.CURRENT['solution'])

    # prepare player's board equal to the starting puzzle (no player entries)
    board = deepcopy(puzzle)

    # ensure puzzle has at least one empty cell
    assert any(cell == 0 for row in puzzle for cell in row)

    response = client.post('/hint', json={'board': board})
    hint_data = response.get_json()

    assert response.status_code == 200
    assert 'cell' in hint_data and 'value' in hint_data
    row, col = hint_data['cell']
    value = hint_data['value']

    # hinted cell must have been empty in the original puzzle
    assert puzzle[row][col] == 0
    # hinted value matches solution
    assert value == solution[row][col]
    # server stored the hint and incremented counter
    assert app.CURRENT['puzzle'][row][col] == value
    assert app.CURRENT['hints_used'] == 1


def test_new_game_resets_hints_count():
    client = app.app.test_client()
    client.get('/new')
    # use a hint
    board = deepcopy(app.CURRENT['puzzle'])
    client.post('/hint', json={'board': board})
    assert app.CURRENT['hints_used'] == 1
    # new game resets hints
    client.get('/new')
    assert app.CURRENT['hints_used'] == 0


def test_new_game_starts_timer_state():
    client = app.app.test_client()
    before = time.time()
    client.get('/new')

    assert app.CURRENT['timer_started_at'] is not None
    assert app.CURRENT['timer_started_at'] >= before
    assert app.CURRENT['timer_completed_at'] is None
    assert app.CURRENT['timer_elapsed_seconds'] == 0
    assert app.CURRENT['completed'] is False


def test_new_game_resets_completion_status():
    client = app.app.test_client()
    client.get('/new')
    solution = deepcopy(app.CURRENT['solution'])
    client.post('/check', json={'board': solution})

    assert app.CURRENT['completed'] is True

    client.get('/new')

    assert app.CURRENT['completed'] is False


def test_check_route_stops_timer_when_solution_is_correct():
    client = app.app.test_client()
    client.get('/new')
    app.CURRENT['timer_started_at'] = time.time() - 12
    solution = deepcopy(app.CURRENT['solution'])

    response = client.post('/check', json={'board': solution})
    data = response.get_json()

    assert response.status_code == 200
    assert data['solved'] is True
    assert data['elapsed_seconds'] >= 12
    assert app.CURRENT['timer_completed_at'] is not None
    assert app.CURRENT['timer_elapsed_seconds'] >= 12
