import { FiMinus, FiPlus, FiTrash2 } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';

export default function CartItem({ item, onIncrease, onDecrease, onRemove }) {
  const path = item.type === 'accessory' ? `/accessories/${item.id}` : `/products/${item.id}`;
  return (
    <article className="cart-item">
      <Link to={path}><img src={item.image} alt={item.name} /></Link>
      <div className="cart-item-info">
        <Link to={path}><h3>{item.name}</h3></Link>
        <span className="stock-note">Còn {item.stock || 0} sản phẩm</span>
        <strong>{formatCurrency(item.price)}</strong>
      </div>
      <div className="quantity-control">
        <button onClick={onDecrease} disabled={item.quantity <= 1}><FiMinus /></button>
        <span>{item.quantity}</span>
        <button onClick={onIncrease} disabled={item.quantity >= item.stock}><FiPlus /></button>
      </div>
      <strong className="cart-line-total">{formatCurrency(item.price * item.quantity)}</strong>
      <button className="remove-item" onClick={onRemove} aria-label="Xóa sản phẩm"><FiTrash2 /></button>
    </article>
  );
}
