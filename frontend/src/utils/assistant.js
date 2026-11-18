// Lets any part of the store open the AI assistant (and optionally ask it something)
// without sharing state with ChatWidget: it listens for this window event.
export const OPEN_ASSISTANT_EVENT = 'phoneshop:open-assistant';

export function openAssistant(text = '') {
  window.dispatchEvent(new CustomEvent(OPEN_ASSISTANT_EVENT, { detail: { text: String(text || '').trim() } }));
}
