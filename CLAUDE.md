# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a dotfiles management repository that uses a Deno 2-based TypeScript tool to sync configuration files across macOS machines. The tool handles copying, symlinking, and git syncing of dotfiles.

## Development

### Building the Binary

Compile the TypeScript source to a binary:

```bash
deno compile \
  --allow-read \
  --allow-write \
  --allow-run \
  --allow-env \
  --output dotfiles \
  dotfiles.ts
```

The compiled `dotfiles` binary should be committed to the repository.

### Running Commands

The tool has three main commands:

- `./dotfiles copy` - Copy dotfiles from home directory to ~/.dotfiles and create symlinks
- `./dotfiles link` - Create symlinks from home directory to ~/.dotfiles (for new machine setup)
- `./dotfiles sync` - Pull and push git changes

## Architecture

### Core Design Principles

1. **Class-based with dependency injection**: All configuration passed through `DotfilesManager` constructor
2. **Snake_case naming**: All variables, functions, and parameters use snake_case
3. **Function declarations**: Use function declaration syntax within class methods
4. **Strict TypeScript**: Explicit return types on all methods, strict typing throughout
5. **ESM syntax**: Use ES module imports/exports

### Error Handling Pattern

This is the most critical architectural pattern:

- **Private helper methods**: Always throw errors, never log or exit
- **Public command methods**: Catch errors from helpers, pass to `log_error()`, then decide to continue or exit

Example:
```typescript
// Private method - throws
private copy_path(source: string, dest: string): void {
  throw new Error(`File already exists: ${dest}`);
}

// Public method - catches
public copy(): void {
  try {
    this.copy_path(source, dest);
  } catch (error) {
    this.log_error(error as Error, `copying ${path}`);
    // Decide: continue to next item, or Deno.exit(1)
  }
}
```

### Class Structure

```typescript
class DotfilesManager {
  // Public command methods (entry points)
  public copy(): void
  public link(): void
  public sync(): void

  // Private helper methods (throw errors)
  private get_home_dir(): string
  private is_ignored(path: string, relative_path?: string): boolean
  private is_symlink_to_target(symlink_path: string, target_path: string): boolean
  private ensure_parent_dir(path: string): void
  private copy_path(source: string, dest: string): void
  private copy_file(source: string, dest: string): void
  private copy_directory(source: string, dest: string, base_relative_path?: string): void
  private remove_path(path: string): void
  private create_symlink(target: string, path: string): void
  private execute_git_command(args: string[]): void
  private log_error(error: Error, context: string): void
}
```

### Configuration

The `DEFAULT_CONFIG` defines managed dotfiles:
```typescript
const DEFAULT_CONFIG: DotfilesConfig = {
  dotfiles_dir: `${Deno.env.get("HOME")}/.dotfiles`,
  paths: [".gitconfig", ".zshrc", ".claude", ".vscode", ".nvm"],
  ignore_patterns: [".DS_Store", "node_modules", "*.log", "cache", "tmp", "*.swp"],
};
```

## Implementation Details

### Command Behavior

**copy**: For initial setup on first machine
- Copies each path from ~ to ~/.dotfiles
- Removes original from ~
- Creates symlink from ~ pointing to ~/.dotfiles
- Skips ignored patterns
- Throws on conflicts (file already exists in ~/.dotfiles)

**link**: For new machine setup after git clone
- Creates symlinks from ~ to existing files in ~/.dotfiles
- Skips if symlink already points to correct target
- Throws on conflicts (non-symlink file exists in ~)

**sync**: For syncing changes via git
- Runs `git pull` followed by `git push`
- Fatal errors exit immediately

### Deno Standard Library Usage

The implementation uses:
- `@std/path/glob-to-regexp` - For .gitignore-style pattern matching
- `@std/path` - For `join()`, `resolve()`, `dirname()`, `basename()`
- Built-in Deno APIs:
  - `Deno.statSync()` / `Deno.lstatSync()` - Check file/directory/symlink status
  - `Deno.readDirSync()` - Read directory contents
  - `Deno.mkdirSync()` - Create directories with `recursive: true`
  - `Deno.removeSync()` - Remove files/directories with `recursive: true`
  - `Deno.symlinkSync()` - Create symlinks with auto-detected type
  - `Deno.readLinkSync()` - Read symlink target
  - `Deno.copyFileSync()` - Copy individual files
  - `Deno.Command` - Execute git commands
  - `Deno.env.get("HOME")` - Get home directory path

### Success Message Format

Use these exact formats:
- "✓ Copied and linked: {path}"
- "✓ Linked: {path}"
- "✓ Already linked: {path}"
- "✓ Sync complete"

### Error Message Format

Format: `Error while ${context}: ${error.message}`

Example: "Error while copying .zshrc: File already exists"

### Key Implementation Notes

1. **Glob Pattern Matching**: The `is_ignored()` method checks both basename and full relative paths, matching .gitignore behavior. This allows patterns like `node_modules` to match `node_modules` anywhere in the directory tree.

2. **HOME Environment Variable**: The `get_home_dir()` helper validates that HOME is set and throws an error if not, ensuring consistent error handling across commands.

3. **Directory Structure Preservation**: When copying directories, the implementation preserves the exact structure while recursively applying ignore patterns.

4. **Symlink Type Detection**: The `create_symlink()` method auto-detects whether to create a file or directory symlink by checking the target with `Deno.statSync()`.

5. **Git Output**: Both stdout and stderr are inherited to the terminal for better user experience during git operations.

6. **Conflict Detection**: The `copy()` command explicitly checks for conflicts by attempting to stat the destination path before copying, providing clear error messages.
