const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, prepareWAMessageMedia, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const crypto = require('crypto');
const pino = require('pino');

const filtrarLogsSignal = (metodoOriginal) => function (...args) {
    const msg = String(args[0] || '');
    if (msg.includes('Closing open session') || msg.includes('Closing session')) {
        return;
    }
    metodoOriginal.apply(console, args);
};

console.log = filtrarLogsSignal(console.log);
console.info = filtrarLogsSignal(console.info);
console.warn = filtrarLogsSignal(console.warn);

const args = process.argv.slice(2);
const NOME_PACOTE = args[0] || "vendo fig com audio no pix 3 conto 😂";
const AUTOR_PACOTE = args[1] || "@weathercat";

if (!fs.existsSync('figurinha.webp') || !fs.existsSync('audio.ogg')) {
    console.error('❌ Rode "node preparar.js <video>" primeiro!');
    process.exit(1);
}

let DURACAO_AUDIO = 5;
if (fs.existsSync('meta.json')) {
    DURACAO_AUDIO = JSON.parse(fs.readFileSync('meta.json', 'utf-8')).duracao || 5;
}

const Writer = proto.Message.encode(proto.Message.create()).constructor;
let jaEnviou = false;

function adicionarExifWhatsApp(caminhoWebp, packName, authorName) {
    const webpBuffer = fs.readFileSync(caminhoWebp);
    const json = {
        "sticker-pack-id": crypto.randomBytes(16).toString('hex'),
        "sticker-pack-name": packName,
        "sticker-pack-publisher": authorName,
        "emojis": ["😀"]
    };

    const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
    const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
    const exif = Buffer.concat([exifAttr, jsonBuff]);
    exif.writeUIntLE(jsonBuff.length, 14, 4);

    const chunkHeader = Buffer.alloc(8);
    chunkHeader.write("EXIF", 0);
    chunkHeader.writeUInt32LE(exif.length, 4);

    // Corrigido: Buffer.from([0x00]) garante 1 byte de padding quando o tamanho for ímpar
    const pad = exif.length % 2 === 1 ? Buffer.from([0x00]) : Buffer.alloc(0);
    const novoWebp = Buffer.concat([webpBuffer, chunkHeader, exif, pad]);
    novoWebp.writeUInt32LE(novoWebp.length - 8, 4);

    fs.writeFileSync(caminhoWebp, novoWebp);
}

function criarContextInfoPareado(fileSha256) {
    const inner74 = new Writer();
    inner74.uint32((1 << 3) | 0).uint32(1);
    inner74.uint32((2 << 3) | 2).bytes(fileSha256);
    const ctxWriter = new Writer();
    ctxWriter.uint32((74 << 3) | 2).bytes(inner74.finish());
    return ctxWriter.finish();
}

async function enviar() {
    const { state, saveCreds } = await useMultiFileAuthState('sessao_wpp');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: ['Windows', 'Chrome', '110.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('\n📱 Escaneie o QR Code no seu WhatsApp (Aparelhos Conectados):\n');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const deveReconectar = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (deveReconectar && !jaEnviou) setTimeout(enviar, 3000);
        }

        if (connection === 'open' && !jaEnviou) {
            jaEnviou = true;
            try {
                adicionarExifWhatsApp('figurinha.webp', NOME_PACOTE, AUTOR_PACOTE);

                console.log(`☁️ Enviando figurinha ("${NOME_PACOTE}" | ${AUTOR_PACOTE})...`);
                const midiaSticker = await prepareWAMessageMedia(
                    { sticker: fs.readFileSync('figurinha.webp'), isAnimated: true },
                    { upload: sock.waUploadToServer }
                );

                const midiaAudio = await prepareWAMessageMedia(
                    { audio: fs.readFileSync('audio.ogg'), mimetype: 'audio/ogg; codecs=opus' },
                    { upload: sock.waUploadToServer }
                );

                const s = midiaSticker.stickerMessage;
                s.width = 512;
                s.height = 512;
                s.isAnimated = true;
                s.stickerSentTs = Date.now();
                s.isAvatar = false;
                s.isAiSticker = false;
                s.isLottie = false;
                s.accessibilityLabel = '😀';

                const a = midiaAudio.audioMessage;
                a.mimetype = 'audio/ogg; codecs=opus';
                a.seconds = DURACAO_AUDIO;
                a.ptt = false;

                const stickerWriter = new Writer();
                proto.Message.StickerMessage.encode(s, stickerWriter);
                stickerWriter.uint32((17 << 3) | 2).bytes(criarContextInfoPareado(s.fileSha256));

                const audioWriter = new Writer();
                proto.Message.AudioMessage.encode(a, audioWriter);
                audioWriter.uint32((17 << 3) | 2).bytes(criarContextInfoPareado(a.fileSha256));

                stickerWriter.uint32((26 << 3) | 2).bytes(audioWriter.finish());
                const stickerComAudioBytes = stickerWriter.finish();

                const innerWriter = new Writer();
                innerWriter.uint32((26 << 3) | 2).bytes(stickerComAudioBytes);

                const wrapperWriter = new Writer();
                wrapperWriter.uint32((1 << 3) | 2).bytes(innerWriter.finish());
                const wrapperBytes = wrapperWriter.finish();

                const encodeOriginal = proto.Message.encode;
                proto.Message.encode = function(message, writer) {
                    if (message && message.stickerMessage && !message.deviceSentMessage && message.stickerMessage.accessibilityLabel === '😀') {
                        const w = new Writer();
                        w.uint32((134 << 3) | 2).bytes(wrapperBytes);
                        if (message.messageContextInfo) {
                            w.uint32((35 << 3) | 2).bytes(proto.MessageContextInfo.encode(message.messageContextInfo).finish());
                        }
                        w.finish();
                        if (writer) {
                            writer.head = w.head;
                            writer.tail = w.tail;
                            writer.len = w.len;
                            return writer;
                        }
                        return w;
                    }
                    return encodeOriginal.call(this, message, writer);
                };

                const meuNumero = sock.user.id.replace(/:.*$/, '') + '@s.whatsapp.net';
                const msgBase = generateWAMessageFromContent(meuNumero, {
                    stickerMessage: s
                }, { userJid: meuNumero });

                await sock.relayMessage(meuNumero, msgBase.message, {
                    messageId: msgBase.key.id
                });

                console.log('✅ ENVIADO! Confira seu WhatsApp!');
                setTimeout(() => process.exit(0), 2500);
            } catch (erro) {
                console.error('❌ Erro:', erro);
                process.exit(1);
            }
        }
    });
}

enviar();
