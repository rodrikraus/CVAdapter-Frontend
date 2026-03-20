/**
 * Converts the CV LaTeX template to simplified HTML for preview.
 * Handles the specific commands used in the resume template.
 */
export function latexToHtml(latex: string): string {
  const bodyMatch = latex.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
  if (!bodyMatch) return '<p style="color:#888">No se pudo generar la vista previa.</p>';

  let body = bodyMatch[1];

  // Remove comments
  body = body.replace(/%.*$/gm, '');

  // Remove layout commands
  body = body.replace(/\\vspace\{[^}]*\}/g, '');
  body = body.replace(/\\vfill/g, '');
  body = body.replace(/\\pagestyle\{[^}]*\}/g, '');
  body = body.replace(/\\pdfgentounicode=\d/g, '');
  body = body.replace(/\\setlength\{[^}]*\}\{[^}]*\}/g, '');
  body = body.replace(/\\input\{[^}]*\}/g, '');

  // === HEADER BLOCK ===
  body = body.replace(
    /\\begin\{center\}([\s\S]*?)\\end\{center\}/g,
    (_match, inner: string) => {
      let nameHtml = '';
      inner = inner.replace(
        /\\textbf\{\\Huge\s*\\scshape\s*([^}]*)\}/,
        (_m: string, name: string) => {
          nameHtml = `<h1 class="cv-name">${name.trim()}</h1>`;
          return '';
        }
      );
      // Process \href{\underline{text}} → <a>text</a>
      inner = inner.replace(
        /\\href\{([^}]*)\}\{\\underline\{([^}]*)\}\}/g,
        '<a href="$1">$2</a>'
      );
      inner = inner.replace(/\\href\{([^}]*)\}\{([^}]*)\}/g, '<a href="$1">$2</a>');
      inner = inner.replace(/\\underline\{([^}]*)\}/g, '$1');
      inner = inner.replace(/\$\|\$/g, '|');
      inner = inner.replace(/\\small\b/g, '');
      inner = inner.replace(/\\\\/g, '');
      inner = inner.replace(/\\[a-zA-Z]+/g, '');
      inner = inner.replace(/[{}]/g, '');
      // Collapse whitespace, trim
      inner = inner.replace(/\s+/g, ' ').trim();
      return `<div class="cv-header">${nameHtml}<p class="cv-contact">${inner}</p></div>`;
    }
  );

  // === SECTIONS ===
  body = body.replace(/\\section\{([^}]*)\}/g, '<h2 class="cv-section">$1</h2>');

  // === SUBHEADINGS ===
  body = body.replace(
    /\\resumeSubheading\s*\{([^}]*)\}\s*\{([^}]*)\}\s*\{([^}]*)\}\s*\{([^}]*)\}/g,
    '<div class="cv-subheading"><div class="cv-row"><strong>$1</strong><span>$2</span></div><div class="cv-row"><em>$3</em><em>$4</em></div></div>'
  );

  body = body.replace(
    /\\resumeProjectHeading\s*\{([^}]*)\}\s*\{([^}]*)\}/g,
    '<div class="cv-subheading"><div class="cv-row"><span>$1</span><span>$2</span></div></div>'
  );

  // === LIST ITEMS ===
  // \resumeItem{content} - greedy match for nested braces
  body = body.replace(/\\resumeItem\{([\s\S]*?)\}(?=\s*(?:\\resumeItem|\\resumeItemListEnd|\\resumeSubHeadingListEnd|\\end))/g, '<li>$1</li>');

  // List environments
  body = body.replace(/\\resumeItemListStart/g, '<ul class="cv-items">');
  body = body.replace(/\\resumeItemListEnd/g, '</ul>');
  body = body.replace(/\\resumeSubHeadingListStart/g, '<div class="cv-list">');
  body = body.replace(/\\resumeSubHeadingListEnd/g, '</div>');

  // === SKILLS SECTION ===
  // \begin{itemize}[leftmargin=0.15in, label={}] \small{\item{...}}  \end{itemize}
  body = body.replace(
    /\\begin\{itemize\}\[leftmargin=0\.15in,\s*label=\{\}\]\s*\\small\{\s*\\item\{([\s\S]*?)\}\s*\}\s*\\end\{itemize\}/g,
    '<div class="cv-skills">$1</div>'
  );

  // Fallback for remaining itemize
  body = body.replace(/\\begin\{itemize\}/g, '<ul class="cv-items">');
  body = body.replace(/\\end\{itemize\}/g, '</ul>');

  // === INLINE FORMATTING ===
  body = body.replace(/\\textbf\{([^}]*)\}/g, '<strong>$1</strong>');
  body = body.replace(/\\textit\{([^}]*)\}/g, '<em>$1</em>');
  body = body.replace(/\\underline\{([^}]*)\}/g, '<u>$1</u>');
  body = body.replace(/\\emph\{([^}]*)\}/g, '<em>$1</em>');
  body = body.replace(/\\textcolor\{[^}]*\}\{([^}]*)\}/g, '$1');
  body = body.replace(/\\href\{([^}]*)\}\{([^}]*)\}/g, '<a href="$1">$2</a>');

  // Line breaks
  body = body.replace(/\\\\/g, '<br>');

  // $|$ separators
  body = body.replace(/\$\|\$/g, '|');

  // === CLEANUP ===
  body = body.replace(/\\(?:small|footnotesize|tiny|large|Large|huge|Huge|normalsize|scshape)\b/g, '');
  body = body.replace(/\\(?:hfill|noindent|centering|raggedright|raggedleft)\b/g, '');
  body = body.replace(/\\begin\{[^}]*\}(?:\[[^\]]*\])?/g, '');
  body = body.replace(/\\end\{[^}]*\}/g, '');

  // Remove remaining commands, keep content
  body = body.replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?\{([^}]*)\}/g, '$1');
  body = body.replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?/g, '');

  // Clean braces and extra whitespace
  body = body.replace(/[{}]/g, '');
  body = body.replace(/\n{3,}/g, '\n\n');

  return body.trim();
}
