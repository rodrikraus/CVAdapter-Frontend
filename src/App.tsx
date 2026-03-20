import { useState, useEffect, type ChangeEvent } from 'react';
import './App.css';
import type { CvRequest, CvResponse } from './types.ts';
import { latexToHtml } from './latexPreview.ts';

const funnyMessages = [
  "Convenciendo a Gemini de que sos el mejor candidato...",
  "Traduciendo 'sé usar Excel' a lenguaje corporativo...",
  "Inflando tus habilidades blandas con IA...",
  "Buscando sinónimos elegantes para 'laburé de todo'...",
  "Enseñándole a Gemini qué es un trabajo en Argentina...",
  "Haciendo que 5 meses parezcan 5 años de experiencia...",
  "Reescribiendo 'manejo Office' como 'experto en suite ofimática'...",
  "Pidiendo referencias a ChatGPT... digo, Gemini...",
  "Transformando 'soy puntual' en una competencia estratégica...",
  "Calculando cuántas buzzwords entran en una página...",
  "Agregando 'proactivo' por decimoquinta vez...",
  "Convirtiendo tu CV en algo que RRHH no tire a la basura...",
];

const App: React.FC = () => {
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
      setFunnyMessage(funnyMessages[Math.floor(Math.random() * funnyMessages.length)]);

      const msgInterval = setInterval(() => {
        setFunnyMessage(funnyMessages[Math.floor(Math.random() * funnyMessages.length)]);
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
  }, [loading]);

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
      const response = await fetch('http://localhost:8080/api/cv/pdf', {
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
      setError(err instanceof Error ? err.message : 'Error al generar PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleOptimize = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8080/api/cv/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`Error en el servidor: ${response.statusText}`);
      }

      const data: CvResponse = await response.json();
      setOptimizedCv(data.optimizedCv);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {(loading || showPopup) && (
        <div className="loading-overlay">
          <div className="loading-popup">
            <div className="loading-spinner" />
            <p className="loading-percent">{Math.round(progress)}%</p>
            <div className="loading-bar">
              <div className="loading-bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <p className="loading-message">
              {progress >= 100 ? '¡Listo!' : funnyMessage}
            </p>
          </div>
        </div>
      )}

      {!optimizedCv ? (
        <div className="container">
          <header>
            <h1>AI CV Optimizer <span role="img" aria-label="sparkles">✨</span></h1>
            <p>Adaptá tu perfil a cualquier vacante en segundos.</p>
          </header>

          <main>
            <form onSubmit={handleOptimize} className="form-container">
              <div className="input-group">
                <label htmlFor="cv">Tu CV Actual:</label>
                <textarea
                  id="cv"
                  name="cv"
                  rows={10}
                  value={formData.cv}
                  onChange={handleChange}
                  required
                  placeholder="Copiá y pegá el contenido de tu CV aquí..."
                />
              </div>

              <div className="input-group">
                <label htmlFor="jobOffer">Descripción de la Vacante:</label>
                <textarea
                  id="jobOffer"
                  name="jobOffer"
                  rows={10}
                  value={formData.jobOffer}
                  onChange={handleChange}
                  required
                  placeholder="Pegá los requisitos y descripción del puesto..."
                />
              </div>

              <button type="submit" disabled={loading} className="submit-btn">
                {loading ? 'Procesando con Gemini...' : 'Optimizar CV'}
              </button>
            </form>

            {error && <div className="error-message">❌ {error}</div>}
          </main>
        </div>
      ) : (
        <div className="result-page">
          <div className="result-header">
            <h2>Resultado Optimizado</h2>
            <div className="result-header-actions">
              <button className="back-btn" onClick={() => setOptimizedCv('')}>
                Volver
              </button>
              <div className="result-tabs">
                <button
                  className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('preview')}
                >
                  Vista Previa
                </button>
                <button
                  className={`tab-btn ${activeTab === 'editor' ? 'active' : ''}`}
                  onClick={() => setActiveTab('editor')}
                >
                  Editor LaTeX
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
              Copiar LaTeX
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={pdfLoading}
              className="download-btn"
            >
              {pdfLoading ? 'Generando PDF...' : 'Descargar PDF'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default App;