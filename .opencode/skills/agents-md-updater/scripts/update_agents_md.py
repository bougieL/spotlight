#!/usr/bin/env python3
"""
AGENTS.md Parser and Validator

Validates AGENTS.md structure and helps ensure consistency when adding new rules.
"""

import re
import sys
from pathlib import Path


def parse_agents_md(file_path: str):
    """Parse AGENTS.md and extract rules."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract rule sections
    rules = []
    rule_pattern = r'### (\d+)\.\s+(.+?)\s*\((Mandatory|Optional)\)'

    for match in re.finditer(rule_pattern, content):
        rule_num = match.group(1)
        rule_title = match.group(2).strip()
        rule_type = match.group(3)

        # Extract rule content until next ### or ##
        start_pos = match.end()
        next_section = re.search(r'\n### ', content[start_pos:])
        if next_section:
            rule_content = content[start_pos:start_pos + next_section.start()].strip()
        else:
            rule_content = content[start_pos:].strip()

        rules.append({
            'number': int(rule_num),
            'title': rule_title,
            'type': rule_type,
            'content': rule_content
        })

    return rules


def validate_agents_md(file_path: str):
    """Validate AGENTS.md structure and consistency."""
    print(f"Validating {file_path}...")

    rules = parse_agents_md(file_path)

    if not rules:
        print("❌ No rules found!")
        return False

    # Check numbering sequence
    numbers = [r['number'] for r in rules]
    if numbers != list(range(1, len(numbers) + 1)):
        print("❌ Rule numbering is not sequential!")
        for i, (expected, actual) in enumerate(zip(range(1, len(numbers) + 1), numbers), 1):
            if expected != actual:
                print(f"   Position {i}: Expected {expected}, got {actual}")
        return False

    print(f"✅ Found {len(rules)} rules with correct numbering")

    # Check format
    for rule in rules:
        if not re.match(r'^###\s+\d+\.\s+.+\s*\(Mandatory\|Optional\)', 
                       f"### {rule['number']}. {rule['title']} ({rule['type']})"):
            print(f"❌ Rule {rule['number']} has incorrect format")
            return False

    print("✅ All rules follow correct format")
    return True


def print_rules(file_path: str):
    """Print all rules for reference."""
    rules = parse_agents_md(file_path)
    print("\n" + "=" * 80)
    print(f"Found {len(rules)} rules in {file_path}:")
    print("=" * 80)

    for rule in rules:
        print(f"\n### {rule['number']}. {rule['title']} ({rule['type']})")
        print(f"{rule['content'][:100]}..." if len(rule['content']) > 100 else rule['content'])


def generate_template(rule_num: int):
    """Generate a template for a new rule."""
    template = f"""### {rule_num}. [Rule Title] (Mandatory)
- **[Main rule statement in bold]**
- [Additional explanation if needed]
- Example: `[code example or usage]`
"""
    return template


def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python update_agents_md.py <path-to-AGENTS.md>            # Validate and list rules")
        print("  python update_agents_md.py <path-to-AGENTS.md> validate   # Validate only")
        print("  python update_agents_md.py <path-to-AGENTS.md> template N # Generate template for rule N")
        sys.exit(1)

    file_path = sys.argv[1]

    if not Path(file_path).exists():
        print(f"❌ File not found: {file_path}")
        sys.exit(1)

    if len(sys.argv) == 2:
        # Default: validate and print
        if validate_agents_md(file_path):
            print_rules(file_path)
    elif sys.argv[2] == 'validate':
        validate_agents_md(file_path)
    elif sys.argv[2] == 'template':
        if len(sys.argv) < 4:
            print("Usage: python update_agents_md.py <path> template <rule-number>")
            sys.exit(1)
        rule_num = int(sys.argv[3])
        print("\n" + generate_template(rule_num))
    else:
        print(f"Unknown command: {sys.argv[2]}")
        sys.exit(1)


if __name__ == "__main__":
    main()