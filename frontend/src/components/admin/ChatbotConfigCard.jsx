import { useEffect, useState } from 'react';
import { FiSave } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { chatApi, DEFAULT_CHAT_CONFIG } from '../../api/chatApi';

const MAX_QUESTIONS = 6;

export default function ChatbotConfigCard() {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    chatApi.getConfig()
      .catch(() => DEFAULT_CHAT_CONFIG)
      .then((config) => {
        if (!active) return;
        setForm({
          enabled: config.enabled !== false,
          greeting: config.greeting || '',
          questions: (config.quickQuestions || []).join('\n'),
        });
      });
    return () => { active = false; };
  }, []);

  if (!form) return null;

  const questionList = form.questions.split('\n').map((line) => line.trim()).filter(Boolean);

  const save = async (event) => {
    event.preventDefault();
    if (questionList.length > MAX_QUESTIONS) {
      toast.error(`Tối đa ${MAX_QUESTIONS} câu hỏi gợi ý`);
      return;
    }
    setSaving(true);
    try {
      const saved = await chatApi.updateConfig({
        enabled: form.enabled,
        greeting: form.greeting,
        quickQuestions: questionList,
      });
      setForm({ enabled: saved.enabled, greeting: saved.greeting, questions: saved.quickQuestions.join('\n') });
      toast.success('Đã lưu cấu hình chatbot');
    } catch (error) {
      toast.error(error.friendlyMessage || error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="admin-card chatbot-config" onSubmit={save} aria-label="Cấu hình chatbot">
      <div className="card-heading"><div><h2>Cấu hình chatbot</h2><span>Áp dụng ngay cho khung chat trên website</span></div></div>
      <label className="admin-checkbox">
        <input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} />
        <span>Bật chatbot trên website</span>
      </label>
      <label className="form-field full">
        <span>Lời chào (hỗ trợ **in đậm** và dòng bắt đầu bằng "- ")</span>
        <textarea rows="4" maxLength={500} value={form.greeting} onChange={(event) => setForm({ ...form, greeting: event.target.value })} />
      </label>
      <label className="form-field full">
        <span>Câu hỏi gợi ý (mỗi dòng một câu, tối đa {MAX_QUESTIONS})</span>
        <textarea rows="4" value={form.questions} onChange={(event) => setForm({ ...form, questions: event.target.value })} />
      </label>
      <div className="chatbot-config-actions">
        <small>{questionList.length}/{MAX_QUESTIONS} câu hỏi</small>
        <button className="btn btn-primary" disabled={saving}><FiSave /> {saving ? 'Đang lưu…' : 'Lưu cấu hình'}</button>
      </div>
    </form>
  );
}
