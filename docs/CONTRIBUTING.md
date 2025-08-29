# Contributing to UEMCP

First off, thank you for considering contributing to UEMCP! Your help is greatly appreciated.

## How Can I Contribute?

### Reporting Bugs

- Ensure the bug was not already reported by searching on GitHub under [Issues](https://github.com/atomantic/UEMCP/issues).
- If you're unable to find an open issue addressing the problem, [open a new one](https://github.com/atomantic/UEMCP/issues/new). Be sure to include a **title and clear description**, as much relevant information as possible, and a **code sample** or an **executable test case** demonstrating the expected behavior that is not occurring.

### Suggesting Enhancements

- Open a new issue with the enhancement suggestion, providing as much detail as possible about the proposed changes and why they would be beneficial.

### Pull Requests

- Open a new GitHub pull request with the patch.
- Ensure the PR description clearly describes the problem and solution. Include the relevant issue number if applicable.
- Follow the existing code style and conventions.
- Make sure your code is well-commented, especially in hard-to-understand areas.

## Coding Conventions

- **TypeScript:** Follow ESLint rules, no `any` types without justification
- **Python:** Adhere to PEP 8, use type hints, catch specific exceptions
- **Line Endings:** Always use LF (Unix-style), not CRLF
- **Testing:** Run `./test-ci-locally.sh` before committing

See [CLAUDE.md](../CLAUDE.md) for detailed code standards.

## Release Process

For maintainers releasing new versions:

1. Update version in `package.json` and `plugin/UEMCP.uplugin`
2. Update PLAN.md roadmap status
3. Create release notes in `docs/release-notes/vX.Y.Z.md`
4. Tag release: `git tag vX.Y.Z && git push --tags`
5. Create GitHub release with notes

## Questions?

Feel free to open an issue for any questions you may have.
