const { execSync } = require('child_process');
const fs = require('fs');

// Uso: node combinar.js <imagem_ou_webp> <audio_mp3> [inicio_audio] [duracao]
const args = process.argv.slice(2);

if (args.length < 2 || args.includes('--help') || args.includes('-h')) {
    console.log('\n📖 COMO USAR:');
    console.log('   node combinar.js <imagem_ou_figurinha> <arquivo_audio> [inicio_audio] [duracao]');
    console.log('\n💡 EXEMPLOS:');
    console.log('   node combinar.js minha_fig.webp musica.mp3');
    console.log('   node combinar.js foto.png efeito.mp3 00:00:10 5');
    console.log('   node combinar.js video.mp4 outro_audio.mp3 2 6\n');
    process.exit(0);
}

const ARQUIVO_VISUAL = args.at(0);
const ARQUIVO_AUDIO = args.at(1);
const INICIO_AUDIO = args.at(2) || "0";
const DURACAO = parseFloat(args.at(3)) || 8; // Até 8 segundos para áudios

if (!fs.existsSync(ARQUIVO_VISUAL)) {
    console.error(`❌ Arquivo visual "${ARQUIVO_VISUAL}" não encontrado!`);
    process.exit(1);
}

if (!fs.existsSync(ARQUIVO_AUDIO)) {
    console.error(`❌ Arquivo de áudio "${ARQUIVO_AUDIO}" não encontrado!`);
    process.exit(1);
}

console.log(`🎛️ Combinando "${ARQUIVO_VISUAL}" + "${ARQUIVO_AUDIO}"...`);

try {
    // 1. Prepara a parte visual (figurinha.webp)
    if (ARQUIVO_VISUAL.toLowerCase().endsWith('.webp')) {
        // Se já é uma figurinha .webp pronta, apenas copia mantendo a transparência/animação original!
        fs.copyFileSync(ARQUIVO_VISUAL, 'figurinha.webp');
    } else {
        // Se for .png, .jpg ou .mp4, converte para figurinha quadrada 512x512
        execSync(`ffmpeg -y -i "${ARQUIVO_VISUAL}" -t ${DURACAO} -vcodec libwebp -vf "scale=512:512:force_original_aspect_ratio=increase,crop=512:512,fps=12" -q:v 45 -compression_level 6 -loop 0 -preset default -an figurinha.webp`, { stdio: 'ignore' });
    }

    // 2. Converte e recorta o áudio (.mp3, .wav, etc.) para o padrão exato do WhatsApp (.ogg opus)
    execSync(`ffmpeg -y -i "${ARQUIVO_AUDIO}" -ss ${INICIO_AUDIO} -t ${DURACAO} -vn -af "asetpts=PTS-STARTPTS" -c:a libopus -ac 1 -ar 48000 -b:a 32k audio.ogg`, { stdio: 'ignore' });

    // 3. Lê a duração real do áudio convertido e salva no meta.json para o enviar.js
    const duracaoReal = parseFloat(execSync('ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 audio.ogg').toString().trim());
    fs.writeFileSync('meta.json', JSON.stringify({ duracao: Math.ceil(duracaoReal) }));

    const tamanhoKB = Math.round(fs.statSync('figurinha.webp').size / 1024);

    console.log(`✅ Pronto para envio!`);
    console.log(`   🖼️ figurinha.webp: ${tamanhoKB} KB`);
    console.log(`   🔊 audio.ogg: ${duracaoReal.toFixed(2)}s (convertido de ${ARQUIVO_AUDIO})`);
    console.log('\n🚀 Agora rode: node enviar.js\n');
} catch (erro) {
    console.error('❌ Erro ao processar arquivos:', erro.message);
}
