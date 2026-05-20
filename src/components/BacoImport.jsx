import { useState, useRef } from 'react';
import { productsApi } from '../services/api';

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

function isSimilar(a, b, threshold = 0.75) {
  const na = a.toLowerCase().trim();
  const nb = b.toLowerCase().trim();
  if (na === nb) return true;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return true;
  return 1 - levenshtein(na, nb) / maxLen >= threshold;
}

const URL_REGEX = /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg)(\?[^\s]*)?/i;
const PRICE_REGEX = /\$\s?([\d.,]+)/;

function parseBacoText(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const products = [];
  let current = null;

  for (const line of lines) {
    const priceMatch = line.match(PRICE_REGEX);
    const urlMatch = line.match(URL_REGEX);

    if (urlMatch) {
      // línea con URL de imagen
      if (current) current.image = urlMatch[0];
    } else if (priceMatch) {
      // línea con precio → cierra el producto actual
      if (current) {
        current.price = parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.'));
        products.push(current);
        current = null;
      }
    } else if (line.length > 3) {
      // línea de nombre → abre nuevo producto
      if (current) products.push(current); // guardar sin precio si quedó colgado
      current = { name: line, price: 0, category: '', description: '', image: '', noStock: false };
    }
  }
  if (current) products.push(current);
  return products;
}

export default function BacoImport({ categories, onImported, onClose }) {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState([]);
  const [step, setStep] = useState('input');
  const [selected, setSelected] = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState('');
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setText(ev.target.result);
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const handleParse = async () => {
    const items = parseBacoText(text);
    if (!items.length) return;

    const res = await productsApi.getAll({ limit: 9999 });
    const names = res.data.products.map((p) => p.name);

    const withDupe = items.map((item) => ({
      ...item,
      duplicate: names.some((n) => isSimilar(n, item.name)),
    }));

    setParsed(withDupe);
    // preseleccionar los que NO son duplicados
    setSelected(
      withDupe.reduce((acc, item, idx) => {
        if (!item.duplicate) acc.push(idx);
        return acc;
      }, [])
    );
    setStep('review');
  };

  const toggleSelect = (idx) => {
    setSelected((s) => s.includes(idx) ? s.filter((i) => i !== idx) : [...s, idx]);
  };

  const toggleAll = () => {
    setSelected(selected.length === parsed.length ? [] : parsed.map((_, i) => i));
  };

  const handleImport = async () => {
    const toImport = selected.map((i) => parsed[i]);
    if (!toImport.length) return;
    try {
      setImporting(true);
      for (const p of toImport) {
        await productsApi.create(p);
      }
      setResult(`✓ ${toImport.length} productos importados correctamente`);
      setStep('done');
      onImported();
    } catch (err) {
      setResult(`Error: ${err.response?.data?.error || err.message}`);
      setStep('done');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2><i className="fas fa-file-import" /> Novedades de Baco</h2>
          <button className="modal-close" onClick={onClose}><i className="fas fa-times" /></button>
        </div>

        {/* ── PASO 1: INPUT ── */}
        {step === 'input' && (
          <div className="baco-input">
            <p className="baco-hint">
              Pegá el texto del catálogo de Baco o importá un archivo <code>.txt</code>.<br />
              Formato soportado: nombre → precio ($) → URL de imagen (opcional).
            </p>

            <div className="baco-file-row">
              <button className="btn-export" onClick={() => fileRef.current.click()}>
                <i className="fas fa-file-alt" /> Cargar archivo .txt
              </button>
              <input ref={fileRef} type="file" accept=".txt,text/plain" onChange={handleFile} hidden />
              {text && <span className="baco-char-count">{text.length} caracteres cargados</span>}
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              placeholder={`Adhesivo PVC 60cm3\n$1.150\nhttps://distribuidorabaco.com.ar/uploads/123.jpg\nCable gemelo 2x1.5mm\n$2.300\n...`}
            />
            <div className="form-actions">
              <button className="btn-secondary" onClick={onClose}>Cancelar</button>
              <button className="btn-primary" onClick={handleParse} disabled={!text.trim()}>
                <i className="fas fa-search" /> Analizar
              </button>
            </div>
          </div>
        )}

        {/* ── PASO 2: REVISIÓN ── */}
        {step === 'review' && (
          <div className="baco-review">
            <div className="baco-review-stats">
              <span>Encontrados: <strong>{parsed.length}</strong></span>
              <span className="dup-badge"><i className="fas fa-exclamation-triangle" /> {parsed.filter((p) => p.duplicate).length} posibles duplicados</span>
              <span className="img-badge"><i className="fas fa-image" /> {parsed.filter((p) => p.image).length} con imagen</span>
              <button className="btn-select-all" onClick={toggleAll}>
                {selected.length === parsed.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </button>
            </div>

            <div className="baco-list">
              {parsed.map((item, idx) => (
                <div
                  key={idx}
                  className={`baco-item ${item.duplicate ? 'baco-dup' : ''} ${selected.includes(idx) ? 'baco-sel' : ''}`}
                  onClick={() => toggleSelect(idx)}
                >
                  <input type="checkbox" checked={selected.includes(idx)} onChange={() => {}} onClick={(e) => e.stopPropagation()} />

                  {item.image ? (
                    <img
                      src={item.image}
                      alt=""
                      className="baco-thumb"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="baco-thumb-empty"><i className="fas fa-image" /></div>
                  )}

                  <span className="baco-name">{item.name}</span>
                  <span className="baco-price">${item.price.toLocaleString('es-AR')}</span>

                  {item.image && (
                    <span className="baco-img-label" title={item.image}>
                      <i className="fas fa-check-circle" />
                    </span>
                  )}
                  {item.duplicate && <span className="baco-dup-label">duplicado</span>}
                </div>
              ))}
            </div>

            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setStep('input')}>Atrás</button>
              <button className="btn-primary" onClick={handleImport} disabled={importing || !selected.length}>
                {importing
                  ? <><i className="fas fa-spinner fa-spin" /> Importando...</>
                  : <><i className="fas fa-check" /> Importar {selected.length} productos</>}
              </button>
            </div>
          </div>
        )}

        {/* ── PASO 3: RESULTADO ── */}
        {step === 'done' && (
          <div className="baco-done">
            <p>{result}</p>
            <button className="btn-primary" onClick={onClose}>Cerrar</button>
          </div>
        )}
      </div>
    </div>
  );
}
