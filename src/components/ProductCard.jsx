import { useState } from 'react';

export default function ProductCard({ product }) {
  const [imgError, setImgError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const imageSrc = imgError || !product.image ? '/placeholder.png' : product.image;

  return (
    <>
      <div className={`product-card ${product.noStock ? 'no-stock' : ''}`}>
        <div className="product-image-wrap" onClick={() => !imgError && product.image && setModalOpen(true)}>
          <img
            src={imageSrc}
            alt={product.name}
            className="product-image"
            onError={() => setImgError(true)}
          />
          {product.noStock && <span className="badge-no-stock">Sin Stock</span>}
        </div>
        <div className="product-info">
          <span className="product-code">#{product.code}</span>
          <h3 className="product-name">{product.name}</h3>
          {product.category && <span className="product-category">{product.category}</span>}
          {product.description && <p className="product-desc">{product.description}</p>}
          <p className="product-price">
            {product.noStock
              ? <span className="sin-stock-text">Sin Stock</span>
              : `$${Number(product.price).toLocaleString('es-AR')}`}
          </p>
        </div>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-img-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setModalOpen(false)}>
              <i className="fas fa-times" />
            </button>
            <img src={imageSrc} alt={product.name} />
            <p>{product.name}</p>
          </div>
        </div>
      )}
    </>
  );
}
