# Dourado Vendas no WhatsApp

Extensão Chrome Manifest V3 que abre um painel lateral no WhatsApp Web, consulta o estoque público da Dourado Veículos e prepara mensagens comerciais para revisão do vendedor.

## O que o MVP faz

- sincroniza somente os veículos disponíveis no Supabase;
- pesquisa por marca, modelo, versão, ano ou categoria;
- mostra foto, dados essenciais, quilometragem e preço;
- gera uma sequência de mensagens com emojis para detalhes, disponibilidade, financiamento ou troca;
- anexa até 10 fotos reais de uma vez na conversa, com revisão antes do envio e sem misturar frames do 360°;
- mantém a cópia individual e oferece o download das fotos como alternativa;
- abre vídeos cadastrados para o vendedor compartilhar quando disponíveis;
- reconhece o nome exibido na conversa quando o WhatsApp disponibiliza essa informação;
- copia ou insere cada mensagem separadamente como rascunho no campo da conversa;
- nunca envia automaticamente.

## Instalação local no Chrome

1. Abra `chrome://extensions`.
2. Ative **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação**.
4. Selecione a pasta `whatsapp-sales-extension`.
5. Abra ou recarregue `https://web.whatsapp.com`.
6. Clique no ícone da extensão para abrir o painel lateral.

## Configuração

O MVP já utiliza o projeto Supabase e o domínio público atuais. A configuração técnica não é exibida ao vendedor. Nunca coloque uma chave `service_role` na extensão.

## Limites intencionais

A estrutura do WhatsApp Web pode mudar. Por isso a extensão procura o editor por atributos semânticos e não dispara `Enter`. Se o WhatsApp alterar o campo de mensagem, atualize `findComposer()` em `content.js`.

O anexo múltiplo prepara as imagens e aciona o seletor de mídia do WhatsApp Web, mas nunca confirma o envio. Se a interface do WhatsApp mudar, use **Baixar fotos** e selecione os arquivos baixados na conversa.

Para publicar na Chrome Web Store, prepare ícones, política de privacidade e revise as permissões antes do envio.
