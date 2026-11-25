const { execSync } = require('child_process');
const fs = require('fs');

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log('\n📖 COMO USAR:');
    console.log('   node preparar.js <arquivo> [inicio] [duracao] [qualidade]');
    console.log('\n💡 EXEMPLOS:');
    console.log('   node preparar.js video.mp4');
    console.log('   node preparar.js meme.mp4 00:00:02 5 45');
    console.log('   node preparar.js clipe.mp4 3 4 auto\n');
    process.exit(0);
}

const ARQUIVO_ENTRADA = args.at(0);
const INICIO_SEGUNDOS = args.at(1) || "0";
const DURACAO_SEGUNDOS = parseFloat(args.at(2)) || 5;
const QUALIDADE_ARG = args.at(3) || "auto";

if (!fs.existsSync(ARQUIVO_ENTRADA)) {
    console.error(`❌ Arquivo "${ARQUIVO_ENTRADA}" não encontrado!`);
    process.exit(1);
}

function gerarWebp(qualidade) {
    execSync(`ffmpeg -y -i "${ARQUIVO_ENTRADA}" -ss ${INICIO_SEGUNDOS} -t ${DURACAO_SEGUNDOS} -vcodec libwebp -vf "setpts=PTS-STARTPTS,scale=512:512:force_original_aspect_ratio=increase,crop=512:512,fps=12" -q:v ${qualidade} -compression_level 6 -loop 0 -preset default -an figurinha.webp`, { stdio: 'ignore' });
    return Math.round(fs.statSync('figurinha.webp').size / 1024);
}

console.log(`✂️ Processando "${ARQUIVO_ENTRADA}" (Início: ${INICIO_SEGUNDOS}s | Duração: ${DURACAO_SEGUNDOS}s)...`);

try {
    let tamanhoKB = 0;
    let qualidadeUsada = 50;

    if (QUALIDADE_ARG.toLowerCase() === 'auto') {
        const niveis = new Array(55, 45, 35, 25, 18);
        for (const q of niveis) {
            qualidadeUsada = q;
            tamanhoKB = gerarWebp(q);
            if (tamanhoKB <= 480) break;
        }
    } else {
        qualidadeUsada = parseInt(QUALIDADE_ARG) || 45;
        tamanhoKB = gerarWebp(qualidadeUsada);
    }

    execSync(`ffmpeg -y -ss ${INICIO_SEGUNDOS} -i "${ARQUIVO_ENTRADA}" -t ${DURACAO_SEGUNDOS} -vn -af "aresample=async=1,asetpts=PTS-STARTPTS" -c:a libopus -application voip -vbr off -ac 1 -ar 48000 -b:a 24k audio.ogg`, { stdio: 'ignore' });

    const duracaoReal = parseFloat(execSync('ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 audio.ogg').toString().trim());

    fs.writeFileSync('meta.json', JSON.stringify({ duracao: Math.ceil(duracaoReal) }));

    console.log(`✅ Pronto para envio!`);
    console.log(`   🖼️ figurinha.webp: ${tamanhoKB} KB (Qualidade: ${qualidadeUsada})`);
    console.log(`   🔊 audio.ogg: ${duracaoReal.toFixed(2)}s`);

    if (tamanhoKB > 500) {
        console.log('⚠️ Aviso: Mesmo na qualidade mínima passou de 500 KB. Tente diminuir a duração!');
    }
} catch (erro) {
    console.error('❌ Erro no FFmpeg:', erro.message);
}