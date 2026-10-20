import { adminApi } from '../../api/adminApi';
import TaxonomyManagement from '../../components/admin/TaxonomyManagement';

export default function BrandManagement() {
  return <TaxonomyManagement api={adminApi.brands} type="brand" />;
}
