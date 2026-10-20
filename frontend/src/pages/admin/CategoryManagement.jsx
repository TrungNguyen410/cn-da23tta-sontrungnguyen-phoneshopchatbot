import { adminApi } from '../../api/adminApi';
import TaxonomyManagement from '../../components/admin/TaxonomyManagement';

export default function CategoryManagement() {
  return <TaxonomyManagement api={adminApi.categories} type="category" />;
}
