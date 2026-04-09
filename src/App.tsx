import { useState, useEffect, type ChangeEvent } from 'react';
import './App.css';
import type { CvRequest, CvResponse } from './types.ts';
import { latexToHtml } from './latexPreview.ts';
import { API } from './env.ts';
import translations, { type Lang } from './i18n.ts';

const App: React.FC = () => {
  const [lang, setLang] = useState<Lang>('es');
  const t = translations[lang];
  const [page, setPage] = useState<'form' | 'result'>('form');

  const [cvMode, setCvMode] = useState<'pdf' | 'text' | 'latex' | null>(null);
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

  const handlePdfFile = (file: File) => {
    if (file.type !== 'application/pdf') return;
    setPdfFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setFormData(prev => ({ ...prev, cv: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handlePdfFile(file);
  };

  const selectMode = (mode: 'pdf' | 'text' | 'latex') => {
    if (cvMode === mode) {
      setCvMode(null);
    } else {
      setCvMode(mode);
    }
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
          <span className={`lang-option ${lang === 'es' ? 'active' : ''}`}>ES</span>
          <span className={`lang-option ${lang === 'en' ? 'active' : ''}`}>EN</span>
          <div className={`lang-slider ${lang === 'en' ? 'right' : ''}`} />
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
                    className={`cv-mode-btn ${cvMode === 'pdf' ? 'active' : ''} ${cvMode && cvMode !== 'pdf' ? 'locked' : ''}`}
                    onClick={() => selectMode('pdf')}
                  >
                    {t.modePdf}
                  </button>
                  <button
                    type="button"
                    className={`cv-mode-btn ${cvMode === 'text' ? 'active' : ''} ${cvMode && cvMode !== 'text' ? 'locked' : ''}`}
                    onClick={() => selectMode('text')}
                  >
                    {t.modeText}
                  </button>
                  <button
                    type="button"
                    className={`cv-mode-btn ${cvMode === 'latex' ? 'active' : ''} ${cvMode && cvMode !== 'latex' ? 'locked' : ''}`}
                    onClick={() => selectMode('latex')}
                  >
                    {t.modeLatex}
                  </button>
                  {cvMode && (
                    <button type="button" className="cv-mode-reset" onClick={() => selectMode(cvMode)}>
                      ✕
                    </button>
                  )}
                </div>

                {cvMode === 'pdf' && (
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
                    {pdfFile
                      ? <p className="pdf-filename">{t.pdfSelected} <strong>{pdfFile.name}</strong></p>
                      : <p>{t.pdfDrop}</p>
                    }
                  </div>
                )}

                {cvMode === 'text' && (
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

                {cvMode === 'latex' && (
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

              <div className={`input-group ${!formData.cv ? 'step-disabled' : ''}`}>
                <div className="step-label">
                  <span className={`step-number ${!formData.cv ? 'inactive' : ''}`}>3</span>
                  <span className="step-text">{t.step3Label}</span>
                </div>
                <button type="submit" disabled={loading || !formData.cv} className="submit-btn">
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
    </>
  );
}

export default App;