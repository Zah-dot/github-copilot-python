import sys
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import sudoku_logic


def test_create_empty_board_returns_9x9_zero_grid():
    board = sudoku_logic.create_empty_board()

    assert len(board) == sudoku_logic.SIZE
    assert all(len(row) == sudoku_logic.SIZE for row in board)
    assert all(cell == sudoku_logic.EMPTY for row in board for cell in row)


def test_is_safe_rejects_duplicates_in_row_column_and_box():
    board = sudoku_logic.create_empty_board()
    board[0][0] = 5
    assert sudoku_logic.is_safe(board, 0, 1, 5) is False

    board = sudoku_logic.create_empty_board()
    board[0][0] = 5
    assert sudoku_logic.is_safe(board, 1, 0, 5) is False

    board = sudoku_logic.create_empty_board()
    board[0][0] = 1
    assert sudoku_logic.is_safe(board, 1, 1, 1) is False


def test_fill_board_produces_valid_complete_solution():
    board = sudoku_logic.create_empty_board()
    solved = sudoku_logic.fill_board(board)

    assert solved is True
    assert all(cell != sudoku_logic.EMPTY for row in board for cell in row)

    for row in board:
        assert sorted(row) == list(range(1, sudoku_logic.SIZE + 1))

    for col in range(sudoku_logic.SIZE):
        column_values = [board[row][col] for row in range(sudoku_logic.SIZE)]
        assert sorted(column_values) == list(range(1, sudoku_logic.SIZE + 1))

    for start_row in range(0, sudoku_logic.SIZE, 3):
        for start_col in range(0, sudoku_logic.SIZE, 3):
            box_values = [
                board[row][col]
                for row in range(start_row, start_row + 3)
                for col in range(start_col, start_col + 3)
            ]
            assert sorted(box_values) == list(range(1, sudoku_logic.SIZE + 1))


def test_generate_puzzle_returns_valid_puzzle_and_solution():
    puzzle, solution = sudoku_logic.generate_puzzle(clues=35)

    assert len(puzzle) == sudoku_logic.SIZE
    assert len(solution) == sudoku_logic.SIZE
    assert all(len(row) == sudoku_logic.SIZE for row in puzzle)
    assert all(len(row) == sudoku_logic.SIZE for row in solution)
    assert any(cell == sudoku_logic.EMPTY for row in puzzle for cell in row)
    assert all(cell != sudoku_logic.EMPTY for row in solution for cell in row)
    assert puzzle != solution


def test_generate_puzzle_has_exactly_one_valid_solution():
    for _ in range(5):
        puzzle, _ = sudoku_logic.generate_puzzle(clues=35)
        assert sudoku_logic.count_solutions(deepcopy(puzzle), 2) == 1
