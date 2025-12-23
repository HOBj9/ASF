# Contributing to the Template

Thank you for your interest in contributing to this template! This document provides guidelines for contributing.

## How to Contribute

### Reporting Issues

If you find a bug or have a suggestion:
1. Check if the issue already exists
2. Create a new issue with:
   - Clear title and description
   - Steps to reproduce (for bugs)
   - Expected vs actual behavior
   - Environment details (OS, Node version, etc.)

### Suggesting Improvements

For feature requests or improvements:
1. Check if it's already been suggested
2. Create an issue describing:
   - The feature/improvement
   - Use case
   - Potential implementation approach

### Pull Requests

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes**:
   - Follow the existing code style
   - Add comments for complex logic
   - Update documentation if needed
   - Test your changes
4. **Commit your changes**: Use clear, descriptive commit messages
5. **Push to your fork**: `git push origin feature/your-feature-name`
6. **Create a Pull Request**: Provide a clear description of your changes

## Code Style

- Use TypeScript for all new code
- Follow the existing folder structure
- Use meaningful variable and function names
- Add JSDoc comments for public functions
- Keep functions focused and small
- Use async/await instead of promises where possible

## Testing

Before submitting:
- Test all functionality
- Check for TypeScript errors
- Verify the build succeeds: `npm run build`
- Test in both development and production modes

## Documentation

When adding features:
- Update relevant documentation
- Add examples if applicable
- Update the TEMPLATE.md if it affects customization

## Questions?

Feel free to open an issue for questions or discussions.

Thank you for contributing! 🎉

