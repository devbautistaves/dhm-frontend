import { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import Header from '../components/Header';
import ProductForm from '../components/ProductForm';
import BacoImport from '../components/BacoImport';
import { productsApi, backupApi } from '../services/api';

export default function AdminPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('todas');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editProduct, setEditProduct] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showBaco, setShowBaco] = useState(false);
  const [toast, setToast] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const restoreRef = useRef(null);
  const LIMIT = 50;

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

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

  const fetchCategories = useCallback(async () => {
    const res = await productsApi.getCategories();
    setCategories(res.data);
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { setPage(1); }, [search, category]);

  const handleSave = async () => {
    setShowForm(false);
    setEditProduct(null);
    await fetchProducts();
    await fetchCategories();
    showToast('Producto guardado correctamente');
  };

  const handleDelete = async (id) => {
    try {
      await productsApi.remove(id);
      setConfirmDelete(null);
      await fetchProducts();
      showToast('Producto eliminado');
    } catch (err) {
      showToast('Error al eliminar: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleBackup = async () => {
    try {
      const res = await backupApi.download();
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_dhm_${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Backup descargado');
    } catch {
      showToast('Error al descargar backup');
    }
  };

  const handleRestore = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!Array.isArray(data)) throw new Error('Formato inválido');
        if (!window.confirm(`¿Restaurar backup con ${data.length} productos? Esto reemplazará todos los datos actuales.`)) return;
        await backupApi.restore(data);
        await fetchProducts();
        await fetchCategories();
        showToast(`Backup restaurado: ${data.length} productos`);
      } catch (err) {
        showToast('Error al restaurar: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const exportExcel = async () => {
    const res = await productsApi.getAll({ limit: 9999 });
    const rows = res.data.products.map((p) => ({
      Código: p.code, Nombre: p.name, Categoría: p.category,
      Descripción: p.description, Precio: p.price,
      Stock: p.noStock ? 'Sin Stock' : 'Disponible',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Catálogo DHM');
    XLSX.writeFile(wb, `catalogo_dhm_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div className="page">
      <Header />

      <main className="main-content">
        <div className="admin-header">
          <h2><i className="fas fa-cog" /> Panel de Administración</h2>
          <div className="admin-actions">
            <button className="btn-primary" onClick={() => { setEditProduct(null); setShowForm(true); }}>
              <i className="fas fa-plus" /> Nuevo Producto
            </button>
            <button className="btn-baco" onClick={() => setShowBaco(true)}>
              <i className="fas fa-file-import" /> Novedades Baco
            </button>
            <button className="btn-export" onClick={exportExcel}>
              <i className="fas fa-file-excel" /> Excel
            </button>
            <button className="btn-export" onClick={handleBackup}>
              <i className="fas fa-download" /> Backup
            </button>
            <button className="btn-export" onClick={() => restoreRef.current.click()}>
              <i className="fas fa-upload" /> Restaurar
            </button>
            <input ref={restoreRef} type="file" accept=".json" onChange={handleRestore} hidden />
          </div>
        </div>

        <div className="catalog-toolbar">
          <div className="search-area">
            <div className="search-box">
              <i className="fas fa-search" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar productos..."
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
          <span className="product-count"><i className="fas fa-box" /> {total} productos</span>
        </div>

        {loading ? (
          <div className="loader-area"><i className="fas fa-spinner fa-spin fa-2x" /></div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Imagen</th>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr><td colSpan={7} className="table-empty">No hay productos</td></tr>
                ) : products.map((p) => (
                  <tr key={p._id} className={p.noStock ? 'row-no-stock' : ''}>
                    <td><code>{p.code}</code></td>
                    <td>
                      <img
                        src={p.image || '/placeholder.png'}
                        alt=""
                        className="table-thumb"
                        onError={(e) => { e.target.src = '/placeholder.png'; }}
                      />
                    </td>
                    <td>{p.name}</td>
                    <td><span className="tag">{p.category || '—'}</span></td>
                    <td>{p.noStock ? <span className="sin-stock-text">Sin Stock</span> : `$${Number(p.price).toLocaleString('es-AR')}`}</td>
                    <td>
                      <span className={`stock-badge ${p.noStock ? 'out' : 'in'}`}>
                        {p.noStock ? 'Sin Stock' : 'Disponible'}
                      </span>
                    </td>
                    <td className="table-actions">
                      <button
                        className="btn-icon btn-edit"
                        title="Editar"
                        onClick={() => { setEditProduct(p); setShowForm(true); }}
                      >
                        <i className="fas fa-edit" />
                      </button>
                      <button
                        className="btn-icon btn-delete"
                        title="Eliminar"
                        onClick={() => setConfirmDelete(p)}
                      >
                        <i className="fas fa-trash" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pages > 1 && (
              <div className="pagination">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  <i className="fas fa-chevron-left" />
                </button>
                <span>Página {page} de {pages}</span>
                <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}>
                  <i className="fas fa-chevron-right" />
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="footer">
        <p>DHM Distribuidora &copy; {new Date().getFullYear()} — Panel Admin</p>
      </footer>

      {showForm && (
        <ProductForm
          product={editProduct}
          categories={categories}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditProduct(null); }}
        />
      )}

      {showBaco && (
        <BacoImport
          categories={categories}
          onImported={() => { fetchProducts(); fetchCategories(); }}
          onClose={() => setShowBaco(false)}
        />
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal-confirm" onClick={(e) => e.stopPropagation()}>
            <h3><i className="fas fa-exclamation-triangle" /> Eliminar Producto</h3>
            <p>¿Seguro que querés eliminar <strong>{confirmDelete.name}</strong>?</p>
            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="btn-danger" onClick={() => handleDelete(confirmDelete._id)}>
                <i className="fas fa-trash" /> Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
