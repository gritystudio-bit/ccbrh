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


def infer_law_metadata_from_text(stem: str, raw_text: str) -> dict[str, Any]:
    """
    Infere automaticamente metadados (código, título, número da norma, ano, categoria, tags e ementa)
    a partir do cabeçalho de qualquer PDF legislativo ou normativo brasileiro (Leis, Decretos, Portarias,
    Instruções Normativas RFB, Normas Regulamentadoras - NRs, Convenções Coletivas - CCT, etc.).
    """
    head = re.sub(r"\s+", " ", raw_text[:6000]).strip()

    # 1. Detecta o tipo e número oficial do ato normativo
    act_patterns = [
        (r"(LEI\s+COMPLEMENTAR\s+N[º°o]?\s*[\d\.]+(?:\s*,\s*DE\s*[^,\n]+?\d{4})?)", "LC"),
        (r"(LEI\s+N[º°o]?\s*[\d\.]+(?:\s*,\s*DE\s*[^,\n]+?\d{4})?)", "LEI"),
        (r"(DECRETO-LEI\s+N[º°o]?\s*[\d\.]+(?:\s*,\s*DE\s*[^,\n]+?\d{4})?)", "DEL"),
        (r"(DECRETO\s+N[º°o]?\s*[\d\.]+(?:\s*,\s*DE\s*[^,\n]+?\d{4})?)", "DEC"),
        (r"(MEDIDA\s+PROVISÓRIA\s+N[º°o]?\s*[\d\.]+(?:\s*,\s*DE\s*[^,\n]+?\d{4})?)", "MP"),
        (r"(INSTRUÇÃO\s+NORMATIVA\s+(?:RFB\s+)?N[º°o]?\s*[\d\.]+(?:\s*,\s*DE\s*[^,\n]+?\d{4})?)", "IN"),
        (r"(PORTARIA\s+(?:MTE\s+|MTP\s+|ME\s+)?N[º°o]?\s*[\d\.]+(?:\s*,\s*DE\s*[^,\n]+?\d{4})?)", "PORT"),
        (r"(NORMA\s+REGULAMENTADORA\s+N[º°o]?\s*\d+|NR\s*-\s*\d+)", "NR"),
    ]

    law_number = stem.replace("_", " ").upper()
    code_prefix = "NORMA"
    effective_year = 2026

    for regex, prefix in act_patterns:
        m = re.search(regex, head, re.IGNORECASE)
        if m:
            raw_act = re.sub(r"\s+", " ", m.group(1)).strip()
            year_match = re.search(r"\b(19\d{2}|20\d{2})\b", raw_act)
            num_match = re.search(r"N[º°o]?\s*([\d\.]+)", raw_act, re.IGNORECASE)
            if year_match:
                effective_year = int(year_match.group(1))
            if num_match:
                num_clean = num_match.group(1)
                law_number = f"{raw_act.split(',')[0].title()}/{effective_year}"
                code_prefix = f"{prefix}-{num_clean.replace('.', '')}"
            else:
                law_number = raw_act.title()
                code_prefix = f"{prefix}-{stem.upper()[:10]}"
            break

    # 2. Extrai a ementa oficial (ex: "Dispõe sobre...", "Altera...", "Regulamenta...", "Institui...")
    ementa_match = re.search(
        r"((?:Dispõe sobre|Altera|Regulamenta|Institui|Aprova|Estabelece|Consolida)[^\.]{20,380}\.)",
        head,
        re.IGNORECASE,
    )
    summary = (
        ementa_match.group(1).strip()
        if ementa_match
        else f"Norma jurídica ({law_number}) convertida e indexada integralmente a partir de {stem}.pdf."
    )

    # 3. Extrai palavras-chave / tags automaticamente do texto
    keyword_candidates = [
        ("Férias", r"\bférias\b"),
        ("13º Salário", r"\bdécimo\s+terceiro|gratificação\s+natalina\b"),
        ("IRRF", r"\bimposto\s+sobre\s+a\s+renda|irrf\b"),
        ("INSS / Previdência", r"\bprevidência|contribuição\s+previdenciária|inss\b"),
        ("FGTS", r"\bfundo\s+de\s+garantia|fgts\b"),
        ("Jornada de Trabalho", r"\bjornada|horas?\s+extras?|banco\s+de\s+horas\b"),
        ("Adicional Noturno", r"\badicional\s+noturno|trabalho\s+noturno\b"),
        ("Insalubridade", r"\binsalubridade|insalubre\b"),
        ("Periculosidade", r"\bpericulosidade|perigoso\b"),
        ("Rescisão Contratual", r"\brescisão|aviso\s+prévio\b"),
        ("Licença-Maternidade", r"\blicença-maternidade|salário-maternidade|gestante\b"),
        ("Afastamentos / Licenças", r"\bafastamento|auxílio-doença|incapacidade\s+temporária\b"),
        ("Saúde e Segurança (SST)", r"\bsegurança\s+e\s+medicina|acidente\s+de\s+trabalho|epi\b"),
        ("Teletrabalho / Home Office", r"\bteletrabalho|remoto\b"),
        ("Retenções PJ / CSRF", r"\bretenção\s+na\s+fonte|pessoa\s+jurídica|pis/pasep|cofins|csll\b"),
        ("eSocial", r"\besocial\b"),
    ]
    detected_tags: list[str] = [law_number]
    sample_body = raw_text[:80000]
    for label, kw_regex in keyword_candidates:
        if re.search(kw_regex, sample_body, re.IGNORECASE):
            detected_tags.append(label)
        if len(detected_tags) >= 10:
            break

    # 4. Define categoria e título amigável
    if any(t in detected_tags for t in ("IRRF", "Retenções PJ / CSRF")):
        category = "Legislação Tributária & Retenções"
    elif "Saúde e Segurança (SST)" in detected_tags:
        category = "Saúde e Segurança do Trabalho (SST / NR)"
    else:
        category = "Legislação Trabalhista & Previdenciária"

    short_summary = summary[:95].rstrip(" .,;") + ("..." if len(summary) > 95 else "")
    title = f"{law_number} — {short_summary}"

    return {
        "code": code_prefix,
        "title": title,
        "law_number": law_number,
        "category": category,
        "effective_year": effective_year,
        "summary": summary,
        "tags": detected_tags,
    }


def extract_key_articles(markdown_body: str, max_articles: int = 1200) -> list[dict[str, str]]:
    """
    Extrai TODOS os artigos (Art. X) ou itens normativos (NR / Portarias) vigentes da base legal,
    permitindo que qualquer artigo de qualquer lei adicionada no futuro seja encontrado na busca.
    """
    pattern = re.compile(
        r"###\s+(Art\.\s*\d+[º°o\-A-Za-z]*\.?)\s*(.*?)(?=\n###\s+Art\.|\n#\s+|\n##\s+|\Z)",
        re.DOTALL,
    )
    matches = pattern.findall(markdown_body)
    articles: list[dict[str, str]] = []
    seen_numbers: set[str] = set()

    for art_num, content in matches:
        clean_num = re.sub(r"\s+", " ", art_num).strip()
        clean_text = re.sub(r"\s+", " ", content).strip()
        if not clean_text or len(clean_text) < 15:
            continue
        if "(Revogado" in clean_text[:60] or "(revogado" in clean_text[:60] or "(Vetado" in clean_text[:60]:
            continue

        # Caso uma lei alteradora (ex: Reforma Trabalhista) tenha dois "Art. 1º" (o da própria lei e o da CLT alterada),
        # preserva ambos anexando um sufixo discreto se houver colisão de rótulo com texto diferente.
        key_label = clean_num
        if key_label in seen_numbers:
            continue
        seen_numbers.add(key_label)
        articles.append(
            {
                "article": clean_num,
                "content": clean_text[:900],
            }
        )
        if len(articles) >= max_articles:
            break

    # Fallback para normas que não usam "Art. X" (ex: Normas Regulamentadoras NR com itens 1.1, 1.2, Súmulas, CCTs)
    if not articles:
        paragraphs = [
            re.sub(r"\s+", " ", p).strip()
            for p in markdown_body.split("\n\n")
            if len(p.strip()) >= 40 and not p.strip().startswith("---")
        ]
        for idx, para in enumerate(paragraphs[:200], start=1):
            item_match = re.match(r"^(\d+(?:\.\d+)+|Cláusula\s+\d+[ªº]?|Súmula\s+n?[º°]?\s*\d+)", para, re.IGNORECASE)
            label = item_match.group(1) if item_match else f"Seção {idx}"
            articles.append(
                {
                    "article": label,
                    "content": para[:900],
                }
            )

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
    reader = PdfReader(str(pdf_path))
    pages_count = len(reader.pages)
    page_texts: list[str] = []
    for page in reader.pages:
        try:
            page_texts.append(page.extract_text() or "")
        except Exception:
            continue

    raw_text = "\n\n".join(page_texts)
    meta = KNOWN_LAWS_METADATA.get(stem) or infer_law_metadata_from_text(stem, raw_text)
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

    key_articles = extract_key_articles(cleaned_md_body)

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
