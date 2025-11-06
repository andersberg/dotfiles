import { globToRegExp } from "jsr:@std/path@1/glob-to-regexp";
import { join, resolve, dirname, basename } from "jsr:@std/path@1";

// Configuration interface
interface DotfilesConfig {
  dotfiles_dir: string;
  paths: readonly string[];
  ignore_patterns: readonly string[];
}

// Default configuration
const DEFAULT_CONFIG: DotfilesConfig = {
  dotfiles_dir: `${Deno.env.get("HOME")}/.dotfiles`,
  paths: [
    ".gitconfig",
    ".zshrc",
    ".claude",
    ".nvm",
  ] as const,
  ignore_patterns: [
    ".DS_Store",
    "node_modules",
    "*.log",
    "cache",
    "tmp",
    "*.swp",
  ] as const,
};

// Main dotfiles manager class
export default class DotfilesManager {
  private dotfiles_dir: string;
  private paths: readonly string[];
  private ignore_patterns: readonly string[];
  private ignore_regexps: RegExp[];

  constructor(config: DotfilesConfig) {
    this.dotfiles_dir = config.dotfiles_dir;
    this.paths = config.paths;
    this.ignore_patterns = config.ignore_patterns;

    // Convert glob patterns to regexps for matching
    this.ignore_regexps = config.ignore_patterns.map((pattern) =>
      globToRegExp(pattern, { extended: true, globstar: true })
    );
  }

  // Public command methods

  public copy(): void {
    let home_dir: string;
    try {
      home_dir = this.get_home_dir();
    } catch (error) {
      this.log_error(error as Error, "initializing");
      Deno.exit(1);
    }

    for (const path of this.paths) {
      const source_path = join(home_dir, path);
      const dest_path = join(this.dotfiles_dir, path);

      // Check if source exists
      try {
        Deno.statSync(source_path);
      } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
          console.warn(`Warning: ${path} not found in home directory, skipping.`);
          continue;
        }
        this.log_error(error as Error, `checking source ${path}`);
        Deno.exit(1);
      }

      // Check if destination already exists (conflict)
      try {
        Deno.statSync(dest_path);
        // If we reach here, destination exists - this is a conflict
        this.log_error(
          new Error(`File already exists: ${dest_path}`),
          `checking destination ${path}`
        );
        Deno.exit(1);
      } catch (error) {
        if (!(error instanceof Deno.errors.NotFound)) {
          this.log_error(error as Error, `checking destination ${path}`);
          Deno.exit(1);
        }
        // Destination doesn't exist - good, we can proceed
      }

      try {
        // Copy to dotfiles directory
        this.copy_path(source_path, dest_path);

        // Remove original
        this.remove_path(source_path);

        // Create symlink
        this.create_symlink(dest_path, source_path);

        console.log(`✓ Copied and linked: ${path}`);
      } catch (error) {
        this.log_error(error as Error, `copying ${path}`);
        Deno.exit(1);
      }
    }
  }

  public link(): void {
    let home_dir: string;
    try {
      home_dir = this.get_home_dir();
    } catch (error) {
      this.log_error(error as Error, "initializing");
      Deno.exit(1);
    }

    for (const path of this.paths) {
      const source_path = join(this.dotfiles_dir, path);
      const dest_path = join(home_dir, path);

      try {
        // Check if source exists in dotfiles directory
        try {
          Deno.statSync(source_path);
        } catch {
          throw new Error(`Source not found in dotfiles directory: ${path}`);
        }

        // Check if destination already exists
        try {
          const dest_stat = Deno.lstatSync(dest_path);

          // If it's a symlink pointing to the correct target, skip
          if (this.is_symlink_to_target(dest_path, source_path)) {
            console.log(`✓ Already linked: ${path}`);
            continue;
          }

          // Otherwise, it's a conflict
          throw new Error(`File already exists at destination: ${dest_path}`);
        } catch (error) {
          if (!(error instanceof Deno.errors.NotFound)) {
            throw error;
          }
          // Destination doesn't exist - this is good, we can proceed
        }

        // Ensure parent directory exists
        this.ensure_parent_dir(dest_path);

        // Create symlink
        this.create_symlink(source_path, dest_path);

        console.log(`✓ Linked: ${path}`);
      } catch (error) {
        this.log_error(error as Error, `linking ${path}`);
        Deno.exit(1);
      }
    }
  }

  public sync(): void {
    try {
      // Check if dotfiles_dir is a git repository
      const git_dir = join(this.dotfiles_dir, ".git");
      try {
        Deno.statSync(git_dir);
      } catch {
        throw new Error(`Not a git repository: ${this.dotfiles_dir}`);
      }

      // Execute git pull
      this.execute_git_command(["pull"]);

      // Execute git push
      this.execute_git_command(["push"]);

      console.log("✓ Sync complete");
    } catch (error) {
      this.log_error(error as Error, "syncing");
      Deno.exit(1);
    }
  }

  // Private helper methods (all throw errors)

  private get_home_dir(): string {
    const home_dir = Deno.env.get("HOME");
    if (!home_dir) {
      throw new Error("HOME environment variable not set");
    }
    return home_dir;
  }

  private is_ignored(path: string, relative_path?: string): boolean {
    const base_name = basename(path);
    const check_path = relative_path || base_name;

    // Check if the basename or relative path matches any ignore pattern
    for (const regexp of this.ignore_regexps) {
      if (regexp.test(base_name) || regexp.test(check_path)) {
        return true;
      }
    }

    return false;
  }

  private is_symlink_to_target(symlink_path: string, target_path: string): boolean {
    try {
      const stat = Deno.lstatSync(symlink_path);

      if (!stat.isSymlink) {
        return false;
      }

      const link_target = Deno.readLinkSync(symlink_path);
      const resolved_link = resolve(dirname(symlink_path), link_target);
      const resolved_target = resolve(target_path);

      return resolved_link === resolved_target;
    } catch (error) {
      throw new Error(`Failed to check symlink: ${(error as Error).message}`);
    }
  }

  private ensure_parent_dir(path: string): void {
    const parent = dirname(path);

    try {
      Deno.mkdirSync(parent, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create parent directory: ${(error as Error).message}`);
    }
  }

  private copy_path(source: string, dest: string): void {
    try {
      const stat = Deno.statSync(source);

      if (stat.isFile) {
        this.copy_file(source, dest);
      } else if (stat.isDirectory) {
        this.copy_directory(source, dest);
      } else {
        throw new Error(`Unsupported file type: ${source}`);
      }
    } catch (error) {
      throw new Error(`Failed to copy: ${(error as Error).message}`);
    }
  }

  private copy_file(source: string, dest: string): void {
    try {
      // Ensure parent directory exists
      this.ensure_parent_dir(dest);

      // Copy the file
      Deno.copyFileSync(source, dest);
    } catch (error) {
      throw new Error(`Failed to copy file: ${(error as Error).message}`);
    }
  }

  private copy_directory(source: string, dest: string, base_relative_path: string = ""): void {
    try {
      // Create destination directory
      Deno.mkdirSync(dest, { recursive: true });

      // Read directory contents
      for (const entry of Deno.readDirSync(source)) {
        const source_path = join(source, entry.name);
        const dest_path = join(dest, entry.name);
        const relative_path = base_relative_path
          ? join(base_relative_path, entry.name)
          : entry.name;

        // Skip ignored patterns (check both basename and full relative path)
        if (this.is_ignored(entry.name, relative_path)) {
          continue;
        }

        // Recursively copy
        if (entry.isFile) {
          this.copy_file(source_path, dest_path);
        } else if (entry.isDirectory) {
          this.copy_directory(source_path, dest_path, relative_path);
        }
      }
    } catch (error) {
      throw new Error(`Failed to copy directory: ${(error as Error).message}`);
    }
  }

  private remove_path(path: string): void {
    try {
      Deno.removeSync(path, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to remove: ${(error as Error).message}`);
    }
  }

  private create_symlink(target: string, path: string): void {
    try {
      // Auto-detect symlink type
      const stat = Deno.statSync(target);
      const type = stat.isDirectory ? "dir" : "file";

      Deno.symlinkSync(target, path, { type });
    } catch (error) {
      throw new Error(`Failed to create symlink: ${(error as Error).message}`);
    }
  }

  private execute_git_command(args: string[]): void {
    try {
      const command = new Deno.Command("git", {
        args,
        cwd: this.dotfiles_dir,
        stdout: "inherit",
        stderr: "inherit",
      });

      const output = command.outputSync();

      if (!output.success) {
        throw new Error(`Git command failed with exit code ${output.code}`);
      }
    } catch (error) {
      throw new Error(`Failed to execute git command: ${(error as Error).message}`);
    }
  }

  private log_error(error: Error, context: string): void {
    console.error(`Error while ${context}: ${error.message}`);
  }
}

// Main entry point
if (import.meta.main) {
  const manager = new DotfilesManager(DEFAULT_CONFIG);
  const command = Deno.args[0];

  switch (command) {
    case "copy":
      manager.copy();
      break;
    case "link":
      manager.link();
      break;
    case "sync":
      manager.sync();
      break;
    default:
      console.error("Usage: dotfiles [copy|link|sync]");
      Deno.exit(1);
  }
}
