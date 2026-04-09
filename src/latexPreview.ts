/**
 * Converts CV LaTeX to simplified HTML for preview.
 */
export function latexToHtml(latex: string): string {
  const bodyMatch = latex.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
  if (!bodyMatch) return '<p style="color:#888">No se pudo generar la vista previa.</p>';

  let body = bodyMatch[1];

  // Remove comments
  body = body.replace(/%.*$/gm, '');

  // Remove layout commands
  body = body.replace(/\\vspace\*?\{[^}]*\}/g, '');
  body = body.replace(/\\vfill/g, '');
  body = body.replace(/\\pagestyle\{[^}]*\}/g, '');
  body = body.replace(/\\thispagestyle\{[^}]*\}/g, '');
  body = body.replace(/\\pdfgentounicode=\d/g, '');
  body = body.replace(/\\setlength\{[^}]*\}\{[^}]*\}/g, '');
  body = body.replace(/\\addtolength\{[^}]*\}\{[^}]*\}/g, '');
  body = body.replace(/\\input\{[^}]*\}/g, '');
  body = body.replace(/\\newcommand\{[^}]*\}(?:\[\d\])?(?:\{[\s\S]*?\})?/g, '');
  body = body.replace(/\\renewcommand\{[^}]*\}(?:\[\d\])?(?:\{[\s\S]*?\})?/g, '');
  body = body.replace(/\\urlstyle\{[^}]*\}/g, '');

  // === HEADER BLOCK ===
  body = body.replace(
    /\\begin\{center\}([\s\S]*?)\\end\{center\}/g,
    (_match, inner: string) => {
      let nameHtml = '';
      // \Huge\bfseries Name or \textbf{\Huge Name}
      inner = inner.replace(
        /\{\\(?:Huge|LARGE|Large|huge)\s*\\(?:bfseries|scshape|textbf)\s+([^}]*)\}/,
        (_m: string, name: string) => {
          nameHtml = `<h1 class="cv-name">${name.trim()}</h1>`;
          return '';
        }
      );
      if (!nameHtml) {
        inner = inner.replace(
          /\\textbf\{\\(?:Huge|LARGE|Large|huge)\s*(?:\\scshape\s*)?([^}]*)\}/,
          (_m: string, name: string) => {
            nameHtml = `<h1 class="cv-name">${name.trim()}</h1>`;
            return '';
          }
        );
      }
      // Links
      inner = inner.replace(/\\href\{([^}]*)\}\{\\underline\{([^}]*)\}\}/g, '<a href="$1">$2</a>');
      inner = inner.replace(/\\href\{([^}]*)\}\{([^}]*)\}/g, '<a href="$1">$2</a>');
      inner = inner.replace(/\\underline\{([^}]*)\}/g, '$1');
      // Separators
      inner = inner.replace(/\\textbar\\/g, '|');
      inner = inner.replace(/\\textbar/g, '|');
      inner = inner.replace(/\$\|\$/g, '|');
      // Remove spacing/color commands before general cleanup
      inner = inner.replace(/\\hspace\{[^}]*\}/g, '');
      inner = inner.replace(/\\color\{[^}]*\}/g, '');
      // Cleanup
      inner = inner.replace(/\\\\(?:\[[^\]]*\])?/g, ' ');
      inner = inner.replace(/\\(?:small|normalsize|footnotesize)\b/g, '');
      inner = inner.replace(/\\[a-zA-Z]+(?:\{[^}]*\})?/g, '');
      inner = inner.replace(/[{}]/g, '');
      inner = inner.replace(/\s+/g, ' ').trim();
      return `<div class="cv-header">${nameHtml}<p class="cv-contact">${inner}</p></div>`;
    }
  );

  // === SECTIONS ===
  body = body.replace(/\\section\*?\{([^}]*)\}/g, '<h2 class="cv-section">$1</h2>');
  body = body.replace(/\\subsection\*?\{([^}]*)\}/g, '<h3>$1</h3>');

  // === ENTRY HEADINGS: \textbf{Title} \hfill Date \\ Location ===
  body = body.replace(
    /\\textbf\{([^}]*)\}\s*\\hfill\s*([^\\\n]+)\s*\\\\\s*([^\\\n]*?)(?=\s*(?:\\begin|<h2|\n\n|$))/g,
    '<div class="cv-subheading"><div class="cv-row"><strong>$1</strong><span>$2</span></div><div class="cv-row"><em>$3</em></div></div>'
  );

  // Simpler: \textbf{Title} \hfill Date (no location line)
  body = body.replace(
    /\\textbf\{([^}]*)\}\s*\\hfill\s*([^\\\n]+?)\\\\(?:\[[^\]]*\])?/g,
    '<div class="cv-subheading"><div class="cv-row"><strong>$1</strong><span>$2</span></div></div>'
  );

  // === CUSTOM RESUME COMMANDS (fallback for templates using them) ===
  body = body.replace(
    /\\resumeSubheading\s*\{([^}]*)\}\s*\{([^}]*)\}\s*\{([^}]*)\}\s*\{([^}]*)\}/g,
    '<div class="cv-subheading"><div class="cv-row"><strong>$1</strong><span>$2</span></div><div class="cv-row"><em>$3</em><em>$4</em></div></div>'
  );
  body = body.replace(
    /\\resumeProjectHeading\s*\{([^}]*)\}\s*\{([^}]*)\}/g,
    '<div class="cv-subheading"><div class="cv-row"><span>$1</span><span>$2</span></div></div>'
  );
  body = body.replace(/\\resumeItem\{([\s\S]*?)\}(?=\s*(?:\\resumeItem|\\resumeItemListEnd|\\resumeSubHeadingListEnd|\\end))/g, '<li>$1</li>');
  body = body.replace(/\\resumeItemListStart/g, '<ul class="cv-items">');
  body = body.replace(/\\resumeItemListEnd/g, '</ul>');
  body = body.replace(/\\resumeSubHeadingListStart/g, '<div class="cv-list">');
  body = body.replace(/\\resumeSubHeadingListEnd/g, '</div>');

  // === INLINE FORMATTING ===
  body = body.replace(/\\textbf\{([^}]*)\}/g, '<strong>$1</strong>');
  body = body.replace(/\\textit\{([^}]*)\}/g, '<em>$1</em>');
  body = body.replace(/\\underline\{([^}]*)\}/g, '<u>$1</u>');
  body = body.replace(/\\emph\{([^}]*)\}/g, '<em>$1</em>');
  body = body.replace(/\\textcolor\{[^}]*\}\{([^}]*)\}/g, '$1');
  body = body.replace(/\\color\{[^}]*\}/g, '');
  body = body.replace(/\\href\{([^}]*)\}\{([^}]*)\}/g, '<a href="$1">$2</a>');
  body = body.replace(/\\url\{([^}]*)\}/g, '<a href="$1">$1</a>');

  // === LIST ENVIRONMENTS ===
  body = body.replace(/\\item(?:\[[^\]]*\])?/g, '</li><li>');
  body = body.replace(/\\begin\{(?:itemize|enumerate)\}(?:\[[^\]]*\])?/g, '<ul class="cv-items">');
  body = body.replace(/\\end\{(?:itemize|enumerate)\}/g, '</li></ul>');
  body = body.replace(/<ul class="cv-items">\s*<\/li>/g, '<ul class="cv-items">');

  // === REMAINING ENVIRONMENTS ===
  body = body.replace(/\\begin\{[^}]*\}(?:\[[^\]]*\])?(?:\{[^}]*\})?/g, '');
  body = body.replace(/\\end\{[^}]*\}/g, '');

  // Spacing and color commands
  body = body.replace(/\\hspace\{[^}]*\}/g, '');
  body = body.replace(/\\color\{[^}]*\}/g, '');

  // Line breaks
  body = body.replace(/\\\\(?:\[[^\]]*\])?/g, '<br>');
  body = body.replace(/\\hfill/g, '');

  // Separators and special chars
  body = body.replace(/\\textbar\\/g, '|');
  body = body.replace(/\\textbar/g, '|');
  body = body.replace(/\$\|\$/g, '|');
  body = body.replace(/~/g, ' ');
  body = body.replace(/\\&/g, '&amp;');
  body = body.replace(/\\#/g, '#');
  body = body.replace(/\\%/g, '%');
  body = body.replace(/\\\$/g, '$');
  body = body.replace(/\\'\{?\\?i\}?a/g, 'ía');
  body = body.replace(/\\'/g, "'");
  body = body.replace(/---/g, '—');
  body = body.replace(/--/g, '–');

  // === CLEANUP ===
  body = body.replace(/\\(?:small|footnotesize|tiny|large|Large|LARGE|huge|Huge|normalsize|scshape|bfseries|itshape|mdseries|upshape|sffamily|rmfamily|ttfamily|MakeUppercase)\b/g, '');
  body = body.replace(/\\(?:hfill|noindent|centering|raggedright|raggedleft|newline|newpage|clearpage|par)\b/g, '');
  body = body.replace(/\\(?:medskip|bigskip|smallskip)\b/g, '');
  body = body.replace(/\\textbullet/g, '');

  // Remove remaining commands, keep content
  body = body.replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?\{([^}]*)\}/g, '$1');
  body = body.replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?/g, '');

  // Clean braces and whitespace
  body = body.replace(/[{}]/g, '');
  body = body.replace(/<li>\s*<\/li>/g, '');
  body = body.replace(/(<br>\s*){3,}/g, '<br><br>');
  body = body.replace(/\n{3,}/g, '\n\n');

  return body.trim();
}
