# Contributing

Thank you for interest in contributing to this pi extension starter!

## Development Setup

1. Clone the repo:
```bash
git clone <repo-url>
cd pi-ext-starter
```

2. Install dependencies:
```bash
npm install
```

3. Test locally:
```bash
pi -e ./src/index.ts
```

## Adding Examples

To add new examples:

1. Create a new file in `examples/` directory
2. Follow the naming pattern: `examples/<feature>.ts`
3. Include comprehensive comments explaining the example
4. Test the example locally before submitting

## Documentation

When adding new features or examples:

1. Update relevant `.md` files in `docs/`
2. Add code comments explaining key concepts
3. Include usage examples

## Code Style

- Use TypeScript for type safety
- Follow existing code patterns
- Add comments for complex logic
- Keep functions focused and small

## Testing

Before submitting:

1. Test locally: `pi -e ./src/index.ts`
2. Check for syntax errors: `npm run type-check`
3. Review your code for clarity

## Submitting Changes

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes and commit: `git commit -am 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request

## Issues

Found a bug or have a suggestion? Open an issue with:

- Description of the problem
- Steps to reproduce (if applicable)
- Your environment (OS, pi version, etc.)
- Proposed solution (if any)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
