import { productApi } from '../../api/productApi';
import CatalogManagement from '../../components/admin/CatalogManagement';

export default function ProductManagement() {
  return <CatalogManagement api={productApi} kind="product" />;
}
