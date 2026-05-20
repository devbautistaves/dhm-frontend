import { useState } from 'react';
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

function parseBacoText(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const products = [];
  let current = null;

  for (const line of lines) {
    const priceMatch = line.match(/\$\s?([\d.,]+)/);
    if (priceMatch) {
      if (current) {
        current.price = parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.'));
        products.push(current);
        current = null;
      }
    } else if (line.length > 3) {
      current = { name: line, price: 0, category: '', description: '', image: '', noStock: false };
    }
  }
  return products;
}

export default function BacoImport({ categories, onImported, onClose }) {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState([]);
  const [step, setStep] = useState('input');
  const [existingNames, setExistingNames] = useState([]);
  const [selected, setSelected] = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState('');

  const handleParse = async () => {
    const items = parseBacoText(text);
    if (!items.length) return;

    const res = await productsApi.getAll({ limit: 9999 });
    const names = res.data.products.map((p) => p.name);
    setExistingNames(names);

    const withDupe = items.map((item) => ({
      ...item,
      duplicate: names.some((n) => isSimilar(n, item.name)),
    }));

    setParsed(withDupe);
    setSelected(withDupe.filter((i) => !i.duplicate).map((_, idx) =>
      withDupe.findIndex((x) => x === withDupe.filter((i) => !i.duplicate)[idx])
    ));
    setStep('review');
  };

  const toggleSelect = (idx) => {
    setSelected((s) => s.includes(idx) ? s.filter((i) => i !== idx) : [...s, idx]);
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

        {step === 'input' && (
          <div className="baco-input">
            <p className="baco-hint">Pegá el texto copiado del catálogo de Baco (nombre + precio por línea):</p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              placeholder="Adhesivo PVC 60cm3&#10;$1.150&#10;Cable gemelo 2x1.5mm&#10;$2.300..."
            />
            <div className="form-actions">
              <button className="btn-secondary" onClick={onClose}>Cancelar</button>
              <button className="btn-primary" onClick={handleParse} disabled={!text.trim()}>
                <i className="fas fa-search" /> Analizar
              </button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="baco-review">
            <p className="baco-hint">
              Encontrados: <strong>{parsed.length}</strong> productos.
              <span className="dup-badge"> {parsed.filter((p) => p.duplicate).length} posibles duplicados</span>
            </p>
            <div className="baco-list">
              {parsed.map((item, idx) => (
                <div
                  key={idx}
                  className={`baco-item ${item.duplicate ? 'baco-dup' : ''} ${selected.includes(idx) ? 'baco-sel' : ''}`}
                  onClick={() => toggleSelect(idx)}
                >
                  <input type="checkbox" checked={selected.includes(idx)} onChange={() => {}} />
                  <span className="baco-name">{item.name}</span>
                  <span className="baco-price">${item.price.toLocaleString('es-AR')}</span>
                  {item.duplicate && <span className="baco-dup-label">posible duplicado</span>}
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
