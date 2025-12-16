#!/usr/bin/env python3
"""
Convert Markdown reports to LaTeX and then to PDF for each user.
"""
import re
import subprocess
import os
import sys
from pathlib import Path

def markdown_to_latex(text: str) -> str:
    """Convert markdown formatting to LaTeX."""
    # Bold: **text** -> \textbf{text}
    text = re.sub(r"\*\*(.+?)\*\*", r"\\textbf{\1}", text)
    
    # Italic: *text* -> \textit{text}
    text = re.sub(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", r"\\textit{\1}", text)
    
    # Inline code: `code` -> \texttt{code}
    text = re.sub(r"`(.+?)`", r"\\texttt{\1}", text)
    
    # Escape special LaTeX characters
    text = text.replace('&', '\\&')
    text = text.replace('%', '\\%')
    text = text.replace('$', '\\$')
    text = text.replace('#', '\\#')
    text = text.replace('_', '\\_')
    
    return text

def process_nested_list(content: str) -> str:
    """Process markdown list with nested items into LaTeX format."""
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

def extract_section(md_content, section_name, is_list=True):
    """Extract a section from markdown content."""
    pattern = rf"##\s*{section_name}\n([\s\S]*?)(?=\n##|$)"
    match = re.search(pattern, md_content)
    if match:
        content = match.group(1).strip()
        if is_list:
            return process_nested_list(content)
        else:
            # For non-list sections like Conclusion
            return markdown_to_latex(content)
    return ""

def convert_markdown_to_pdf(markdown_file):
    """Convert a markdown file to LaTeX and then to PDF."""
    markdown_path = Path(markdown_file)
    
    if not markdown_path.exists():
        print(f"Error: Markdown file not found: {markdown_file}")
        return None
    
    print(f"Converting {markdown_path.name} to PDF...")
    
    # Read markdown content
    with open(markdown_path, 'r', encoding='utf-8') as f:
        md_content = f.read()
    
    # Extract metadata
    title_match = re.search(r"#\s*(Daily Report\s*-\s*[\d\-]+)", md_content)
    title = title_match.group(1) if title_match else "Daily Report"
    
    author_match = re.search(r"\*\*Author:\*\*\s*(.+)", md_content)
    author = author_match.group(1).strip() if author_match else "Unknown Author"
    
    date_match = re.search(r"\*\*Date:\*\*\s*([\d\-]+)", md_content)
    date = date_match.group(1).strip() if date_match else "Unknown Date"
    
    # Extract sections
    summary_items = extract_section(md_content, "Summary")
    suggestions_items = extract_section(md_content, "Suggestions")
    critique_items = extract_section(md_content, "Critique")
    conclusion_text = extract_section(md_content, "Conclusion", is_list=False)
    
    # Generate LaTeX content
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
    
    # Create output directory
    output_dir = markdown_path.parent
    file_stem = markdown_path.stem
    
    # Save LaTeX file
    latex_file = output_dir / f"{file_stem}.tex"
    with open(latex_file, 'w', encoding='utf-8') as f:
        f.write(latex_template)
    
    print(f"LaTeX file generated: {latex_file}")
    
    # Compile to PDF
    try:
        subprocess.run(
            ["pdflatex", "-interaction=nonstopmode", "-output-directory", str(output_dir), str(latex_file)],
            check=True,
            capture_output=True
        )
        
        pdf_file = output_dir / f"{file_stem}.pdf"
        
        # Clean up auxiliary files
        aux_files = [
            output_dir / f"{file_stem}.aux",
            output_dir / f"{file_stem}.log",
            output_dir / f"{file_stem}.out"
        ]
        
        for aux_file in aux_files:
            if aux_file.exists():
                aux_file.unlink()
        
        print(f"PDF generated: {pdf_file}")
        return str(pdf_file)
        
    except subprocess.CalledProcessError as e:
        print(f"Error compiling PDF: {e}")
        return None

def main():
    if len(sys.argv) < 2:
        print("Usage: convert_to_pdf.py <markdown_file1> [markdown_file2] ...")
        sys.exit(1)
    
    results = {}
    
    for markdown_file in sys.argv[1:]:
        pdf_file = convert_markdown_to_pdf(markdown_file)
        results[markdown_file] = pdf_file
    
    # Save results
    import json
    results_file = Path('daily-reports') / 'pdf_conversion_results.json'
    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\nConversion results saved to: {results_file}")

if __name__ == '__main__':
    main()
