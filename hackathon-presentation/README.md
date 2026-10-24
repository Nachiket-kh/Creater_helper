# CollabDesk hackathon presentation

This folder contains the editable 20-slide pitch deck, its PDF export, a detailed presentation and project guide, and the source used to generate the artifacts.

## Deliverables

- `Project_Hackathon_Pitch.pptx` - editable 16:9 PowerPoint, 20 slides.
- `Project_Hackathon_Presentation.pdf` - 20-page slide handout exported from the PowerPoint.
- `Project_Hackathon_Presentation_Guide.pdf` - project walkthrough, feature and source map, architecture notes, demo instructions, slide script, 30 judge answers, validation evidence, and quick revision sheet.
- `src/generate_deck.mjs` - presentation source. It uses the Codex presentation runtime's `@oai/artifact-tool` and finalization utilities.
- `src/generate_guide.py` - ReportLab source for the guide PDF.

## Regenerate

The deck source expects the Codex desktop presentation runtime used to author this deck, including its bundled `@oai/artifact-tool` package and presentation validation utilities. It also currently refers to this checkout at `/Users/ravirajbhope/CreatorProduction` and the installed runtime under `~/.cache/codex-runtimes/`. It is included for review and reproducibility in that environment; it is not a standalone npm script for a clean machine.

From the project root in that same environment:

```sh
RUNTIME_NODE_MODULES=/Users/ravirajbhope/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules node hackathon-presentation/src/generate_deck.mjs
```

Generated previews/validation receipt are written in the project-root `.hackathon_build/` folder. The finalizer does not overwrite an existing PPTX or validation receipt; move/remove the old generated files before a fresh export.

Regenerate the guide PDF with the bundled Python environment:

```sh
/Users/ravirajbhope/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 hackathon-presentation/src/generate_guide.py
```

To recreate the slide PDF, export the regenerated PPTX to PDF using LibreOffice Impress or another PowerPoint-compatible exporter. Verify that the result has 20 pages and review it at presentation size.

## Project claims and demo safety

The deck uses seed values from `server/data/db.json` and `server/samples.js`. The INR 8,000 offer, creator profile, follower count and post performance are demo fixtures, not market statistics or customer evidence. The app has no authentication or user isolation, so keep a live demo on loopback. The guide recommends a temporary JSON copy for any workflow that writes data.

Automated verification recorded for this deck: 10 backend tests passed, the Vite production build passed, and the 20-slide PPTX passed package, geometry and first-party import checks with zero findings. Read-only browser inspection was performed; a browser end-to-end parse flow, live OpenAI/Supabase configuration, accessibility, responsive behavior and user impact were not verified.

The deck uses diagrams and a progressive story for visual movement. Native PowerPoint transitions or animations are not included or verified.
