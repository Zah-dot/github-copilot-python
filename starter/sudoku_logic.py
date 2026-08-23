import copy
import random

SIZE = 9
EMPTY = 0

DIFFICULTY_LEVELS = {
    'easy': {'label': 'Easy', 'clues': 45},
    'medium': {'label': 'Medium', 'clues': 36},
    'hard': {'label': 'Hard', 'clues': 27},
}


def deep_copy(board):
    return copy.deepcopy(board)


def create_empty_board():
    return [[EMPTY for _ in range(SIZE)] for _ in range(SIZE)]


def normalize_difficulty(difficulty=None, clues=None):
    if clues is not None:
        if isinstance(clues, str):
            normalized = clues.strip().lower()
            if normalized in DIFFICULTY_LEVELS:
                return normalize_difficulty(difficulty=normalized)
        clue_count = int(clues)
        if clue_count < 1 or clue_count > SIZE * SIZE:
            raise ValueError('Clue count must be between 1 and 81.')
        return clue_count

    if difficulty is None:
        difficulty = 'easy'

    if isinstance(difficulty, int):
        clue_count = difficulty
        if clue_count < 1 or clue_count > SIZE * SIZE:
            raise ValueError('Clue count must be between 1 and 81.')
        return clue_count

    key = str(difficulty).strip().lower()
    if key not in DIFFICULTY_LEVELS:
        valid_levels = ', '.join(DIFFICULTY_LEVELS)
        raise ValueError(f'Invalid difficulty: {difficulty}. Valid options are: {valid_levels}.')

    return DIFFICULTY_LEVELS[key]['clues']

def is_safe(board, row, col, num):
    # Check row and column
    for x in range(SIZE):
        if board[row][x] == num or board[x][col] == num:
            return False
    # Check 3x3 box
    start_row = row - row % 3
    start_col = col - col % 3
    for i in range(3):
        for j in range(3):
            if board[start_row + i][start_col + j] == num:
                return False
    return True

def find_empty_cell(board):
    for row in range(SIZE):
        for col in range(SIZE):
            if board[row][col] == EMPTY:
                return row, col
    return None


def count_solutions(board, limit=2):
    empty_cell = find_empty_cell(board)
    if empty_cell is None:
        return 1

    row, col = empty_cell
    solution_count = 0
    for candidate in range(1, SIZE + 1):
        if is_safe(board, row, col, candidate):
            board[row][col] = candidate
            solution_count += count_solutions(board, limit - solution_count)
            board[row][col] = EMPTY
            if solution_count >= limit:
                return solution_count
    return solution_count


def fill_board(board):
    for row in range(SIZE):
        for col in range(SIZE):
            if board[row][col] == EMPTY:
                possible = list(range(1, SIZE + 1))
                random.shuffle(possible)
                for candidate in possible:
                    if is_safe(board, row, col, candidate):
                        board[row][col] = candidate
                        if fill_board(board):
                            return True
                        board[row][col] = EMPTY
                return False
    return True


def remove_cells(board, clues):
    target_cells = SIZE * SIZE - clues
    if target_cells <= 0:
        return

    cells = [(row, col) for row in range(SIZE) for col in range(SIZE)]
    random.shuffle(cells)
    removed = 0

    for row, col in cells:
        if removed >= target_cells:
            break
        if board[row][col] == EMPTY:
            continue

        current_value = board[row][col]
        board[row][col] = EMPTY
        if count_solutions(board, 2) != 1:
            board[row][col] = current_value
        else:
            removed += 1
def generate_puzzle(clues=None, difficulty='easy'):
    target_clues = normalize_difficulty(difficulty=difficulty, clues=clues)
    board = create_empty_board()
    fill_board(board)
    solution = deep_copy(board)
    remove_cells(board, target_clues)
    puzzle = deep_copy(board)
    return puzzle, solution
