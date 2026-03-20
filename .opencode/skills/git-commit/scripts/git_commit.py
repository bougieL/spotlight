#!/usr/bin/env python3
"""
Git Commit Helper

Validates git status and generates commit messages following project conventions.
"""

import subprocess
import sys
from pathlib import Path


def run_git_command(command: str, cwd: str = None) -> tuple[int, str, str]:
    """Run a git command and return exit code, stdout, stderr."""
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            cwd=cwd or Path.cwd()
        )
        return result.returncode, result.stdout.strip(), result.stderr.strip()
    except Exception as e:
        return 1, "", str(e)


def validate_repo(cwd: str = None) -> dict:
    """Check if current directory is a valid git repository."""
    exit_code, stdout, stderr = run_git_command("git rev-parse --git-dir", cwd)
    if exit_code != 0:
        return {
            "valid": False,
            "error": "Not a git repository"
        }
    return {"valid": True}


def get_status(cwd: str = None) -> dict:
    """Get git status including staged, unstaged, and untracked files."""
    exit_code, stdout, stderr = run_git_command("git status --porcelain", cwd)
    if exit_code != 0:
        return {
            "error": stderr,
            "staged": [],
            "unstaged": [],
            "untracked": []
        }

    staged = []
    unstaged = []
    untracked = []

    for line in stdout.split('\n'):
        if not line:
            continue
        status = line[:2]
        filepath = line[3:]

        if status[0] in 'MADRC':  # Staged changes
            staged.append(filepath)
        if status[1] in 'MADRC':  # Unstaged changes
            unstaged.append(filepath)
        if status == '??':  # Untracked files
            untracked.append(filepath)

    return {
        "staged": staged,
        "unstaged": unstaged,
        "untracked": untracked
    }


def get_diff(staged: bool = False, cwd: str = None) -> str:
    """Get git diff output."""
    cmd = "git diff --staged" if staged else "git diff"
    exit_code, stdout, stderr = run_git_command(cmd, cwd)
    if exit_code != 0:
        return stderr
    return stdout


def get_recent_commits(count: int = 5, cwd: str = None) -> list:
    """Get recent commit messages."""
    cmd = f"git log -n {count} --pretty=format:\"%H|%s\""
    exit_code, stdout, stderr = run_git_command(cmd, cwd)
    if exit_code != 0:
        return []

    commits = []
    for line in stdout.split('\n'):
        if '|' in line:
            hash, message = line.split('|', 1)
            commits.append({
                "hash": hash[:8],
                "message": message
            })
    return commits


def suggest_commit_message(staged_files: list, diff: str, recent_commits: list) -> str:
    """Generate a commit message suggestion based on changes."""
    if not staged_files:
        return "No files staged for commit"

    # Analyze file types and changes
    extensions = [Path(f).suffix for f in staged_files]
    has_typescript = any(ext in ['.ts', '.tsx'] for ext in extensions)
    has_rust = any(ext == '.rs' for ext in extensions)
    has_json = any(ext in '.json' for ext in extensions)
    has_md = any(ext == '.md' for ext in extensions)

    # Basic categorization
    if has_typescript or has_rust:
        category = "feat" if "add" in diff.lower() or "implement" in diff.lower() else "fix"
    elif has_md:
        category = "docs"
    elif has_json:
        category = "chore"
    else:
        category = "feat"

    # Build message
    file_summary = ", ".join([Path(f).name for f in staged_files[:3]])
    if len(staged_files) > 3:
        file_summary += f" and {len(staged_files) - 3} more"

    message = f"{category}: Update {file_summary}"

    return message


def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python git_commit.py status          # Show git status")
        print("  python git_commit.py diff            # Show unstaged diff")
        print("  python git_commit.py diff-staged     # Show staged diff")
        print("  python git_commit.py recent [N]      # Show recent commits")
        print("  python git_commit.py suggest         # Suggest commit message")
        sys.exit(1)

    command = sys.argv[1]

    # Validate repo
    repo_check = validate_repo()
    if not repo_check["valid"]:
        print(f"❌ Error: {repo_check['error']}")
        sys.exit(1)

    if command == "status":
        status = get_status()
        print(f"📋 Git Status:")
        print(f"   Staged: {len(status['staged'])} files")
        print(f"   Unstaged: {len(status['unstaged'])} files")
        print(f"   Untracked: {len(status['untracked'])} files")

        if status['staged']:
            print(f"\n✅ Staged files:")
            for f in status['staged']:
                print(f"      {f}")

    elif command == "diff":
        diff = get_diff(staged=False)
        if diff:
            print(diff)
        else:
            print("No unstaged changes")

    elif command == "diff-staged":
        diff = get_diff(staged=True)
        if diff:
            print(diff)
        else:
            print("No staged changes")

    elif command == "recent":
        count = int(sys.argv[2]) if len(sys.argv) > 2 else 5
        commits = get_recent_commits(count)
        print(f"📜 Recent {len(commits)} commits:")
        for commit in commits:
            print(f"   {commit['hash']}: {commit['message']}")

    elif command == "suggest":
        status = get_status()
        if not status['staged']:
            print("❌ No files staged. Use 'git add' to stage files first.")
            sys.exit(1)

        diff = get_diff(staged=True)
        recent_commits = get_recent_commits(3)
        suggestion = suggest_commit_message(status['staged'], diff, recent_commits)

        print(f"💡 Suggested commit message:")
        print(f"   {suggestion}")

    else:
        print(f"❌ Unknown command: {command}")
        sys.exit(1)


if __name__ == "__main__":
    main()