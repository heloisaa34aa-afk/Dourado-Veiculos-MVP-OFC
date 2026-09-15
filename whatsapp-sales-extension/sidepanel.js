import { DEFAULT_CONFIG, composeVehicleSequence, filterVehicles, normalizeVehicle, vehicleTitle } from './lib.js';

const state = { vehicles: [], selected: null, customerName: '', config: { ...DEFAULT_CONFIG }, messages: [], currentMessage: 0 };
const elements = Object.fromEntries([
  'chatContext', 'customerName', 'searchInput', 'inventoryStatus', 'vehicleList', 'composerPanel',
  'selectedVehicleTitle', 'templateSelect', 'mediaSection', 'mediaList', 'attachAllButton', 'downloadAllButton', 'messageSequence', 'sequenceProgress', 'closeComposer', 'copyButton',
  'insertButton', 'refreshButton', 'toast'
].map(id => [id, document.getElementById(id)]));

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => elements.toast.classList.remove('visible'), 2600);
}

function formatPrice(value) {
  return value > 0
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)
    : 'Consulte o valor';
}

function vehicleSubtitle(vehicle) {
  return [vehicle.year, vehicle.transmission, vehicle.mileage === 0 ? '0 km' : vehicle.mileage ? `${vehicle.mileage.toLocaleString('pt-BR')} km` : '']
    .filter(Boolean).join(' · ');
}

function renderVehicles() {
  const matches = filterVehicles(state.vehicles, elements.searchInput.value);
  elements.inventoryStatus.textContent = `${matches.length} de ${state.vehicles.length} veículos disponíveis`;
  elements.vehicleList.replaceChildren();

  if (!matches.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = state.vehicles.length ? 'Nenhum veículo corresponde à busca.' : 'Nenhum veículo disponível foi encontrado.';
    elements.vehicleList.append(empty);
    return;
  }

  matches.forEach(vehicle => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'vehicle-card';
    button.addEventListener('click', () => selectVehicle(vehicle));

    if (vehicle.image) {
      const image = document.createElement('img');
      image.src = vehicle.image;
      image.alt = vehicleTitle(vehicle);
      image.loading = 'lazy';
      button.append(image);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'image-placeholder';
      placeholder.textContent = 'DV';
      button.append(placeholder);
    }

    const info = document.createElement('div');
    info.className = 'vehicle-info';
    const title = document.createElement('strong');
    title.textContent = vehicleTitle(vehicle);
    const subtitle = document.createElement('span');
    subtitle.textContent = vehicleSubtitle(vehicle);
    const price = document.createElement('b');
    price.textContent = formatPrice(vehicle.price);
    info.append(title, subtitle, price);
    button.append(info);
    elements.vehicleList.append(button);
  });
}

function refreshDraft() {
  if (!state.selected) return;
  state.messages = composeVehicleSequence(
    state.selected,
    state.config.siteUrl,
    elements.templateSelect.value,
    state.customerName
  );
  state.currentMessage = 0;
  renderMedia();
  renderMessageSequence();
}

async function imageAsPngBlob(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Imagem indisponível (${response.status})`);
  const sourceBlob = await response.blob();
  const bitmap = await createImageBitmap(sourceBlob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d');
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  return await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Falha ao preparar a imagem.')), 'image/png'));
}

async function imageAsAttachment(url, index) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Foto ${index + 1} indisponível (${response.status})`);
  const bitmap = await createImageBitmap(await response.blob());
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Falha ao preparar foto.')), 'image/jpeg', .86));
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Falha ao ler foto.'));
    reader.readAsDataURL(blob);
  });
  return { name: `dourado-veiculo-${String(index + 1).padStart(2, '0')}.jpg`, type: 'image/jpeg', dataUrl };
}

async function attachAllPhotos() {
  const urls = state.selected?.images?.slice(0, 10) || [];
  if (!urls.length) return showToast('Este veículo ainda não possui fotos.');
  const tab = await getActiveWhatsAppTab();
  if (!tab) return showToast('Abra a conversa do cliente no WhatsApp Web.');
  const originalLabel = elements.attachAllButton.textContent;
  elements.attachAllButton.disabled = true;
  try {
    elements.attachAllButton.textContent = `Preparando 0/${urls.length}`;
    const attachments = [];
    for (let index = 0; index < urls.length; index += 1) {
      attachments.push(await imageAsAttachment(urls[index], index));
      elements.attachAllButton.textContent = `Preparando ${index + 1}/${urls.length}`;
    }
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'ATTACH_IMAGES', images: attachments });
    if (!response?.ok) throw new Error(response?.error || 'O WhatsApp não aceitou os anexos.');
    showToast(`${attachments.length} fotos anexadas. Confira a prévia antes de enviar.`);
  } catch (error) {
    showToast(error?.message || 'Não foi possível anexar as fotos. Use “Baixar fotos”.');
  } finally {
    elements.attachAllButton.disabled = false;
    elements.attachAllButton.textContent = originalLabel;
  }
}

async function downloadAllPhotos() {
  const urls = state.selected?.images?.slice(0, 10) || [];
  if (!urls.length) return showToast('Este veículo ainda não possui fotos.');
  const folder = vehicleTitle(state.selected).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'veiculo';
  await Promise.all(urls.map((url, index) => chrome.downloads.download({
    url,
    filename: `Dourado-${folder}/foto-${String(index + 1).padStart(2, '0')}.jpg`,
    saveAs: false,
  })));
  showToast(`${urls.length} fotos enviadas para Downloads.`);
}

async function copyImage(url, button) {
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = 'Preparando...';
  try {
    const pngBlob = await imageAsPngBlob(url);
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
    showToast('Foto copiada. Clique na conversa e pressione Ctrl+V.');
  } catch (error) {
    showToast(error?.message || 'Não foi possível copiar a foto.');
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
}

function renderMedia() {
  elements.mediaList.replaceChildren();
  const images = state.selected?.images?.slice(0, 10) || [];
  const videos = state.selected?.videos?.slice(0, 2) || [];
  elements.mediaSection.hidden = images.length === 0 && videos.length === 0;

  images.forEach((url, index) => {
    const card = document.createElement('div');
    card.className = 'media-card';
    const image = document.createElement('img');
    image.src = url;
    image.alt = `Foto ${index + 1}`;
    image.loading = 'lazy';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `Copiar foto ${index + 1}`;
    button.addEventListener('click', () => copyImage(url, button));
    card.append(image, button);
    elements.mediaList.append(card);
  });

  videos.forEach((url, index) => {
    const card = document.createElement('div');
    card.className = 'media-card';
    const preview = document.createElement('div');
    preview.className = 'video-card';
    preview.textContent = '▶';
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.textContent = `Abrir vídeo ${index + 1}`;
    card.append(preview, link);
    elements.mediaList.append(card);
  });
}

function renderMessageSequence() {
  elements.messageSequence.replaceChildren();
  const completed = state.currentMessage >= state.messages.length;
  elements.sequenceProgress.textContent = completed ? 'Sequência concluída' : `${state.currentMessage + 1} de ${state.messages.length}`;
  elements.insertButton.disabled = completed;
  elements.insertButton.textContent = completed ? 'Concluído' : 'Inserir próxima';
  state.messages.forEach((message, index) => {
    const item = document.createElement('div');
    item.className = `message-item${index === state.currentMessage ? ' active' : ''}${index < state.currentMessage ? ' sent' : ''}`;
    const number = document.createElement('span');
    number.className = 'message-number';
    number.textContent = String(index + 1);
    const textarea = document.createElement('textarea');
    textarea.value = message;
    textarea.rows = message.includes('http') ? 3 : 4;
    textarea.title = 'Clique para copiar esta mensagem';
    textarea.addEventListener('input', () => { state.messages[index] = textarea.value; });
    textarea.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(textarea.value);
        showToast(`Mensagem ${index + 1} copiada.`);
      } catch {
        showToast('Não foi possível copiar esta mensagem.');
      }
    });
    textarea.addEventListener('focus', () => {
      state.currentMessage = index;
      elements.sequenceProgress.textContent = `${index + 1} de ${state.messages.length}`;
      [...elements.messageSequence.children].forEach((element, itemIndex) => {
        element.classList.toggle('active', itemIndex === index);
        element.classList.toggle('sent', itemIndex < index);
      });
    });
    item.append(number, textarea);
    elements.messageSequence.append(item);
  });
}

function selectVehicle(vehicle) {
  state.selected = vehicle;
  elements.selectedVehicleTitle.textContent = vehicleTitle(vehicle);
  elements.templateSelect.value = 'details';
  refreshDraft();
  elements.composerPanel.hidden = false;
}

async function getActiveWhatsAppTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const active = tabs[0];
  if (!active?.id || !active.url?.startsWith('https://web.whatsapp.com/')) return null;
  return active;
}

async function refreshChatContext() {
  const tab = await getActiveWhatsAppTab();
  if (!tab) {
    state.customerName = '';
    elements.customerName.textContent = 'Abra o WhatsApp Web';
    elements.chatContext.classList.remove('connected');
    return;
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_CHAT_CONTEXT' });
    state.customerName = response?.customerName || '';
    elements.customerName.textContent = response?.hasOpenChat
      ? (state.customerName || 'Conversa aberta')
      : 'Selecione uma conversa';
    elements.chatContext.classList.toggle('connected', Boolean(response?.hasOpenChat));
  } catch {
    elements.customerName.textContent = 'Recarregue o WhatsApp Web';
    elements.chatContext.classList.remove('connected');
  }
}

async function loadInventory() {
  elements.inventoryStatus.textContent = 'Sincronizando estoque...';
  elements.refreshButton.disabled = true;
  try {
    const baseUrl = `${state.config.supabaseUrl.replace(/\/$/, '')}/rest/v1`;
    const headers = {
      apikey: state.config.supabaseAnonKey,
      Authorization: `Bearer ${state.config.supabaseAnonKey}`
    };
    const vehicleSelect = 'id,brand,model,version,year,price,mileage,transmission,fuel,color,description,cover_image,featured,sold,status,created_at,categories(name),vehicle_images(image_url,display_order),vehicle_features(feature)';
    const [vehicleResponse, videoResponse] = await Promise.all([
      fetch(`${baseUrl}/vehicles?select=${encodeURIComponent(vehicleSelect)}&order=featured.desc,created_at.desc`, { headers }),
      fetch(`${baseUrl}/vehicle_videos?select=${encodeURIComponent('vehicle_id,video_url,provider')}`, { headers }).catch(() => null)
    ]);
    if (!vehicleResponse.ok) {
      const details = await vehicleResponse.json().catch(() => null);
      throw new Error(details?.message || `Catálogo indisponível (${vehicleResponse.status})`);
    }

    const rows = await vehicleResponse.json();
    const videoRows = videoResponse?.ok ? await videoResponse.json() : [];
    const videosByVehicle = videoRows.reduce((map, video) => {
      const current = map.get(video.vehicle_id) || [];
      current.push(video);
      map.set(video.vehicle_id, current);
      return map;
    }, new Map());
    state.vehicles = rows
      .map(row => normalizeVehicle({ ...row, vehicle_videos: videosByVehicle.get(row.id) || [] }))
      .filter(vehicle => !vehicle.sold);
    renderVehicles();
  } catch (error) {
    state.vehicles = [];
    renderVehicles();
    elements.inventoryStatus.textContent = error.message || 'Não foi possível carregar o estoque.';
  } finally {
    elements.refreshButton.disabled = false;
  }
}

async function insertInConversation() {
  const text = state.messages[state.currentMessage]?.trim();
  if (!text) return showToast('Escreva uma mensagem antes de inserir.');
  const tab = await getActiveWhatsAppTab();
  if (!tab) return showToast('Abra o WhatsApp Web nesta janela.');

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'INSERT_DRAFT', text });
    if (response?.ok) {
      state.currentMessage = Math.min(state.currentMessage + 1, state.messages.length);
      renderMessageSequence();
      showToast('Rascunho inserido. Envie e continue para o próximo.');
    } else {
      showToast(response?.error || 'Não foi possível inserir.');
    }
  } catch {
    showToast('Recarregue o WhatsApp Web e tente novamente.');
  }
}

async function loadConfig() {
  const saved = await chrome.storage.sync.get(DEFAULT_CONFIG);
  state.config = { ...DEFAULT_CONFIG, ...saved };
}

elements.searchInput.addEventListener('input', renderVehicles);
elements.templateSelect.addEventListener('change', refreshDraft);
elements.closeComposer.addEventListener('click', () => { elements.composerPanel.hidden = true; });
elements.refreshButton.addEventListener('click', async () => { await Promise.all([refreshChatContext(), loadInventory()]); showToast('Estoque atualizado.'); });
elements.copyButton.addEventListener('click', async () => { await navigator.clipboard.writeText(state.messages[state.currentMessage] || ''); showToast('Mensagem atual copiada.'); });
elements.insertButton.addEventListener('click', insertInConversation);
elements.attachAllButton.addEventListener('click', attachAllPhotos);
elements.downloadAllButton.addEventListener('click', downloadAllPhotos);
chrome.tabs.onActivated.addListener(refreshChatContext);
chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => { if (changeInfo.status === 'complete') refreshChatContext(); });

await loadConfig();
await Promise.all([refreshChatContext(), loadInventory()]);
