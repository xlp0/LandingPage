import re
import subprocess
import os
from pathlib import Path
from datetime import datetime
import shutil
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

# Get paths from environment variables
MARKDOWN_DIR = Path(os.getenv('MARKDOWN_DIR'))
LATEX_DIR = Path(os.getenv('LATEX_DIR'))
PDF_DIR = Path(os.getenv('PDF_DIR'))

# Buat folder output jika belum ada
LATEX_DIR.mkdir(parents=True, exist_ok=True)
PDF_DIR.mkdir(parents=True, exist_ok=True)

# Cari file Markdown terbaru berdasarkan format "YYYY-MM-DD.md"
def get_latest_markdown_file(directory):
    md_files = list(directory.glob("*.md"))
    latest_file = None
    latest_date = None

    for file in md_files:
        match = re.match(r"(\d{4}-\d{2}-\d{2})\.md", file.name)
        if match:
            file_date = datetime.strptime(match.group(1), "%Y-%m-%d")
            if latest_date is None or file_date > latest_date:
                latest_date = file_date
                latest_file = file

    return latest_file

MARKDOWN_FILE = get_latest_markdown_file(MARKDOWN_DIR)

if not MARKDOWN_FILE:
    raise FileNotFoundError("Tidak ada file Markdown dengan format YYYY-MM-DD.md ditemukan di folder.")

print(f"Using Markdown file: {MARKDOWN_FILE}")

# Nama file output sama dengan Markdown tapi dengan ekstensi .tex dan .pdf
file_stem = MARKDOWN_FILE.stem
OUTPUT_TEX = LATEX_DIR / f"{file_stem}.tex"
OUTPUT_PDF = PDF_DIR / f"{file_stem}.pdf"

# Baca konten markdown
with open(MARKDOWN_FILE, "r", encoding="utf-8") as f:
    md_content = f.read()

# --- Fungsi untuk konversi Markdown ke LaTeX ---
def markdown_to_latex(text: str) -> str:
    # Bold: **text** -> \textbf{text}
    text = re.sub(r"\*\*(.+?)\*\*", r"\\textbf{\1}", text)

    # Italic: *text* -> \textit{text}
    text = re.sub(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", r"\\textit{\1}", text)

    # Inline code: `code` -> \texttt{code}
    text = re.sub(r"`(.+?)`", r"\\texttt{\1}", text)

    return text

# Ekstrak Title, Author, Date
title_match = re.search(r"#\s*(Daily Report\s*-\s*[\d\-]+)", md_content)
title = title_match.group(1) if title_match else "Daily Report"

author_match = re.search(r"\*\*Author:\*\*\s*(.+)", md_content)
author = author_match.group(1).strip() if author_match else "Unknown Author"

date_match = re.search(r"\*\*Date:\*\*\s*([\d\-]+)", md_content)
date = date_match.group(1).strip() if date_match else "Unknown Date"

# Ekstrak Section with nested list support
def extract_section(section_name, is_list=True):
    pattern = rf"##\s*{section_name}\n([\s\S]*?)(?=\n##|$)"
    match = re.search(pattern, md_content)
    if match:
        content = match.group(1).strip()
        if is_list:
            return process_nested_list(content)
        else:
            # For non-list sections like Conclusion, just return the content as paragraph
            return markdown_to_latex(content)
    return ""

def process_nested_list(content: str) -> str:
    """Process markdown list with nested items into LaTeX format"""
    lines = content.split('\n')
    latex_lines = []
    in_sublist = False
    
    for line in lines:
        # Check for main list item (starts with "- " with no leading spaces)
        main_item_match = re.match(r'^-\s+(.+)$', line)
        # Check for sublist item (starts with "  - " with 2 or more leading spaces)
        sub_item_match = re.match(r'^(\s{2,})-\s+(.+)$', line)
        
        if main_item_match:
            # Close previous sublist if open
            if in_sublist:
                latex_lines.append("  \\end{itemize}")
                in_sublist = False
            
            # Add main list item
            item_text = markdown_to_latex(main_item_match.group(1))
            latex_lines.append(f"  \\item {item_text}")
            
        elif sub_item_match:
            # Open sublist if not already open
            if not in_sublist:
                latex_lines.append("  \\begin{itemize}")
                in_sublist = True
            
            # Add sublist item
            item_text = markdown_to_latex(sub_item_match.group(2))
            latex_lines.append(f"    \\item {item_text}")
    
    # Close sublist if still open at the end
    if in_sublist:
        latex_lines.append("  \\end{itemize}")
    
    return "\n".join(latex_lines)

summary_items = extract_section("Summary")
suggestions_items = extract_section("Suggestions")
critique_items = extract_section("Critique")
conclusion_text = extract_section("Conclusion", is_list=False)

# Template LaTeX
latex_template = rf"""
\documentclass[10pt,a4paper]{{article}}
\usepackage[utf8]{{inputenc}}
\usepackage[T1]{{fontenc}}
\usepackage{{lmodern}}
\usepackage{{microtype}}
\usepackage{{graphicx}}
\usepackage[dvipsnames]{{xcolor}}
\usepackage{{enumitem}}
\usepackage{{titlesec}}
\usepackage[margin=0.5in]{{geometry}}
\usepackage{{multicol}}
\usepackage{{fancyhdr}}
\usepackage{{hyperref}}

\definecolor{{headingcolor}}{{RGB}}{{70,130,180}}
\definecolor{{subheadingcolor}}{{RGB}}{{100,149,237}}
\definecolor{{textcolor}}{{RGB}}{{50,50,50}}

\titleformat{{\section}}{{\Large\bfseries\color{{headingcolor}}}}{{\thesection}}{{0.5em}}{{}}
\titleformat{{\subsection}}{{\large\bfseries\color{{subheadingcolor}}}}{{\thesubsection}}{{0.5em}}{{}}
\titlespacing*{{\section}}{{0pt}}{{20pt}}{{10pt}}
\setlist[itemize]{{itemsep=10pt, topsep=6pt, parsep=10pt, partopsep=2pt, leftmargin=*, label=\textbullet}}
\setlist[itemize,2]{{itemsep=5pt, topsep=3pt, parsep=5pt, partopsep=1pt, leftmargin=*, label=\textendash}}

\pagestyle{{fancy}}
\fancyhf{{}}
\renewcommand{{\headrulewidth}}{{0pt}}
\fancyfoot[C]{{\small\thepage}}

\title{{\vspace{{-1cm}}\textbf{{\LARGE{{{markdown_to_latex(title)}}}}}}}
\author{{\normalsize{{{markdown_to_latex(author)}}}}}
\date{{\normalsize{{{markdown_to_latex(date)}}}}}

\begin{{document}}
\maketitle
\vspace{{1cm}}

\begin{{multicols}}{{2}}
\section*{{Summary}}
\begin{{itemize}}\normalsize
{summary_items}
\end{{itemize}}
\end{{multicols}}

\vspace{{1cm}}
\begin{{multicols}}{{2}}
\section*{{Suggestions}}
\begin{{itemize}}\normalsize
{suggestions_items}
\end{{itemize}}
\end{{multicols}}

\vspace{{1cm}}
\begin{{multicols}}{{2}}
\section*{{Critique}}
\begin{{itemize}}\normalsize
{critique_items}
\end{{itemize}}
\end{{multicols}}

\vspace{{1cm}}
\section*{{Conclusion}}
\normalsize
{markdown_to_latex(conclusion_text)}

\end{{document}}
"""

# Simpan ke file .tex
with open(OUTPUT_TEX, "w", encoding="utf-8") as f:
    f.write(latex_template)

print(f"LaTeX file generated: {OUTPUT_TEX}")

# Compile ke PDF menggunakan pdflatex
subprocess.run(["pdflatex", "-interaction=nonstopmode", "-output-directory", str(PDF_DIR), str(OUTPUT_TEX)], check=True)

# Clean up auxiliary files (.aux, .log, .out)
aux_files = [
    PDF_DIR / f"{file_stem}.aux",
    PDF_DIR / f"{file_stem}.log", 
    PDF_DIR / f"{file_stem}.out"
]

for aux_file in aux_files:
    if aux_file.exists():
        aux_file.unlink()
        print(f"Cleaned up: {aux_file}")

print(f"PDF generated: {OUTPUT_PDF}")