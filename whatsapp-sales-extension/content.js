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

function findImageInput() {
  const candidates = [...document.querySelectorAll('input[type="file"]')].filter(input => {
    const accept = (input.getAttribute('accept') || '').toLowerCase();
    return accept.includes('image')
      && input.multiple
      && !input.hasAttribute('capture')
      && accept !== 'image/webp';
  });
  return candidates.find(input => (input.getAttribute('accept') || '').toLowerCase().includes('video'))
    || candidates[0]
    || null;
}

function attachmentTrigger() {
  const scope = document.querySelector('#main footer') || document.querySelector('footer') || document;
  const labelled = [...scope.querySelectorAll('button, [role="button"]')].find(element => {
    const label = `${element.getAttribute('aria-label') || ''} ${element.getAttribute('title') || ''}`.toLocaleLowerCase('pt-BR');
    return /(anexar|attach|adicionar)/.test(label);
  });
  if (labelled) return labelled;
  const icon = scope.querySelector('[data-icon="plus-rounded"], [data-icon="plus"], [data-icon="clip"]');
  return icon?.closest('button, [role="button"]') || null;
}

async function waitForImageInput() {
  let input = findImageInput();
  if (input) return input;
  attachmentTrigger()?.click();
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 100));
    input = findImageInput();
    if (input) return input;
  }
  return null;
}

async function attachImages(images) {
  if (!findComposer()) return { ok: false, error: 'Abra uma conversa antes de anexar as fotos.' };
  if (!Array.isArray(images) || !images.length) return { ok: false, error: 'Nenhuma foto foi preparada.' };
  const input = await waitForImageInput();
  if (!input) return { ok: false, error: 'Não encontrei o botão de fotos do WhatsApp. Use “Baixar fotos”.' };

  const transfer = new DataTransfer();
  for (const image of images) {
    const blob = await fetch(image.dataUrl).then(response => response.blob());
    transfer.items.add(new File([blob], image.name, { type: image.type || blob.type || 'image/jpeg' }));
  }
  input.files = transfer.files;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return { ok: true, count: transfer.files.length };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'GET_CHAT_CONTEXT') {
    sendResponse({ ok: true, customerName: readCustomerName(), hasOpenChat: Boolean(findComposer()) });
    return;
  }

  if (message?.type === 'INSERT_DRAFT') {
    sendResponse(insertDraft(String(message.text || '')));
    return;
  }

  if (message?.type === 'ATTACH_IMAGES') {
    attachImages(message.images).then(sendResponse).catch(error => sendResponse({ ok: false, error: error?.message || 'Falha ao anexar fotos.' }));
    return true;
  }
});
