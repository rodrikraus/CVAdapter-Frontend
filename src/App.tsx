import { useState, useEffect, type ChangeEvent } from 'react';
import './App.css';
import type { CvRequest, CvResponse } from './types.ts';
import { latexToHtml } from './latexPreview.ts';
import { API } from './env.ts';
import translations, { type Lang } from './i18n.ts';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const App: React.FC = () => {
  const [lang, setLang] = useState<Lang>('en');
  const t = translations[lang];
  const [page, setPage] = useState<'form' | 'result'>('form');

  const [cvMode, setCvMode] = useState<'pdf' | 'text' | 'latex' | null>(null);
  const [displayMode, setDisplayMode] = useState<'pdf' | 'text' | 'latex' | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<CvRequest>({
    cv: '',
    jobOffer: ''
  });
  const [optimizedCv, setOptimizedCv] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('preview');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState<boolean>(false);
  const [funnyMessage, setFunnyMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (loading) {
      setProgress(0);
      setShowPopup(true);
      setFunnyMessage(t.funnyMessages[Math.floor(Math.random() * t.funnyMessages.length)]);

      const msgInterval = setInterval(() => {
        setFunnyMessage(t.funnyMessages[Math.floor(Math.random() * t.funnyMessages.length)]);
      }, 3000);

      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          const remaining = 90 - prev;
          return prev + remaining * 0.04;
        });
      }, 200);

      return () => {
        clearInterval(msgInterval);
        clearInterval(progressInterval);
      };
    } else if (showPopup) {
      setProgress(100);
      const timeout = setTimeout(() => setShowPopup(false), 800);
      return () => clearTimeout(timeout);
    }
  }, [loading, t]);

  useEffect(() => {
    if (cvMode) {
      setDisplayMode(cvMode);
    } else {
      const timeout = setTimeout(() => setDisplayMode(null), 400);
      return () => clearTimeout(timeout);
    }
  }, [cvMode]);

  // Manejador tipado para los textareas
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      const response = await fetch(API+'/api/cv/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latexContent: optimizedCv }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cv-optimizado.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.pdfError);
    } finally {
      setPdfLoading(false);
    }
  };

  const isValidLatex = (text: string): boolean => {
    const trimmed = text.trim();
    const hasDocumentclass = /\\documentclass[\s{[\]]/.test(trimmed);
    const hasBeginDocument = /\\begin\s*\{document\}/.test(trimmed);
    const hasEndDocument = /\\end\s*\{document\}/.test(trimmed);
    return hasDocumentclass && hasBeginDocument && hasEndDocument;
  };

  const [pdfExtracting, setPdfExtracting] = useState(false);

  const handlePdfFile = async (file: File) => {
    if (file.type !== 'application/pdf') return;
    setPdfFile(file);
    setPdfExtracting(true);
    setFormData(prev => ({ ...prev, cv: '' }));

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pages: string[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const text = content.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ');
        pages.push(text);
      }

      const fullText = pages.join('\n\n');
      if (!fullText.trim()) throw new Error('empty');
      setFormData(prev => ({ ...prev, cv: fullText }));
    } catch (err) {
      console.error('PDF extraction error:', err);
      setError(t.pdfExtractError);
      setPdfFile(null);
    } finally {
      setPdfExtracting(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handlePdfFile(file);
  };

  const selectMode = (mode: 'pdf' | 'text' | 'latex') => {
    if (cvMode === mode) return;
    setCvMode(mode);
    setPdfFile(null);
    setFormData(prev => ({ ...prev, cv: '' }));
  };

  const handleOptimize = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (cvMode === 'latex' && !isValidLatex(formData.cv)) {
      setError(t.invalidLatex);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(API+'/api/cv/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`${t.serverError}: ${response.statusText}`);
      }

      const data: CvResponse = await response.json();
      if (!isValidLatex(data.optimizedCv)) {
        throw new Error(t.invalidResponse);
      }
      setOptimizedCv(data.optimizedCv);
      setPage('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : t.unknownError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <nav className="navbar">
        <span className="navbar-brand">{t.title}</span>
        <div className="navbar-links">
          <button
            className={`nav-link ${page === 'form' ? 'active' : ''}`}
            onClick={() => setPage('form')}
          >
            {t.navOptimize}
          </button>
          <button
            className={`nav-link ${page === 'result' ? 'active' : ''}`}
            onClick={() => setPage('result')}
          >
            {t.navResult}
          </button>
        </div>
        <div
          className="lang-switch"
          onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
        >
          <span className={`lang-option ${lang === 'en' ? 'active' : ''}`}>EN</span>
          <span className={`lang-option ${lang === 'es' ? 'active' : ''}`}>ES</span>
          <div className={`lang-slider ${lang === 'es' ? 'right' : ''}`} />
        </div>
      </nav>

      {(loading || showPopup) && (
        <div className="loading-overlay">
          <div className="loading-popup">
            <div className="loading-spinner" />
            <p className="loading-percent">{Math.round(progress)}%</p>
            <div className="loading-bar">
              <div className="loading-bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <p className="loading-message">
              {progress >= 100 ? t.done : funnyMessage}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="loading-overlay" onClick={() => setError(null)}>
          <div className="loading-popup error-popup" onClick={(e) => e.stopPropagation()}>
            <div className="error-icon">!</div>
            <p className="error-title">Error</p>
            <p className="error-text">{error}</p>
            <button className="error-close-btn" onClick={() => setError(null)}>
              {t.back}
            </button>
          </div>
        </div>
      )}

      {page === 'form' ? (
        <div className="container">
          <header>
            <h1>{t.title}</h1>
            <p>{t.subtitle}</p>
          </header>

          <main>
            <form onSubmit={handleOptimize} className="form-container">
              <div className="input-group">
                <div className="step-label">
                  <span className="step-number">1</span>
                  <span className="step-text">{t.step1Label}</span>
                </div>
                <div className="cv-mode-selector">
                  <button
                    type="button"
                    className={`cv-mode-btn ${cvMode === 'pdf' ? 'active' : ''}`}
                    onClick={() => selectMode('pdf')}
                  >
                    {t.modePdf}
                  </button>
                  <button
                    type="button"
                    className={`cv-mode-btn ${cvMode === 'text' ? 'active' : ''}`}
                    onClick={() => selectMode('text')}
                  >
                    {t.modeText}
                  </button>
                  <button
                    type="button"
                    className={`cv-mode-btn ${cvMode === 'latex' ? 'active' : ''}`}
                    onClick={() => selectMode('latex')}
                  >
                    {t.modeLatex}
                  </button>
                </div>

                <div className={`step-content ${cvMode ? 'step-content-visible' : ''}`}>
                  <div>
                    {displayMode === 'pdf' && (
                      <div
                        className="pdf-dropzone"
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                        onClick={() => document.getElementById('pdf-input')?.click()}
                      >
                        <input
                          id="pdf-input"
                          type="file"
                          accept=".pdf"
                          hidden
                          onChange={(e) => { if (e.target.files?.[0]) handlePdfFile(e.target.files[0]); }}
                        />
                        {pdfExtracting
                          ? <p className="pdf-extracting">{t.pdfExtracting}</p>
                          : pdfFile
                            ? <p className="pdf-filename">{t.pdfSelected} <strong>{pdfFile.name}</strong></p>
                            : <p>{t.pdfDrop}</p>
                        }
                      </div>
                    )}

                    {displayMode === 'text' && (
                      <textarea
                        id="cv"
                        name="cv"
                        rows={10}
                        value={formData.cv}
                        onChange={(e) => { e.target.setCustomValidity(''); handleChange(e); }}
                        onInvalid={(e) => (e.target as HTMLTextAreaElement).setCustomValidity(t.requiredField)}
                        required
                        placeholder={t.textPlaceholder}
                      />
                    )}

                    {displayMode === 'latex' && (
                      <textarea
                        id="cv"
                        name="cv"
                        rows={10}
                        value={formData.cv}
                        onChange={(e) => { e.target.setCustomValidity(''); handleChange(e); }}
                        onInvalid={(e) => (e.target as HTMLTextAreaElement).setCustomValidity(t.requiredField)}
                        required
                        placeholder={t.cvPlaceholder}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className={`input-group step-reveal ${formData.cv ? 'step-visible' : ''}`}>
                <div className="step-label">
                  <span className={`step-number ${!formData.cv ? 'inactive' : ''}`}>2</span>
                  <span className="step-text">{t.step2Label}</span>
                </div>
                <div className="step-content">
                  <textarea
                    id="jobOffer"
                    name="jobOffer"
                    rows={10}
                    value={formData.jobOffer}
                    onChange={(e) => { e.target.setCustomValidity(''); handleChange(e); }}
                    onInvalid={(e) => (e.target as HTMLTextAreaElement).setCustomValidity(t.requiredField)}
                    required
                    disabled={!formData.cv}
                    placeholder={t.jobPlaceholder}
                  />
                </div>
              </div>

              <div className={`input-group ${!formData.cv || !formData.jobOffer ? 'step-disabled' : ''}`}>
                <div className="step-label">
                  <span className={`step-number ${!formData.cv || !formData.jobOffer ? 'inactive' : ''}`}>3</span>
                  <span className="step-text">{t.step3Label}</span>
                </div>
                <button type="submit" disabled={loading || !formData.cv || !formData.jobOffer} className="submit-btn">
                  {loading ? t.processing : t.optimizeBtn}
                </button>
              </div>
            </form>

          </main>
        </div>
      ) : optimizedCv ? (
        <div className="result-page">
          <div className="result-header">
            <h2>{t.resultTitle}</h2>
            <div className="result-header-actions">
              <div className="result-tabs">
                <button
                  className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('preview')}
                >
                  {t.preview}
                </button>
                <button
                  className={`tab-btn ${activeTab === 'editor' ? 'active' : ''}`}
                  onClick={() => setActiveTab('editor')}
                >
                  {t.latexEditor}
                </button>
              </div>
            </div>
          </div>

          <div className="result-panels">
            {activeTab === 'editor' ? (
              <textarea
                className="latex-editor"
                value={optimizedCv}
                onChange={(e) => setOptimizedCv(e.target.value)}
                spellCheck={false}
              />
            ) : (
              <div
                className="cv-preview"
                dangerouslySetInnerHTML={{ __html: latexToHtml(optimizedCv) }}
              />
            )}
          </div>

          <div className="result-actions">
            <button
              onClick={() => navigator.clipboard.writeText(optimizedCv)}
              className="copy-btn"
            >
              {t.copyLatex}
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={pdfLoading}
              className="download-btn"
            >
              {pdfLoading ? t.generatingPdf : t.downloadPdf}
            </button>
          </div>
        </div>
      ) : (
        <div className="empty-result">
          <p>{t.emptyResult}</p>
        </div>
      )}

      <footer className="footer">
        <div className="footer-content">
          <span className="footer-made">{t.footerMade}</span>
          <div className="footer-socials">
            <a href="https://github.com/rodrikraus" target="_blank" rel="noopener noreferrer" className="footer-social" aria-label="GitHub">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            </a>
            <a href="https://www.linkedin.com/in/rodrigo-kraus-810872213/" target="_blank" rel="noopener noreferrer" className="footer-social" aria-label="LinkedIn">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>
            <a href="https://rodrigokraus-portfolio.netlify.app/" target="_blank" rel="noopener noreferrer" className="footer-social" aria-label="Portfolio">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
            </a>
          </div>
          <div className="footer-support">
            <span className="footer-support-text">{t.footerSupport}</span>
            <a
              href="https://ko-fi.com/rodrigokraus"
              target="_blank"
              rel="noopener noreferrer"
              className="kofi-btn"
            >
              <img src="https://storage.ko-fi.com/cdn/cup-border.png" alt="Ko-fi" className="kofi-icon" />
              Ko-fi
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}

export default App;