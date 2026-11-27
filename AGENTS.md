# Repository Guidelines

## Project Structure & Module Organization

This repository contains four standalone HTML deliverables at its root: the game UI design-system handoff, the peer-tier build codex, the future-item handoff, and the economy balancer. Pages bundle their own markup, styles, scripts, and (in some cases) image data. There is no separate source, assets, or test directory; keep each deliverable self-contained unless a change clearly requires shared files.

## Build, Test, and Development Commands

There is no package manager, build step, or configured test runner. Open an HTML file directly for a quick check, or serve the repository locally to exercise browser behavior:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000/` and open the page you changed. Stop the server with Ctrl-C.

## Coding Style & Naming Conventions

Use descriptive, hyphenated filenames for new pages, and retain established filenames when updating existing deliverables. Keep HTML, CSS, and JavaScript valid and browser-native; avoid adding a framework or build dependency without a clear need. Existing files are compact and often inline their styles and scripts, so keep edits focused and preserve the standalone format. Use consistent indentation when expanding markup or scripts, descriptive identifiers, and accessible labels, headings, and image alt text. Preserve embedded data and game-specific values unless the task calls for changing them.

## Testing Guidelines

No automated tests or coverage requirements are configured. For each change, load the affected page in a browser and check the edited content, interactive controls, responsive layout, and browser console for errors. For a static handoff page, verify navigation links and that embedded images render. Mention any manual checks in the pull request.

## Commit & Pull Request Guidelines

The available Git history uses generic “Add files via upload” subjects and does not establish a detailed convention. Prefer short, imperative commit subjects that say what changed, such as `Improve economy balancer filters`. Pull requests should summarize the affected page and user-visible change, note manual browser checks, link related work when applicable, and include screenshots for visual changes.

## Security & Configuration

Do not commit secrets, private user data, or credentials. Keep configuration and page data in the relevant deliverable, and review changes to embedded datasets before submission.
