const STOPWORDS = new Set([
    'apa','itu','ini','yang','dan','di','ke','dari','untuk','dengan',
    'adalah','ada','tidak','bisa','cara','bagaimana','saya','kamu',
    'anda','nya','lah','kah','pun','juga','atau','tapi','namun',
    'sudah','belum','akan','sedang','harus','mau','ingin','dong',
    'sangat','lebih','paling','banget','sekali','ya','yuk','boleh',
    'gimana','kayak','kaya','gitu','gini','tuh','deh','sih','nih',
    'buat','supaya','agar','kalau','jika','apakah','bagus','baik'
]);

const TOPIC_MAP = {
    undertone:    ['undertone','warm','cool','neutral','hangat','sejuk','warna','dasar','nuansa'],
    detection:    ['deteksi','tentukan','cek','tes','test','mengetahui','tahu','tau','menentukan','mendeteksi'],
    foundation:   ['foundation','shade','bedak','cushion','concealer','bb','cc','cocok','match','sesuai','pilih','memilih'],
    oily_skin:    ['berminyak','oily','minyak','pore','pori','matte','kilap'],
    dry_skin:     ['kering','dry','dehidrasi','lembab','moisturizer','hydrating','bersisik'],
    sensitive:    ['sensitif','sensitive','alergi','iritasi','merah','reaksi','hypoallergenic'],
    combination:  ['kombinasi','combination','tzone','dahi','hidung'],
    skin_type:    ['kulit','skin','normal','jenis','tipe'],
    foundation_apply: ['pakai','aplikasi','brush','kuas','blender','teknik','mengaplikasikan'],
    skincare:     ['skincare','serum','moisturizer','toner','essence','vitamin','niacinamide','retinol','spf','sunscreen'],
    lip:          ['lipstik','lipstick','lip','bibir','gloss','tint','matte','satin'],
    eye:          ['eyeliner','eyeshadow','mascara','mata','bulu','brow','alis'],
    blush:        ['blush','bronzer','contour','highlight','pipi','blush on'],
    primer:       ['primer','pori','halus','tahan','lama','longlasting'],
    setting:      ['setting','powder','spray','tahan','awet','longlasting','finishing'],
    skincare_routine: ['routine','rutinitas','langkah','step','pagi','malam','order','urutan'],
    acne:         ['jerawat','acne','pimple','komedo','breakout','blemish'],
    hyperpigmentation: ['flek','bekas','hiperpigmentasi','dark spot','merata','cerah','brightening'],
    difference:   ['perbedaan','beda','bedanya','versus','vs','perbandingan','antara'],
};

const RESPONSES = {
    greeting:
        'Halo! Saya M3-Shade Assistant. Saya siap membantu kamu seputar dunia kecantikan, mulai dari makeup, skincare, hingga tips memilih produk yang tepat untuk kulitmu. Tanyakan apa saja!',

    undertone_info:
        'Undertone adalah warna dasar di bawah permukaan kulit yang berbeda dari warna kulit yang terlihat langsung.\n\nCool undertone: ada nuansa kebiruan atau pink. Cocok dengan shade bernuansa pink atau rosy.\n\nWarm undertone: ada nuansa kekuningan atau peach. Cocok dengan shade bernuansa kuning atau golden.\n\nNeutral undertone: campuran cool dan warm. Cocok dengan hampir semua shade.',

    undertone_compare:
        'Perbedaan ketiga jenis undertone:\n\nCool: kulit bernuansa pink atau kebiruan. Urat nadi terlihat kebiruan/ungu. Cocok dengan silver dan warna jewel tones.\n\nWarm: kulit bernuansa kuning atau peach. Urat nadi terlihat kehijauan. Cocok dengan gold dan warna earth tones.\n\nNeutral: campuran keduanya. Urat nadi terlihat campuran biru-hijau. Paling fleksibel dalam memilih shade.',

    undertone_detect:
        'Cara mendeteksi undertone kulit:\n\nMetode urat nadi: Lihat urat nadi di pergelangan tangan di cahaya natural.\n- Kebiruan/ungu = cool undertone\n- Kehijauan = warm undertone\n- Campuran keduanya = neutral\n\nMetode sinar matahari:\n- Kulitmu cenderung memerah = cool\n- Kulitmu cenderung menguning atau tan = warm\n\nMetode perhiasan:\n- Silver lebih cocok = cool\n- Gold lebih cocok = warm\n- Keduanya cocok = neutral',

    foundation_tips:
        'Tips memilih shade foundation yang tepat:\n\n1. Kenali undertone dulu agar foundation terlihat natural di kulit.\n2. Tes di garis rahang, bukan di tangan, karena warna bisa berbeda.\n3. Cek di cahaya natural karena pencahayaan toko bisa menipu.\n4. Shade yang tepat akan menyatu di kulit, tidak terlalu terang dan tidak terlalu gelap.\n5. Gunakan fitur Find Your Shade di website ini untuk rekomendasi otomatis berdasarkan fotomu.',

    skin_oily:
        'Tips untuk kulit berminyak:\n\nPilih produk dengan formula:\n- Matte atau satin finish untuk mengurangi kilap\n- Oil-free dan non-comedogenic agar tidak menyumbat pori\n- Water-based yang lebih ringan\n- Kandungan niacinamide atau salicylic acid untuk kontrol minyak\n\nHindari produk berbasis minyak atau formula dewy.\n\nUntuk foundation, pilih 1 shade lebih terang karena kulit berminyak cenderung mengoksidasi warna.',

    dry_skin:
        'Tips untuk kulit kering:\n\nPilih produk dengan formula:\n- Dewy atau luminous finish untuk efek segar\n- Hydrating dengan kandungan hyaluronic acid atau glycerin\n- Liquid atau cushion foundation yang melembabkan\n\nHindari powder foundation atau formula matte yang bisa terlihat cakey.\n\nSelalu gunakan moisturizer sebelum makeup untuk hasil yang lebih mulus.',

    sensitive:
        'Tips untuk kulit sensitif:\n\nPilih produk berlabel:\n- Hypoallergenic (tidak mudah memicu alergi)\n- Fragrance-free (bebas pewangi)\n- Dermatologist tested\n- Non-comedogenic\n\nHindari produk dengan alkohol tinggi, pewangi, atau bahan aktif yang terlalu kuat.\n\nSelalu lakukan patch test di area kecil kulit sebelum menggunakan produk baru. Tunggu 24 jam untuk memastikan tidak ada reaksi.',

    combination:
        'Tips untuk kulit kombinasi:\n\nKulit kombinasi biasanya berminyak di T-zone (dahi, hidung, dagu) dan normal atau kering di pipi.\n\nStrategi:\n- Gunakan primer mattifying hanya di area T-zone\n- Foundation water-based atau satin finish cocok untuk kulit kombinasi\n- Setting powder tipis di area berminyak saja\n- Moisturizer ringan di area yang lebih kering',

    foundation_apply:
        'Cara mengaplikasikan foundation agar hasilnya natural:\n\n- Beauty blender lembap: tepuk-tepuk, jangan digosok, untuk hasil seamless\n- Kuas flat: sapukan melingkar untuk coverage lebih penuh\n- Jari: kehangatan jari membantu foundation menyatu, cocok untuk formula ringan\n\nUrutan:\n1. Skincare dan primer\n2. Concealer di area bermasalah\n3. Foundation tipis berlapis\n4. Setting powder atau spray',

    skincare:
        'Tips dasar skincare:\n\nUrutan pagi: cleanser, toner, serum, moisturizer, sunscreen.\nUrutan malam: cleanser, toner, treatment (retinol/AHA/BHA), serum, moisturizer.\n\nBahan aktif populer:\n- Niacinamide: mengecilkan pori, meratakan warna kulit\n- Hyaluronic acid: melembabkan\n- Retinol: anti-aging, mempercepat regenerasi sel\n- Vitamin C: mencerahkan dan antioksidan\n- SPF: wajib setiap hari untuk melindungi dari sinar UV',

    lip:
        'Tips memilih dan memakai produk bibir:\n\nJenis formula:\n- Matte: tahan lama, cocok untuk lipstik bold\n- Satin/cream: nyaman dipakai, tidak terlalu kering\n- Gloss: memberikan kesan bibir penuh dan berkilau\n- Lip tint: warna natural, ringan di bibir\n\nTips agar lipstik tahan lama:\n1. Gunakan lip liner sebagai base\n2. Aplikasikan lipstik lapis pertama, tisu, lalu lapis kedua\n3. Setting dengan bedak tipis di atas lipstik',

    eye:
        'Tips makeup mata:\n\nEyeliner:\n- Pencil: mudah diblending, cocok untuk smokey eye\n- Gel: presisi dan tahan lama\n- Liquid: garis paling tajam\n\nMascara:\n- Volumizing: untuk bulu mata lebih tebal\n- Lengthening: untuk bulu mata lebih panjang\n- Waterproof: tahan air dan tahan lama\n\nEyeshadow:\n- Selalu gunakan primer mata agar warna lebih pigmented dan tahan lama\n- Blend dengan baik untuk transisi warna yang mulus',

    blush:
        'Tips memilih blush, bronzer, dan highlighter:\n\nBlush:\n- Kulit fair: pilih warna peach atau pink muda\n- Kulit medium: pilih dusty rose atau coral\n- Kulit tan hingga deep: pilih berry, brick, atau warm brown\n\nBronzer:\n- Aplikasikan di area yang terkena matahari: dahi, hidung, tulang pipi, dagu\n- Pilih 1-2 shade lebih gelap dari warna kulitmu\n\nHighlighter:\n- Aplikasikan di tulang pipi, ujung hidung, dan cupids bow\n- Kulit berminyak pilih formula powder, kulit kering pilih formula cream',

    primer:
        'Jenis primer dan fungsinya:\n\n- Pore-minimizing primer: menyamarkan pori dan meratakan permukaan kulit\n- Hydrating primer: cocok untuk kulit kering, memberikan kelembaban ekstra\n- Mattifying primer: mengontrol minyak, cocok untuk kulit berminyak\n- Color-correcting primer: hijau untuk menetralkan kemerahan, lavender untuk mencerahkan\n\nCara pakai: aplikasikan setelah skincare, tunggu 1-2 menit sebelum foundation.',

    setting:
        'Cara agar makeup tahan lama:\n\n- Setting powder: aplikasikan tipis di area berminyak dengan kuas atau beauty sponge. Pilih translucent powder agar tidak mengubah warna foundation.\n- Setting spray: semprotkan dari jarak 20-30cm setelah seluruh makeup selesai. Bisa juga disemprotkan di beauty blender sebelum aplikasi foundation untuk hasil lebih natural.\n- Blotting paper: untuk menyerap minyak di tengah hari tanpa merusak makeup.',

    skincare_routine:
        'Urutan skincare yang benar:\n\nPagi hari:\n1. Cleanser (sabun muka)\n2. Toner\n3. Serum\n4. Eye cream (opsional)\n5. Moisturizer\n6. Sunscreen (wajib)\n\nMalam hari:\n1. Makeup remover / micellar water\n2. Cleanser\n3. Toner\n4. Treatment (retinol, AHA/BHA - tidak setiap malam untuk pemula)\n5. Serum\n6. Eye cream (opsional)\n7. Moisturizer / night cream',

    acne:
        'Tips mengatasi jerawat dengan makeup:\n\nSkincare:\n- Gunakan produk dengan salicylic acid atau benzoyl peroxide\n- Jangan memencet jerawat karena bisa meninggalkan bekas\n- Selalu bersihkan makeup sebelum tidur\n\nMakeup:\n- Pilih produk non-comedogenic dan oil-free\n- Gunakan color corrector hijau untuk menetralkan kemerahan jerawat\n- Concealer dengan formula buildable untuk menutupi jerawat tanpa terlihat cakey\n- Hindari produk dengan kandungan minyak tinggi',

    hyperpigmentation:
        'Tips mengatasi flek dan bekas jerawat:\n\nSkincare:\n- Vitamin C: mencerahkan dan meratakan warna kulit\n- Niacinamide: mengurangi produksi melanin\n- Alpha arbutin: mencerahkan dark spot\n- Sunscreen: wajib setiap hari agar flek tidak semakin gelap\n- AHA (glycolic/lactic acid): eksfoliasi untuk meratakan tekstur\n\nMakeup:\n- Color corrector peach atau orange untuk dark spot sebelum concealer\n- Foundation dengan coverage medium hingga full untuk menutupi flek',

    fallback:
        'Maaf, saya belum bisa menjawab pertanyaan itu.\n\nSaya bisa membantu seputar:\n- Undertone kulit dan cara mendeteksinya\n- Tips memilih foundation sesuai kulit\n- Perawatan kulit berminyak, kering, sensitif, atau kombinasi\n- Skincare routine dan bahan aktif\n- Tips makeup: lip, eye, blush, bronzer, primer, setting\n- Mengatasi jerawat dan flek hitam\n\nCoba tanyakan salah satu topik di atas!'
};

function tokenize(text) {
    return text.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter(t => t.length > 1);
}

function extractKeywords(text) {
    return tokenize(text).filter(t => !STOPWORDS.has(t));
}

function extractTopics(keywords) {
    const scores = {};
    for (const [topic, kws] of Object.entries(TOPIC_MAP)) {
        scores[topic] = keywords.filter(k => kws.includes(k)).length;
    }
    return Object.entries(scores).filter(([, s]) => s > 0).sort(([, a], [, b]) => b - a).map(([t]) => t);
}

function classifyIntent(keywords, topics) {
    const tp = new Set(topics);
    const kw = new Set(keywords);
    if (tp.has('undertone') && tp.has('detection'))        return 'undertone_detect';
    if (tp.has('undertone') && tp.has('difference'))       return 'undertone_compare';
    if (tp.has('undertone'))                               return 'undertone_info';
    if (tp.has('acne'))                                    return 'acne';
    if (tp.has('hyperpigmentation'))                       return 'hyperpigmentation';
    if (tp.has('sensitive'))                               return 'sensitive';
    if (tp.has('combination'))                             return 'combination';
    if (tp.has('oily_skin'))                               return 'skin_oily';
    if (tp.has('dry_skin'))                                return 'dry_skin';
    if (tp.has('skincare_routine'))                        return 'skincare_routine';
    if (tp.has('skincare'))                                return 'skincare';
    if (tp.has('lip'))                                     return 'lip';
    if (tp.has('eye'))                                     return 'eye';
    if (tp.has('blush'))                                   return 'blush';
    if (tp.has('primer'))                                  return 'primer';
    if (tp.has('setting'))                                 return 'setting';
    if (tp.has('foundation_apply'))                        return 'foundation_apply';
    if (tp.has('foundation') || tp.has('skin_type'))       return 'foundation_tips';
    if (kw.has('halo') || kw.has('hai') || kw.has('hello') || kw.has('hi') || kw.has('hey')) return 'greeting';
    return 'fallback';
}

function processMessage(text) {
    const keywords = extractKeywords(text);
    const topics   = extractTopics(keywords);
    const intent   = classifyIntent(keywords, topics);
    const response = RESPONSES[intent] || RESPONSES.fallback;
    return { response, keywords };
}

const messagesContainer = document.getElementById('messages-container');
const messageInput      = document.getElementById('message-input');
const sendButton        = document.getElementById('send-button');

function appendMessage(role, text) {
    const div    = document.createElement('div');
    div.className = `message message-${role}`;
    const bubble  = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.innerHTML = text.replace(/\n/g, '<br>');
    div.appendChild(bubble);
    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function appendTyping() {
    const div = document.createElement('div');
    div.className = 'message message-bot';
    div.id = 'typing-indicator';
    div.innerHTML = `<div class="message-bubble"><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;
    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function removeTyping() {
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
}

function appendKeywords(keywords) {
    if (!keywords.length) return;
    const el = document.createElement('div');
    el.className = 'keywords-display';
    el.textContent = `Kata kunci terdeteksi: ${keywords.join(', ')}`;
    messagesContainer.appendChild(el);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function sendMessage(text) {
    text = text.trim();
    if (!text) return;
    appendMessage('user', text);
    messageInput.value  = '';
    sendButton.disabled = true;
    appendTyping();
    setTimeout(() => {
        removeTyping();
        const { response, keywords } = processMessage(text);
        appendMessage('bot', response);
        appendKeywords(keywords);
        sendButton.disabled = false;
        messageInput.focus();
    }, 700);
}

sendButton.addEventListener('click', () => sendMessage(messageInput.value));
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(messageInput.value); }
});

function sendSuggestion(text) {
    messageInput.value = text;
    sendMessage(text);
}

window.addEventListener('load', () => {
    appendMessage('bot', 'Halo! Saya M3-Shade Assistant. Tanyakan apa saja seputar kecantikan, mulai dari makeup, skincare, tips memilih produk, hingga perawatan berbagai jenis kulit!');
});