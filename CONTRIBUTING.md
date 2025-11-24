# Contributing Guidelines

Thank you for your interest in contributing to the Order Execution Engine!

## Development Setup

1. Fork the repository
2. Clone your fork: `git clone <your-fork-url>`
3. Install dependencies: `npm install`
4. Set up your `.env` file (copy from `env.example`)
5. Create a feature branch: `git checkout -b feature/your-feature-name`

## Code Style

- Follow TypeScript best practices
- Use ESLint and Prettier (configured in the project)
- Write meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

## Testing

- Write tests for new features
- Ensure all tests pass: `npm test`
- Aim for high test coverage
- Test edge cases and error scenarios

## Commit Messages

Use clear, descriptive commit messages:
- `feat: Add order cancellation endpoint`
- `fix: Resolve order matching price calculation`
- `docs: Update API documentation`
- `test: Add tests for matching engine`

## Pull Request Process

1. Ensure your code passes all tests
2. Update documentation if needed
3. Write a clear PR description
4. Reference any related issues
5. Request review from maintainers

## Code Review

- Be open to feedback
- Address review comments promptly
- Keep PRs focused and small when possible
- Respond to comments professionally

## Questions?

Open an issue for questions or discussions about the codebase.

