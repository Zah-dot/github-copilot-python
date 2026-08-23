# GitHub Copilot Instructions — Sudoku Flask Project

## Project Overview

This project is a Python Flask Sudoku game being refactored from legacy code into a modular, maintainable, and user-friendly application.

The application must provide a playable 9x9 Sudoku game with difficulty levels, unique puzzle solutions, real-time validation, hints, a timer, a persistent top-10 leaderboard, and light/dark themes.

## Development Standards

* Use clear, readable, maintainable Python code.
* Follow Python PEP 8 conventions.
* Use descriptive variable and function names.
* Prefer modular, reusable functions and components over large monolithic functions.
* Avoid unnecessary code duplication.
* Preserve existing functionality when refactoring unless a requirement explicitly changes it.
* Handle errors gracefully.
* Prefer simple, reliable solutions over unnecessary complexity.
* Add comments where they provide useful context.

## Sudoku Requirements

* Use a standard 9x9 Sudoku board.
* Every generated puzzle must have exactly one valid solution.
* Provide Easy, Medium, and Hard difficulty levels.
* Difficulty levels must change the number of prefilled cells.
* Prefilled cells must be locked and not editable.
* Validate player-entered values against Sudoku rules.
* Provide immediate visual feedback for invalid moves.
* Display a congratulatory message when the puzzle is solved correctly.

## Game Features

The application must include:

* Difficulty selector
* New Game functionality
* Timer
* Hint button
* Check button
* Top 10 leaderboard
* Player name entry
* Difficulty stored with leaderboard scores
* Number of hints used stored with leaderboard scores
* Persistent leaderboard using browser localStorage
* Light/dark mode toggle

### Hint

The Hint button must:

* Select an empty cell.
* Insert the correct solution value.
* Lock the inserted value.
* Increment the hint counter.

### Check

The Check button must:

* Check player-entered values against the solution.
* Highlight incorrect entries.
* Leave correct entries unchanged.
* Not incorrectly mark valid entries as wrong.

### Timer

* Start when a new puzzle begins.
* Track elapsed solving time.
* Stop when the puzzle is successfully completed.
* Record the completion time for the leaderboard.

## Frontend Requirements

* Use HTML, CSS, and JavaScript where appropriate.
* Make the interface responsive on desktop and mobile.
* Ensure controls and text remain readable in light and dark modes.
* Use alternating visual styling for the 3x3 Sudoku blocks.
* Avoid layout shifts when cell states change.
* Use semantic HTML and accessible controls where practical.
* Maintain sufficient contrast between text, backgrounds, borders, and states.

## Testing Requirements

* Establish a testing framework before major refactoring.
* Run the existing tests before modifying the legacy implementation.
* Run tests after every major refactor or feature.
* Add tests for important new functionality where practical.
* Never remove tests simply to make the test suite pass.
* Investigate the underlying cause when a test fails.

## GitHub Copilot Usage

When suggesting code:

1. Explain important architectural or logic decisions when they are not obvious.
2. Avoid broad destructive changes without considering existing functionality.
3. Prefer incremental changes that can be tested.
4. Clearly identify important assumptions.
5. If an implementation conflicts with a project requirement, explain the conflict before replacing it.
6. Prefer solutions that are understandable and maintainable for a student developer.

## Responsible AI Use

All Copilot-generated code must be reviewed before being accepted.

Check that generated code:

* Meets the project requirements.
* Is logically correct.
* Does not introduce unnecessary dependencies.
* Does not break existing functionality.
* Is understandable to the developer.
* Has appropriate error handling and testing.

Do not blindly accept Copilot suggestions. Modify or reject suggestions when necessary.

## Project Structure

Prefer separating responsibilities into logical modules such as:

* Flask application and routes
* Sudoku generation and solving
* Game validation
* Game state
* Leaderboard and browser storage
* Frontend JavaScript
* Styling
* Tests

Keep the architecture as simple as possible while maintaining good separation of responsibilities.

## Important Constraint

Before considering the project complete, verify every requirement against the project rubric.

The final application must run successfully, the test suite must pass, and all required screenshots documenting GitHub Copilot usage must be included in the `Screenshots` folder.
