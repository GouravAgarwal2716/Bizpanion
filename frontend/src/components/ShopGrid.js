import React from 'react';

function ShopGrid({ products, formatCurrency }) {
  const fmt = typeof formatCurrency === 'function'
    ? formatCurrency
    : (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  return (
    <section id="shop" className="shop-section">
      <div className="products-grid">
        {products.map((p) => (
          <div className="product-card" key={p.id}>
            <div className="product-image"></div>
            <h3>{p.title}</h3>
            <p className="product-price">{fmt(p.price)}</p>
            <button className="add-to-cart-btn">Add to Cart</button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ShopGrid;
