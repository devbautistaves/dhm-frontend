import { useState, useEffect } from 'react';
import { productsApi, uploadApi } from '../services/api';

const EMPTY = { name: '', price: '', category: '', description: '', image: '', noStock: false };

export default function ProductForm({ product, categories, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (product) {
      setForm({ ...EMPTY, ...product, price: product.price ?? '' });
    } else {
      setForm(EMPTY);
    }
  }, [product]);

  const set = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: val }));
  };

  const handleImageFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploading(true);
      const res = await uploadApi.image(file);
      setForm((f) => ({ ...f, image: res.data.url }));
    } catch {
      setError('Error al subir imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return; }
    if (form.price === '' || isNaN(Number(form.price))) { setError('Precio inválido'); return; }

    try {
      setSaving(true);
      const payload = { ...form, price: Number(form.price) };
      if (product?._id) {
        await productsApi.update(product._id, payload);
      } else {
        await productsApi.create(payload);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{product ? 'Editar Producto' : 'Nuevo Producto'}</h2>
          <button className="modal-close" onClick={onClose}><i className="fas fa-times" /></button>
        </div>

        <form onSubmit={handleSubmit} className="product-form">
          {error && <div className="form-error"><i className="fas fa-exclamation-circle" /> {error}</div>}

          <div className="form-group">
            <label>Nombre *</label>
            <input value={form.name} onChange={set('name')} placeholder="Nombre del producto" required />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Precio ($)</label>
              <input type="number" value={form.price} onChange={set('price')} placeholder="0" min="0" step="0.01" />
            </div>
            <div className="form-group">
              <label>Categoría</label>
              <input
                list="cat-list"
                value={form.category}
                onChange={set('category')}
                placeholder="Ej: Cables, Adhesivos..."
              />
              <datalist id="cat-list">
                {categories.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
          </div>

          <div className="form-group">
            <label>Descripción</label>
            <textarea value={form.description} onChange={set('description')} rows={3} placeholder="Descripción opcional" />
          </div>

          <div className="form-group">
            <label>Imagen</label>
            <div className="image-input-row">
              <input
                value={form.image}
                onChange={set('image')}
                placeholder="URL de imagen o subí un archivo"
              />
              <label className="btn-upload">
                {uploading ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-upload" /> Subir</>}
                <input type="file" accept="image/*" onChange={handleImageFile} hidden />
              </label>
            </div>
            {form.image && (
              <img
                src={form.image}
                alt="preview"
                className="img-preview"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
          </div>

          <div className="form-check">
            <label>
              <input type="checkbox" checked={form.noStock} onChange={set('noStock')} />
              Sin stock (mostrar como no disponible)
            </label>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving || uploading}>
              {saving ? <><i className="fas fa-spinner fa-spin" /> Guardando...</> : <><i className="fas fa-save" /> Guardar</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
