#!/usr/bin/env python3
"""
Conversor e Indexador de Bases Legais Trabalhistas (PDF -> Markdown + Supabase).
Localização oficial: scripts/convert_legal_pdfs_to_md.py

Uso:
  python scripts/convert_legal_pdfs_to_md.py
  python scripts/convert_legal_pdfs_to_md.py --upload
"""

from __future__ import annotations

import argparse
import json
import os
import re
import urllib.request
from pathlib import Path
from typing import Any

from pypdf import PdfReader

ROOT_DIR = Path(__file__).resolve().parent.parent
BASE_LEGAIS_DIR = ROOT_DIR / "base_legais"
MARKDOWN_OUT_DIR = BASE_LEGAIS_DIR / "markdown"
CATALOG_JSON_PATH = ROOT_DIR / "src" / "data" / "legalBaseCatalog.json"

KNOWN_LAWS_METADATA: dict[str, dict[str, Any]] = {
    "Del5452compilado": {
        "code": "CLT-5452",
        "title": "Consolidação das Leis do Trabalho (CLT Compilada)",
        "law_number": "Decreto-Lei nº 5.452/1943",
        "category": "Legislação Trabalhista Geral",
        "effective_year": 1943,
        "summary": (
            "Normas consolidadas que regulam as relações individuais e coletivas de trabalho: "
            "jornada, horas extras, férias, 13º salário, aviso prévio, segurança e medicina do trabalho, "
            "justa causa e rescisão contratual."
        ),
        "tags": [
            "CLT",
            "Férias",
            "Jornada",
            "Horas Extras",
            "Adicional Noturno",
            "Insalubridade",
            "Periculosidade",
            "Rescisão",
            "Justa Causa",
            "CTPS",
        ],
    },
    "L13467": {
        "code": "LEI-13467",
        "title": "Reforma Trabalhista — Modernização da CLT",
        "law_number": "Lei nº 13.467/2017",
        "category": "Reforma Trabalhista & Contratos",
        "effective_year": 2017,
        "summary": (
            "Altera a CLT e a Lei nº 6.019/1974 para adequar a legislação às novas relações de trabalho: "
            "férias em até 3 períodos, banco de horas individual, teletrabalho (home office), "
            "demissão em comum acordo (Art. 484-A), trabalho intermitente e prestação de serviços autônomos/PJ."
        ),
        "tags": [
            "Reforma Trabalhista",
            "Férias Fracionadas",
            "Banco de Horas",
            "Teletrabalho",
            "Home Office",
            "Acordo Trabalhista",
            "Terceirização",
            "PJ",
        ],
    },
    "L15270": {
        "code": "LEI-15270",
        "title": "Isenção de IRRF até R$ 5.000,00 e Redutor Progressivo",
        "law_number": "Lei nº 15.270/2025",
        "category": "Tributação da Folha (IRRF)",
        "effective_year": 2026,
        "summary": (
            "Altera a Lei nº 9.250/1995 para instituir a redução do Imposto sobre a Renda Retido na Fonte "
            "(IRRF) incidente sobre rendimentos do trabalho assalariado, garantindo isenção integral até "
            "R$ 5.000,00 mensais (redução de até R$ 312,89) e faixa de transição decrescente até R$ 7.350,00."
        ),
        "tags": [
            "IRRF",
            "Isenção 5000",
            "Imposto de Renda",
            "Folha de Pagamento",
            "Redutor Legal",
            "Lei 15.270/2025",
        ],
    },
    "RIR_2018": {
        "code": "RIR-2018",
        "title": "Regulamento do Imposto sobre a Renda (RIR/2018)",
        "law_number": "Decreto nº 9.580/2018",
        "category": "Tributação PF & PJ (IRRF / RIR)",
        "effective_year": 2018,
        "summary": (
            "Regulamenta a tributação, fiscalização, arrecadação e administração do Imposto sobre a Renda "
            "e Proventos de Qualquer Natureza: incidência e isenções sobre rendimentos do trabalho assalariado, "
            "férias, abono pecuniário, 13º salário, deduções legais, dependentes e retenções na fonte PF e PJ."
        ),
        "tags": [
            "RIR 2018",
            "Decreto 9.580/2018",
            "IRRF",
            "Rendimentos do Trabalho",
            "Isenções",
            "Férias",
            "Retenção PJ",
            "Deduções Legais",
        ],
    },
}


def load_env_file(env_path: Path) -> dict[str, str]:
    env_vars: dict[str, str] = {}
    if not env_path.exists():
        return env_vars
    for raw_line in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env_vars[k.strip()] = v.strip().strip('"').strip("'")
    return env_vars


def clean_extracted_text(raw_text: str) -> str:
    text = raw_text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    # Remove linhas vazias excessivas
    text = re.sub(r"\n{3,}", "\n\n", text)

    formatted_lines: list[str] = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            formatted_lines.append("")
            continue

        # Destacar Títulos e Capítulos
        if re.match(r"^(TÍTULO|TITULO)\s+[IVXLCDM]+", stripped, re.IGNORECASE):
            formatted_lines.append(f"\n# {stripped}\n")
        elif re.match(r"^(CAPÍTULO|CAPITULO)\s+[IVXLCDM]+", stripped, re.IGNORECASE):
            formatted_lines.append(f"\n## {stripped}\n")
        elif re.match(r"^(SEÇÃO|SECAO)\s+[IVXLCDM]+", stripped, re.IGNORECASE):
            formatted_lines.append(f"\n### {stripped}\n")
        elif re.match(r"^[\"“'‘]?\s*Art\.\s*\d+", stripped):
            clean_art = re.sub(r"^[\"“'‘]\s*", "", stripped)
            formatted_lines.append(f"\n### {clean_art}")
        else:
            formatted_lines.append(stripped)

    result = "\n".join(formatted_lines)
    return re.sub(r"\n{3,}", "\n\n", result).strip()


def extract_key_articles(markdown_body: str, max_articles: int = 120) -> list[dict[str, str]]:
    """Extrai artigos estruturados (Art. X) para busca instantânea na interface."""
    pattern = re.compile(
        r"###\s+(Art\.\s*\d+[º°o\-A-Za-z]*\.?)\s*(.*?)(?=\n###\s+Art\.|\n#\s+|\n##\s+|\Z)",
        re.DOTALL,
    )
    matches = pattern.findall(markdown_body)
    articles: list[dict[str, str]] = []
    seen_numbers: set[str] = set()

    # Artigos essenciais da CLT, Reforma Trabalhista e RIR/2018 (exact number match)
    priority_numbers = {
        "1", "2", "3", "7", "29", "41", "58", "58-A", "59", "59-A", "59-B",
        "61", "62", "66", "71", "73", "75", "75-A", "75-B", "75-C",
        "129", "130", "130-A", "134", "135", "137", "142", "143", "145",
        "189", "190", "191", "192", "193", "194", "195",
        "392", "442", "442-B", "443", "457", "458", "461", "462", "468",
        "473", "477", "482", "483", "484", "484-A", "487",
    }

    prioritised: list[tuple[str, str]] = []
    others: list[tuple[str, str]] = []
    for art_num, content in matches:
        clean_num = re.sub(r"\s+", " ", art_num).strip()
        clean_text = re.sub(r"\s+", " ", content).strip()
        if not clean_text or len(clean_text) < 15:
            continue
        if "(Revogado" in clean_text[:60] or "(revogado" in clean_text[:60]:
            continue
        num_match = re.search(r"Art\.\s*(\d+(?:-[A-Za-z]+)?)", clean_num)
        num_token = num_match.group(1) if num_match else ""
        if num_token in priority_numbers:
            prioritised.append((clean_num, clean_text))
        else:
            others.append((clean_num, clean_text))

    for clean_num, clean_text in (prioritised + others):
        if clean_num in seen_numbers:
            continue
        seen_numbers.add(clean_num)
        articles.append(
            {
                "article": clean_num,
                "content": clean_text[:1400],
            }
        )
        if len(articles) >= max_articles:
            break

    return articles


def build_frontmatter(meta: dict[str, Any], articles_count: int, pages_count: int) -> str:
    tags_yaml = ", ".join(f'"{t}"' for t in meta.get("tags", []))
    return (
        "---\n"
        f'code: "{meta["code"]}"\n'
        f'title: "{meta["title"]}"\n'
        f'law_number: "{meta["law_number"]}"\n'
        f'category: "{meta["category"]}"\n'
        f'effective_year: {meta["effective_year"]}\n'
        f"pages_count: {pages_count}\n"
        f"articles_count: {articles_count}\n"
        f"tags: [{tags_yaml}]\n"
        f'summary: "{meta["summary"]}"\n'
        "---\n\n"
    )


def convert_pdf_file(pdf_path: Path) -> dict[str, Any]:
    stem = pdf_path.stem
    meta = KNOWN_LAWS_METADATA.get(
        stem,
        {
            "code": stem.upper(),
            "title": f"Base Legal {stem}",
            "law_number": stem,
            "category": "Legislação Trabalhista",
            "effective_year": 2026,
            "summary": f"Documento normativo convertido automaticamente a partir de {pdf_path.name}.",
            "tags": ["Legislação", stem],
        },
    )

    reader = PdfReader(str(pdf_path))
    pages_count = len(reader.pages)
    page_texts: list[str] = []
    for page in reader.pages:
        try:
            page_texts.append(page.extract_text() or "")
        except Exception:
            continue

    raw_text = "\n\n".join(page_texts)
    cleaned_md_body = clean_extracted_text(raw_text)
    all_articles = re.findall(r"###\s+Art\.\s*\d+", cleaned_md_body)
    articles_count = max(len(all_articles), 1)

    frontmatter = build_frontmatter(meta, articles_count, pages_count)
    header_block = (
        f"# {meta['title']} ({meta['law_number']})\n\n"
        f"> **Resumo Executivo:** {meta['summary']}\n\n"
        "---\n\n"
    )
    full_markdown = frontmatter + header_block + cleaned_md_body + "\n"

    MARKDOWN_OUT_DIR.mkdir(parents=True, exist_ok=True)
    md_filename = f"{stem}.md"
    md_out_path = MARKDOWN_OUT_DIR / md_filename
    md_out_path.write_text(full_markdown, encoding="utf-8")

    key_articles = extract_key_articles(cleaned_md_body, max_articles=120)

    return {
        "code": meta["code"],
        "stem": stem,
        "title": meta["title"],
        "law_number": meta["law_number"],
        "category": meta["category"],
        "effective_year": meta["effective_year"],
        "summary": meta["summary"],
        "tags": meta["tags"],
        "pages_count": pages_count,
        "articles_count": articles_count,
        "md_local_path": f"base_legais/markdown/{md_filename}",
        "pdf_local_path": f"base_legais/{pdf_path.name}",
        "md_storage_path": f"ccbrh-legal-base/markdown/{md_filename}",
        "pdf_storage_path": f"ccbrh-legal-base/pdf/{pdf_path.name}",
        "key_articles": key_articles,
        "markdown_excerpt": cleaned_md_body[:25000],
        "full_markdown_path": str(md_out_path),
    }


def upload_to_supabase_storage(
    supabase_url: str,
    api_key: str,
    bucket: str,
    object_path: str,
    file_bytes: bytes,
    content_type: str,
) -> bool:
    url = f"{supabase_url.rstrip('/')}/storage/v1/object/{bucket}/{object_path}"
    req = urllib.request.Request(
        url,
        data=file_bytes,
        method="POST",
        headers={
            "apikey": api_key,
            "Authorization": f"Bearer {api_key}",
            "Content-Type": content_type,
            "x-upsert": "true",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return 200 <= resp.status < 300
    except Exception as exc:
        print(f"  [WARN] Upload falhou para {object_path}: {exc}")
        return False


def main() -> None:
    parser = argparse.ArgumentParser(description="Converte PDFs de base_legais para Markdown (.md)")
    parser.add_argument(
        "--upload",
        action="store_true",
        help="Envia os arquivos .md e .pdf para o bucket ccbrh-legal-base no Supabase",
    )
    args = parser.parse_args()

    if not BASE_LEGAIS_DIR.exists():
        raise SystemExit(f"Pasta não encontrada: {BASE_LEGAIS_DIR}")

    pdf_files = sorted(BASE_LEGAIS_DIR.glob("*.pdf"))
    if not pdf_files:
        raise SystemExit(f"Nenhum arquivo .pdf encontrado em {BASE_LEGAIS_DIR}")

    catalog_items: list[dict[str, Any]] = []
    for pdf_path in pdf_files:
        print(f"[Convertendo] {pdf_path.name} ...")
        info = convert_pdf_file(pdf_path)
        print(
            f"  -> Gerado: {info['md_local_path']} "
            f"({info['pages_count']} páginas, {info['articles_count']} artigos detectados)"
        )
        catalog_items.append(info)

    CATALOG_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    serializable_catalog = [
        {k: v for k, v in item.items() if k != "full_markdown_path"} for item in catalog_items
    ]
    CATALOG_JSON_PATH.write_text(
        json.dumps(serializable_catalog, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"[Catálogo JSON] Salvo em {CATALOG_JSON_PATH.relative_to(ROOT_DIR)}")

    if args.upload:
        env = load_env_file(ROOT_DIR / ".env")
        supabase_url = os.environ.get("VITE_SUPABASE_URL") or env.get("VITE_SUPABASE_URL", "")
        api_key = os.environ.get("VITE_SUPABASE_ANON_KEY") or env.get("VITE_SUPABASE_ANON_KEY", "")
        if not supabase_url or not api_key:
            print("[WARN] Variáveis VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY não encontradas para upload.")
            return

        for item in catalog_items:
            md_path = Path(item["full_markdown_path"])
            pdf_path = ROOT_DIR / item["pdf_local_path"]
            md_ok = upload_to_supabase_storage(
                supabase_url,
                api_key,
                "ccbrh-legal-base",
                f"markdown/{md_path.name}",
                md_path.read_bytes(),
                "text/markdown; charset=utf-8",
            )
            pdf_ok = upload_to_supabase_storage(
                supabase_url,
                api_key,
                "ccbrh-legal-base",
                f"pdf/{pdf_path.name}",
                pdf_path.read_bytes(),
                "application/pdf",
            )
            print(f"  [Bucket Upload] {item['code']}: MD={md_ok}, PDF={pdf_ok}")


if __name__ == "__main__":
    main()
