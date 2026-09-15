import { DEFAULT_CONFIG, composeVehicleMessage, filterVehicles, normalizeVehicle, vehicleTitle } from './lib.js';

const state = { vehicles: [], selected: null, customerName: '', config: { ...DEFAULT_CONFIG } };
const elements = Object.fromEntries([
  'chatContext', 'customerName', 'searchInput', 'inventoryStatus', 'vehicleList', 'composerPanel',
  'selectedVehicleTitle', 'templateSelect', 'messageDraft', 'closeComposer', 'copyButton',
  'insertButton', 'refreshButton', 'toast', 'siteUrl', 'supabaseUrl', 'supabaseAnonKey', 'saveSettings'
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
  elements.messageDraft.value = composeVehicleMessage(
    state.selected,
    state.config.siteUrl,
    elements.templateSelect.value,
    state.customerName
  );
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
    const select = 'id,brand,model,version,year,price,new_price,mileage,transmission,fuel,cover_image,featured,sold,status,created_at,categories(name),vehicle_images(image_url,display_order)';
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
  const text = elements.messageDraft.value.trim();
  if (!text) return showToast('Escreva uma mensagem antes de inserir.');
  const tab = await getActiveWhatsAppTab();
  if (!tab) return showToast('Abra o WhatsApp Web nesta janela.');

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'INSERT_DRAFT', text });
    showToast(response?.ok ? 'Mensagem inserida. Revise antes de enviar.' : (response?.error || 'Não foi possível inserir.'));
  } catch {
    showToast('Recarregue o WhatsApp Web e tente novamente.');
  }
}

async function loadConfig() {
  const saved = await chrome.storage.sync.get(DEFAULT_CONFIG);
  state.config = { ...DEFAULT_CONFIG, ...saved };
  elements.siteUrl.value = state.config.siteUrl;
  elements.supabaseUrl.value = state.config.supabaseUrl;
  elements.supabaseAnonKey.value = state.config.supabaseAnonKey;
}

elements.searchInput.addEventListener('input', renderVehicles);
elements.templateSelect.addEventListener('change', refreshDraft);
elements.closeComposer.addEventListener('click', () => { elements.composerPanel.hidden = true; });
elements.refreshButton.addEventListener('click', async () => { await Promise.all([refreshChatContext(), loadInventory()]); showToast('Estoque atualizado.'); });
elements.copyButton.addEventListener('click', async () => { await navigator.clipboard.writeText(elements.messageDraft.value); showToast('Mensagem copiada.'); });
elements.insertButton.addEventListener('click', insertInConversation);
elements.saveSettings.addEventListener('click', async () => {
  state.config = {
    siteUrl: elements.siteUrl.value.trim().replace(/\/$/, ''),
    supabaseUrl: elements.supabaseUrl.value.trim().replace(/\/$/, ''),
    supabaseAnonKey: elements.supabaseAnonKey.value.trim()
  };
  await chrome.storage.sync.set(state.config);
  showToast('Configuração salva.');
  await loadInventory();
});
chrome.tabs.onActivated.addListener(refreshChatContext);
chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => { if (changeInfo.status === 'complete') refreshChatContext(); });

await loadConfig();
await Promise.all([refreshChatContext(), loadInventory()]);
