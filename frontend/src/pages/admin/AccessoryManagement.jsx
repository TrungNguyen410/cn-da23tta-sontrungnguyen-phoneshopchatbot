import { accessoryApi } from '../../api/accessoryApi';
import CatalogManagement from '../../components/admin/CatalogManagement';

export default function AccessoryManagement() {
  return <CatalogManagement api={accessoryApi} kind="accessory" />;
}
