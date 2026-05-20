import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import Header from '../components/Header';
import ProductCard from '../components/ProductCard';
import { productsApi } from '../services/api';

export default function CatalogPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('todas');
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const LIMIT = 48;

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = { limit: LIMIT, page };
      if (search) params.search = search;
      if (category !== 'todas') params.category = category;
      const res = await productsApi.getAll(params);
      setProducts(res.data.products);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } finally {
      setLoading(false);
    }
  }, [search, category, page]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    productsApi.getCategories().then((r) => setCategories(r.data));
  }, []);

  useEffect(() => { setPage(1); }, [search, category]);

  const exportExcel = async () => {
    const res = await productsApi.getAll({ limit: 9999 });
    const rows = res.data.products.map((p) => ({
      Código: p.code,
      Nombre: p.name,
      Categoría: p.category,
      Descripción: p.description,
      Precio: p.price,
      Stock: p.noStock ? 'Sin Stock' : 'Disponible',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Catálogo DHM');
    XLSX.writeFile(wb, `catalogo_dhm_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const exportPDF = async () => {
    const res = await productsApi.getAll({ limit: 9999 });
    const all = res.data.products;
    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html><html><head>
      <meta charset="UTF-8"><title>Catálogo DHM</title>
      <style>
        body{font-family:Arial,sans-serif;margin:20px}
        h1{color:#1a3a6b;text-align:center}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th{background:#1a3a6b;color:white;padding:8px;text-align:left}
        td{padding:6px 8px;border-bottom:1px solid #eee}
        tr:nth-child(even){background:#f8f9fa}
        .no-stock{color:#e74c3c;font-weight:bold}
        @media print{body{margin:0}}
      </style></head><body>
      <h1>DHM Distribuidora — Catálogo de Productos</h1>
      <p style="text-align:center">Generado: ${new Date().toLocaleDateString('es-AR')} | Total: ${all.length} productos</p>
      <table>
        <thead><tr><th>Código</th><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Stock</th></tr></thead>
        <tbody>
          ${all.map((p) => `<tr>
            <td>${p.code}</td>
            <td>${p.name}</td>
            <td>${p.category}</td>
            <td>${p.noStock ? '' : '$' + Number(p.price).toLocaleString('es-AR')}</td>
            <td class="${p.noStock ? 'no-stock' : ''}">${p.noStock ? 'Sin Stock' : 'Disponible'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <script>window.onload=()=>window.print();</script>
      </body></html>`);
    win.document.close();
  };

  return (
    <div className="page">
      <Header />
      <main className="main-content">
        <div className="catalog-toolbar">
          <div className="search-area">
            <div className="search-box">
              <i className="fas fa-search" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, código o descripción..."
              />
              {search && (
                <button className="clear-search" onClick={() => setSearch('')}>
                  <i className="fas fa-times" />
                </button>
              )}
            </div>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="todas">Todas las categorías</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="toolbar-actions">
            <span className="product-count">
              <i className="fas fa-box" /> {total} productos
            </span>
            <button className="btn-export" onClick={exportExcel}>
              <i className="fas fa-file-excel" /> Excel
            </button>
            <button className="btn-export" onClick={exportPDF}>
              <i className="fas fa-file-pdf" /> PDF
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loader-area"><i className="fas fa-spinner fa-spin fa-2x" /></div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-search fa-3x" />
            <p>No se encontraron productos</p>
          </div>
        ) : (
          <>
            <div className="products-grid">
              {products.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>

            {pages > 1 && (
              <div className="pagination">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <i className="fas fa-chevron-left" />
                </button>
                <span>Página {page} de {pages}</span>
                <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}>
                  <i className="fas fa-chevron-right" />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="footer">
        <p>DHM Distribuidora &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
