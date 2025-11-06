# Dotfiles Manager

A TypeScript-based dotfiles manager for syncing configuration files across macOS machines.

## Overview

This tool helps you:
- Back up dotfiles to a git repository
- Sync dotfiles across multiple machines
- Manage symlinks automatically

## Installation

### Prerequisites
- Deno 2 (optional, only needed for development)
- Git

### Setup

1. **On your first machine** (where you have existing dotfiles):
   ```bash
   # Clone this repo
   git clone <your-repo-url> ~/.dotfiles
   cd ~/.dotfiles

   # Copy existing dotfiles and create symlinks
   ./dotfiles copy

   # Commit and push
   git add .
   git commit -m "Initial dotfiles backup"
   git push
   ```

2. **On additional machines**:
   ```bash
   # Clone the repo
   git clone <your-repo-url> ~/.dotfiles
   cd ~/.dotfiles

   # Create symlinks to dotfiles
   ./dotfiles link
   ```

## Usage

### Commands

#### `copy`
Copies dotfiles from your home directory to `~/.dotfiles` and creates symlinks.

```bash
./dotfiles copy
```

Use this for:
- Initial setup on your first machine
- Adding new dotfiles to track

#### `link`
Creates symlinks from your home directory to files in `~/.dotfiles`.

```bash
./dotfiles link
```

Use this for:
- Setting up a new machine after cloning the repo
- Restoring symlinks if they get broken

#### `sync`
Pulls and pushes changes to/from the git repository.

```bash
./dotfiles sync
```

Use this for:
- Syncing changes between machines
- After manually editing dotfiles

## Configuration

The managed dotfiles are defined in `dotfiles.ts`:

```typescript
const DEFAULT_CONFIG: DotfilesConfig = {
  dotfiles_dir: `${Deno.env.get("HOME")}/.dotfiles`,
  paths: [
    ".gitconfig",
    ".zshrc",
    ".claude",
    ".vscode",
    ".nvm",
  ],
  ignore_patterns: [
    ".DS_Store",
    "node_modules",
    "*.log",
    "cache",
    "tmp",
    "*.swp",
  ],
};
```

To add more dotfiles, edit the `DEFAULT_CONFIG` and recompile.

## Ignored Patterns

The following patterns are automatically excluded:
- `.DS_Store`
- `node_modules`
- `*.log`
- `cache`
- `tmp`
- `*.swp`

## Development

### Compiling from Source

If you modify `dotfiles.ts`, recompile the binary:

```bash
deno compile \
  --allow-read \
  --allow-write \
  --allow-run \
  --allow-env \
  --output dotfiles \
  dotfiles.ts
```

Then commit the updated binary.

## Workflow Example

### Daily workflow on Machine A:
```bash
# Edit your dotfiles normally
vim ~/.zshrc

# Sync when ready
cd ~/.dotfiles
./dotfiles sync
```

### Later on Machine B:
```bash
# Pull changes
cd ~/.dotfiles
./dotfiles sync

# Your ~/.zshrc is automatically updated (via symlink)
```

## Troubleshooting

### Conflict errors
If you see "Error: file already exists", manually resolve the conflict:
```bash
# Check what exists
ls -la ~/.<file>

# Back it up if needed
mv ~/.<file> ~/.<file>.backup

# Try again
./dotfiles link
```

### Broken symlinks
Re-run the link command:
```bash
./dotfiles link
```

### Git conflicts
Handle manually:
```bash
cd ~/.dotfiles
git status
# resolve conflicts
git add .
git commit
./dotfiles sync
```

## License

MIT
