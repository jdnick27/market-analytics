# market-analytics

market-analytics

## Development

This repository uses [Black](https://github.com/psf/black) to enforce
consistent Python formatting. A GitHub Actions workflow runs `black --check`
on every push and pull request to the `main` branch.

To manually verify formatting locally, install Black and run:

```bash
pip install black
black --check .
```
