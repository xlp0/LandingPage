#!/bin/bash

# TikZ to SVG Converter
# Converts all .tex files in this directory to SVG using LaTeX + pdf2svg

echo "=== TikZ to SVG Converter ==="
echo ""

# Check if pdflatex is installed
if ! command -v pdflatex &> /dev/null; then
    echo "❌ Error: pdflatex not found"
    echo "Please install LaTeX (e.g., MacTeX, TeX Live, or MiKTeX)"
    echo ""
    echo "On Mac: brew install --cask mactex-no-gui"
    echo "Or download from: https://www.tug.org/mactex/"
    exit 1
fi

# Check if pdf2svg is installed
if ! command -v pdf2svg &> /dev/null; then
    echo "❌ Error: pdf2svg not found"
    echo "Please install pdf2svg for proper TikZ arrow rendering"
    echo ""
    echo "On Mac: brew install pdf2svg"
    exit 1
fi

echo "✓ pdflatex found: $(which pdflatex)"
echo "✓ pdf2svg found: $(which pdf2svg)"
echo ""

# Count .tex files
tex_files=(*.tex)
total_files=${#tex_files[@]}

if [ $total_files -eq 0 ]; then
    echo "No .tex files found in current directory"
    exit 0
fi

echo "Found $total_files .tex file(s) to convert"
echo ""

# Convert each .tex file
success_count=0
for texfile in *.tex; do
    if [ -f "$texfile" ]; then
        basename="${texfile%.tex}"
        echo "Processing: $texfile"
        
        # Compile to PDF
        if pdflatex -interaction=nonstopmode -halt-on-error "$texfile" > /dev/null 2>&1; then
            # Convert PDF to SVG (preserves TikZ arrows perfectly)
            if pdf2svg "$basename.pdf" "$basename.svg" > /dev/null 2>&1; then
                echo "  ✓ Generated: $basename.svg"
                success_count=$((success_count + 1))
                
                # Clean up intermediate files
                rm -f "$basename.aux" "$basename.log" "$basename.pdf"
            else
                echo "  ✗ Failed to convert to SVG"
            fi
        else
            echo "  ✗ PDFLaTeX compilation failed"
        fi
    fi
done

echo ""
echo "=== Conversion Complete ==="
echo "Successfully converted: $success_count / $total_files files"
echo ""

if [ $success_count -gt 0 ]; then
    echo "SVG files created:"
    ls -1 *.svg 2>/dev/null | while read svg; do
        size=$(du -h "$svg" | cut -f1)
        echo "  - $svg ($size)"
    done
fi
