# Figaudio by weathercat 💟+🔊

#🔊 Gerador de Figurinhas com Áudio para WhatsApp

Ferramenta de linha de comando para recortar vídeos em formato quadrado (sem bordas), sincronizar o áudio e enviar figurinhas com som diretamente para o seu WhatsApp.

---

## 📋 1. Pré-requisitos (Windows)

Antes de rodar pela primeira vez, instale o **Node.js** e o **FFmpeg**. Abra o **PowerShell** e execute:

```powershell
winget install OpenJS.NodeJS.LTS
winget install Gyan.FFmpeg
```
> **Importante:** Após a instalação terminar, **feche e abra o PowerShell novamente** para o Windows reconhecer os comandos.

---

## ⚙️ 2. Instalação do Projeto

1. Extraia os arquivos em uma pasta (ex: `bot-figurinha`).
2. Abra o PowerShell dentro dessa pasta.
3. Libere a execução de scripts na sessão atual e instale as dependências:

```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
npm install
```

---

## ✂️ 3. Passo 1: Preparar e Recortar o Vídeo

Coloque o arquivo de vídeo (`.mp4`) dentro da pasta do projeto e execute:

```powershell
node preparar.js <arquivo> [inicio] [duracao] [qualidade]
```

### Exemplos de uso:
* **Modo rápido (usa o vídeo inteiro até 5s e ajusta a qualidade sozinho):**
  ```powershell
  node preparar.js video.mp4
  ```
* **Corte personalizado (começa aos 2 segundos, dura 4 segundos, qualidade automática):**
  ```powershell
  node preparar.js meme.mp4 2 4 auto
  ```
* **Controle manual de qualidade (de `1` a `100` — mantenha abaixo de 500 KB):**
  ```powershell
  node preparar.js meme.mp4 00:00:03 5 45
  ```

> **Dica:** Antes de enviar, dê dois cliques no arquivo `figurinha.webp` gerado na pasta para visualizar no navegador como ficou o corte quadrado.

---

## 🚀 4. Passo 2: Enviar para o seu WhatsApp

Com a figurinha preparada, envie para o seu próprio chat ("Você"):

```powershell
node enviar.js
```

Ou personalize o texto que aparece ao tocar na figurinha:
```powershell
node enviar.js "Nome do Pacote" "@SeuUsuario"
```

### Primeira conexão:
1. Na primeira vez que rodar `node enviar.js`, um **QR Code** aparecerá no terminal.
2. No seu celular, abra o WhatsApp > **Aparelhos conectados** > **Conectar aparelho** e escaneie o código.
3. A figurinha será enviada automaticamente para o seu chat. Salve nos **Favoritos** pelo celular para encaminhar para qualquer conversa!

---

## ⚠️ Boas práticas e Solução de Problemas

* **Evite bloqueios:** Use apenas para gerar figurinhas próprias no seu chat e evite disparar dezenas seguidas em poucos segundos.
* **Erro `Bad MAC` no terminal:** Caso o terminal mostre erros de sessão ao reconectar após muito tempo, apague os arquivos de cache de sessão e rode novamente:
  ```powershell
  Remove-Item .\sessao_wpp\session-*.json -Force
  node enviar.js
  ```
