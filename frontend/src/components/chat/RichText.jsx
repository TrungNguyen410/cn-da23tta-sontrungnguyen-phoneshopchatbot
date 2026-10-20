// Renders the small markdown subset the chatbot uses (**bold**, "- " bullets, line breaks)
// as React elements, so model output is never injected as HTML.
const renderInline = (text, keyPrefix) =>
  text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, index) => (
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={`${keyPrefix}-${index}`}>{part.slice(2, -2)}</strong>
      : <span key={`${keyPrefix}-${index}`}>{part}</span>
  ));

export default function RichText({ text }) {
  const blocks = [];
  let bullets = [];
  const flush = () => {
    if (bullets.length) {
      blocks.push(<ul key={`ul-${blocks.length}`}>{bullets}</ul>);
      bullets = [];
    }
  };

  String(text || '').split('\n').forEach((line, index) => {
    const trimmed = line.trim();
    if (/^[-*•]\s+/.test(trimmed)) {
      bullets.push(<li key={`li-${index}`}>{renderInline(trimmed.replace(/^[-*•]\s+/, ''), `li-${index}`)}</li>);
      return;
    }
    flush();
    if (trimmed) blocks.push(<p key={`p-${index}`}>{renderInline(trimmed, `p-${index}`)}</p>);
  });
  flush();

  return <div className="chat-rich-text">{blocks}</div>;
}
