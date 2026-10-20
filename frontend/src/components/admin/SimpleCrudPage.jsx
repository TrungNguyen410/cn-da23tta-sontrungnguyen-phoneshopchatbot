import { useEffect, useState } from 'react';
import { FiEdit2, FiPlus, FiTrash2, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import ConfirmModal from '../common/ConfirmModal';
import Loading from '../common/Loading';
import DataTable from './DataTable';
import AdminImageUpload from './AdminImageUpload';
import AccessibleDialog from '../common/AccessibleDialog';

export default function SimpleCrudPage({ api, title, singular, fields, columns, createDefaults = {} }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [mutationKey, setMutationKey] = useState('');

  const load = () => api.getAll().then(setItems).finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fieldValue = (field) => {
    const value = form[field.key] ?? '';
    if (field.type === 'date' && value) return String(value).slice(0, 10);
    return value;
  };

  const save = async (event) => {
    event.preventDefault();
    if (mutationKey) return;
    if (event.currentTarget.querySelector('[data-uploading="true"]')) {
      toast.error('Vui lòng chờ ảnh tải lên hoàn tất');
      return;
    }
    const payload = fields.reduce((result, field) => {
      let value = form[field.key];
      if (field.type === 'date' && value) value = String(value).slice(0, 10);
      if (field.type === 'number') value = Number(value);
      if (field.type === 'checkbox') value = Boolean(value);
      result[field.key] = value;
      return result;
    }, {});
    const missingField = fields.find((field) =>
      field.required
      && (payload[field.key] === undefined || payload[field.key] === null || payload[field.key] === ''));
    if (missingField) {
      toast.error(`Vui lòng nhập ${missingField.label.toLowerCase()}`);
      return;
    }

    setMutationKey(`save:${form.id || 'new'}`);
    try {
      if (form.id) await api.update(form.id, payload);
      else await api.create(payload);
      setForm(null);
      toast.success(`Đã lưu ${singular.toLowerCase()}`);
      await load();
    } catch (error) {
      toast.error(error.friendlyMessage || error.message);
    } finally {
      setMutationKey('');
    }
  };

  const remove = async () => {
    if (mutationKey || !deleteId) return;
    setMutationKey(`delete:${deleteId}`);
    try {
      await api.remove(deleteId);
      setDeleteId(null);
      toast.success(`Đã xóa ${singular.toLowerCase()}`);
      await load();
    } catch (error) {
      toast.error(error.friendlyMessage || error.message);
    } finally {
      setMutationKey('');
    }
  };

  const tableColumns = [
    ...columns,
    {
      key: 'actions',
      label: 'Thao tác',
      render: (item) => (
        <div className="table-actions">
          <button disabled={Boolean(mutationKey)} onClick={() => setForm(item)}>
            <FiEdit2 />
          </button>
          <button className="danger" disabled={Boolean(mutationKey)} onClick={() => setDeleteId(item.id)}>
            <FiTrash2 />
          </button>
        </div>
      ),
    },
  ];

  if (loading) return <Loading />;

  return (
    <>
      <div className="admin-page-toolbar">
        <div />
        <button className="btn btn-primary" disabled={Boolean(mutationKey)} onClick={() => setForm({ ...createDefaults })}>
          <FiPlus /> Thêm {singular.toLowerCase()}
        </button>
      </div>

      <div className="admin-table-card">
        <div className="admin-table-title">
          <div>
            <h2>{title}</h2>
            <span>{items.length} mục</span>
          </div>
        </div>
        <DataTable columns={tableColumns} rows={items} />
      </div>

      {form && (
        <AccessibleDialog
          open
          title={`${form.id ? 'Chỉnh sửa' : 'Thêm mới'} ${singular}`}
          className="admin-form-dialog"
          onClose={() => {
            if (!mutationKey) setForm(null);
          }}
        >
          <form
            className="admin-form-modal simple-form-modal"
            onSubmit={save}
          >
            <div className="admin-modal-head">
              <div>
                <span>{form.id ? 'Chỉnh sửa' : 'Thêm mới'}</span>
                <h2>{singular}</h2>
              </div>
              <button type="button" disabled={Boolean(mutationKey)} onClick={() => setForm(null)}>
                <FiX />
              </button>
            </div>

            <div className="form-grid">
              {fields.map((field) => {
                if (field.type === 'image') {
                  return (
                    <AdminImageUpload
                      key={field.key}
                      label={field.label}
                      value={fieldValue(field)}
                      required={field.required}
                      onChange={(value) => setForm({ ...form, [field.key]: value })}
                    />
                  );
                }
                if (field.type === 'checkbox') {
                  return (
                    <label className="admin-checkbox" key={field.key}>
                      <input
                        type="checkbox"
                        checked={Boolean(form[field.key])}
                        onChange={(event) => setForm({ ...form, [field.key]: event.target.checked })}
                      />
                      <span>{field.label}</span>
                    </label>
                  );
                }

                return (
                  <label className={`form-field ${field.full ? 'full' : ''}`} key={field.key}>
                    <span>{field.label}</span>
                    {field.type === 'select' ? (
                      <select
                        required={field.required}
                        value={fieldValue(field)}
                        onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
                      >
                        {field.options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        required={field.required}
                        rows="3"
                        value={fieldValue(field)}
                        onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
                      />
                    ) : (
                      <input
                        required={field.required}
                        type={field.type || 'text'}
                        value={fieldValue(field)}
                        onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
                      />
                    )}
                  </label>
                );
              })}
            </div>

            <div className="admin-modal-actions">
              <button type="button" className="btn btn-light" disabled={Boolean(mutationKey)} onClick={() => setForm(null)}>
                Hủy
              </button>
              <button className="btn btn-primary" disabled={Boolean(mutationKey)}>
                {mutationKey.startsWith('save:') ? 'Đang lưu…' : 'Lưu dữ liệu'}
              </button>
            </div>
          </form>
        </AccessibleDialog>
      )}

      <ConfirmModal
        open={Boolean(deleteId)}
        title={`Xóa ${singular.toLowerCase()}?`}
        message="Dữ liệu sẽ bị xóa khỏi hệ thống."
        onCancel={() => setDeleteId(null)}
        onConfirm={remove}
        busy={mutationKey === `delete:${deleteId}`}
      />
    </>
  );
}
