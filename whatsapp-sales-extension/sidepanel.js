import { DEFAULT_CONFIG, composeVehicleSequence, filterVehicles, normalizeVehicle, vehicleTitle } from './lib.js';

const state = { vehicles: [], selected: null, customerName: '', config: { ...DEFAULT_CONFIG }, messages: [], currentMessage: 0 };
const elements = Object.fromEntries([
  'chatContext', 'customerName', 'searchInput', 'inventoryStatus', 'vehicleList', 'composerPanel',
  'selectedVehicleTitle', 'templateSelect', 'messageSequence', 'sequenceProgress', 'closeComposer', 'copyButton',
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
  renderMessageSequence();
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
    textarea.addEventListener('input', () => { state.messages[index] = textarea.value; });
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
    const select = 'id,brand,model,version,year,price,mileage,transmission,fuel,cover_image,featured,sold,status,created_at,categories(name),vehicle_images(image_url,display_order),vehicle_videos(video_url,provider)';
    const response = await fetch(`${state.config.supabaseUrl.replace(/\/$/, '')}/rest/v1/vehicles?select=${encodeURIComponent(select)}&order=featured.desc,created_at.desc`, {
      headers: {
        apikey: state.config.supabaseAnonKey,
        Authorization: `Bearer ${state.config.supabaseAnonKey}`
      }
    });
    if (!response.ok) throw new Error(`Catálogo indisponível (${response.status})`);
    const rows = await response.json();
    state.vehicles = rows.map(normalizeVehicle).filter(vehicle => !vehicle.sold);
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
chrome.tabs.onActivated.addListener(refreshChatContext);
chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => { if (changeInfo.status === 'complete') refreshChatContext(); });

await loadConfig();
await Promise.all([refreshChatContext(), loadInventory()]);
