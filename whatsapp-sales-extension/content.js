function findComposer() {
  const footer = document.querySelector('footer');
  if (!footer) return null;

  return footer.querySelector('[contenteditable="true"][role="textbox"]')
    || footer.querySelector('[contenteditable="true"]');
}

function readCustomerName() {
  const header = document.querySelector('#main header');
  if (!header) return '';

  const labelled = header.querySelector('[title]');
  if (labelled?.getAttribute('title')) return labelled.getAttribute('title').trim();

  const textCandidates = [...header.querySelectorAll('span')]
    .map(element => element.textContent?.trim())
    .filter(text => text && text.length > 1 && text.length < 80);
  return textCandidates[0] || '';
}

function insertDraft(text) {
  const composer = findComposer();
  if (!composer) {
    return { ok: false, error: 'Abra uma conversa no WhatsApp antes de inserir a mensagem.' };
  }

  composer.focus();
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(composer);
  selection.removeAllRanges();
  selection.addRange(range);

  const inserted = document.execCommand('insertText', false, text);
  if (!inserted) {
    composer.textContent = text;
    composer.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
  }

  composer.dispatchEvent(new Event('change', { bubbles: true }));
  return { ok: true };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'GET_CHAT_CONTEXT') {
    sendResponse({ ok: true, customerName: readCustomerName(), hasOpenChat: Boolean(findComposer()) });
    return;
  }

  if (message?.type === 'INSERT_DRAFT') {
    sendResponse(insertDraft(String(message.text || '')));
  }
});
