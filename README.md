# Claude Statusline

A lightweight Visual Studio Code extension that monitors your active Claude Code CLI token consumption and displays real-time session metrics directly in the status bar. It dynamically integrates with local `caveman` status line hooks to clean, parse, and display your session context seamlessly.

## Features

* **Real-time Token Tracking:** Automatically watches active `.jsonl` session transcript logs and calculates total tokens used against model limits (200k or 1M budgets).
* **Color-Coded Threshold Warnings:** Dynamic status bar recoloring based on context consumption (Green for safe, Yellow at 60% capacity, and Red at 85% or higher) to help prevent unexpected context-window exhaustion.
* **Caveman Badge Integration:** Automatically checks for, invokes, and sanitizes output from local `caveman-statusline.ps1` hooks, cleanly extracting core environment blocks while dropping trailing Git glyph or terminal escape sequence bugs.
* **Zero-Configuration Portability:** Uses dynamic path scanners to resolve platform home directories, user environments, and randomized plugin cache hashes automatically on fresh installations.

## Requirements

* **Node.js** (v18.0.0 or higher recommended)
* **npm** (v9.0.0 or higher)
* **Claude Code CLI** (installed and configured locally)
* **PowerShell** (for Windows users utilizing caveman hook badge execution)

## Installation

Grab `claude-statusline-0.0.1.vsix` from release and install from you VSCode.

## Building from Source

If you want to modify the source code or install this extension manually on a clean machine, follow these instructions to compile and build the package from source code:

### 1. Install Project Dependencies
Open your terminal in the root folder of this project and run the following command to download the compiler, build tools, and extension development types:
```bash
npm install
```

### 2. Handle Test Runner Types (If Compiling for the First Time)
If you run into compilation errors regarding missing Mocha testing frameworks (`suite` or `test` names not found), ensure the test definitions are explicitly loaded in your local development environment:
```bash
npm install --save-dev @types/mocha
```

### 3. Package the Extension into a VSIX File
To assemble your TypeScript source code and package it into a single portable production bundle, use the preconfigured bundle script:
```bash
npm run vsce-bundle
```

Note: This script calls Webpack under production optimizations, flags hidden source-mapping parameters, and compiles your bundle using the `--allow-missing-repository` configuration bypass.

Upon completion, a file named `claude-statusline-0.0.1.vsix` will be created in the root directory.

### 4. Install into Visual Studio Code
You can install this artifact straight into your active editor using either option below:

* Via Terminal: Run the installation argument against your system's VS Code executable:
```bash
  code --install-extension claude-statusline-0.0.1.vsix
```

* Via Editor GUI: Open VS Code, navigate to the Extensions Marketplace View (Ctrl+Shift+X), click the ... icon at the top right of the side panel header, select Install from VSIX..., and browse to select your newly created file.

## Release Notes

### 0.0.1

* Initial release.
* Added dynamic `.jsonl` transcript token tracking.
* Automated folder crawling logic to handle randomized Claude plugin hashes.
* Sanitized terminal ANSI styling blocks and isolated core `[CAVEMAN]` badge tracking.