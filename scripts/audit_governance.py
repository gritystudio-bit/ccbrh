"""Auditoria de governanca, tamanho de arquivos, modularizacao e hardcodes do projeto CCB RH."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, asdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INCLUDE_DIRS = ("src", "supabase")
CODE_EXTS = {".ts", ".tsx", ".js", ".jsx", ".sql", ".css"}
MAX_RECOMMENDED_LINES = 400
CRITICAL_LINES = 1500

HARDCODE_PATTERNS = {
    "tax_table_or_salary_literal": re.compile(
        r"\b(1621|1518|1412|2259\.20|2428\.80|2826\.65|5000|7350|0\.075|0\.15|0\.225|0\.275)\b"
    ),
    "inss_irrf_constant_array": re.compile(
        r"(INSS_BRACKETS|IRRF_BRACKETS|DEFAULT_MINIMUM_WAGE|SIMPLIFIED_DISCOUNT|DEPENDENT_DEDUCTION)"
    ),
}


@dataclass
class FileDiagnostic:
    path: str
    lines: int
    functions_or_components: int
    status: str
    hardcode_hits: list[str]


def count_functions(content: str) -> int:
    patterns = [
        r"\bfunction\s+[A-Za-z0-9_]+",
        r"\bconst\s+[A-Za-z0-9_]+\s*=\s*(?:async\s*)?\(",
        r"\bexport\s+(?:async\s+)?function\s+[A-Za-z0-9_]+",
    ]
    total = 0
    for pat in patterns:
        total += len(re.findall(pat, content))
    return total


def scan_workspace() -> dict[str, object]:
    diagnostics: list[FileDiagnostic] = []

    for rel_dir in INCLUDE_DIRS:
        base = ROOT / rel_dir
        if not base.exists():
            continue
        for file_path in sorted(base.rglob("*")):
            if not file_path.is_file() or file_path.suffix not in CODE_EXTS:
                continue
            rel = file_path.relative_to(ROOT).as_posix()
            text = file_path.read_text(encoding="utf-8", errors="replace")
            line_count = len(text.splitlines())
            hits: list[str] = []
            for label, regex in HARDCODE_PATTERNS.items():
                matches = sorted(set(regex.findall(text)))
                if matches:
                    hits.append(f"{label}: {', '.join(matches[:6])}")

            if line_count > CRITICAL_LINES:
                status = "CRITICAL_MONOLITH"
            elif line_count > MAX_RECOMMENDED_LINES:
                status = "WARNING_LARGE"
            elif hits:
                status = "WARNING_HARDCODE"
            else:
                status = "OK"

            diagnostics.append(
                FileDiagnostic(
                    path=rel,
                    lines=line_count,
                    functions_or_components=count_functions(text),
                    status=status,
                    hardcode_hits=hits,
                )
            )

    diagnostics.sort(key=lambda d: d.lines, reverse=True)
    summary = {
        "total_files": len(diagnostics),
        "critical_over_1500": [asdict(d) for d in diagnostics if d.lines > CRITICAL_LINES],
        "large_over_400": [asdict(d) for d in diagnostics if MAX_RECOMMENDED_LINES < d.lines <= CRITICAL_LINES],
        "hardcode_alerts": [asdict(d) for d in diagnostics if d.hardcode_hits],
        "top_15_largest": [asdict(d) for d in diagnostics[:15]],
    }
    return summary


if __name__ == "__main__":
    report = scan_workspace()
    print(json.dumps(report, indent=2, ensure_ascii=False))
