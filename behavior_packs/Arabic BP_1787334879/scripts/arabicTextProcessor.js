/**
 * @param {string} text - The text to be processed
 * @param {boolean} reverseOrder - If true, the output will be reversed. Default is true.
 * @returns {string} - The processed text
 */

function processArabicScriptText(text, reverseOrder = true) {
    try {

        text = stripDiacritics(text);
        text = processLamAlefLigatures(text);
        const chunkSize = 1000;
        if (text.length > chunkSize) {
            let result = '';
            for (let i = 0; i < text.length; i += chunkSize) {
                const chunk = text.substr(i, chunkSize);
                result += processChunk(chunk);
            }
            return result;
        } else {
            if(reverseOrder)
                return reverseLetters(processChunk(text));
            return processChunk(text);
        }
    } catch (error) {
        console.error("Error processing Arabic script text:", error);
        return text;
    }
}

function reverseLetters(text) {
    return text.split('').reverse().join('');
}

/**
 * @param {string} text - The text to be checked
 * @returns {boolean} - True if the text contains Arabic script characters, false otherwise
 */
function isArabicScript(text) {
    const arabicScriptRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    return arabicScriptRegex.test(text);
}

function isPunctuation(char) {

    return /[!"#$%&'()*+,\-.\/:;<=>?@[\\\]^_`{|}~،؛؟]/.test(char);
}

function stripDiacritics(text) {

    const diacritics = /[\u064B-\u065F\u0670]/g;
    return text.replace(diacritics, '');
}

function processChunk(text) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(char)) {
            const position = determinePosition(text, i);
            result += replaceWithForm(char, position);
        } else {
            result += char;
        }
    }
    return result;
}

function processLamAlefLigatures(text) {
    return text
        .replace(/لا/g, '\uFEFB')
        .replace(/لأ/g, '\uFEF7')
        .replace(/لإ/g, '\uFEF9')
        .replace(/لآ/g, '\uFEF5');
}

function determinePosition(text, index) {
    const char = text[index];
    const prevChar = index > 0 ? text[index - 1] : null;
    const nextChar = index < text.length - 1 ? text[index + 1] : null;

    const connectsToPrev = prevChar && canConnectToPrev(char, prevChar);
    const connectsToNext = nextChar && canConnectToNext(char, nextChar);

    if (!connectsToPrev && !connectsToNext) {
        return 'isolated';
    } else if (!connectsToPrev && connectsToNext) {
        return 'initial';
    } else if (connectsToPrev && !connectsToNext) {
        return 'final';
    } else {
        return 'medial';
    }
}

function canConnectToPrev(char, prevChar) {

    if (!prevChar || isPunctuation(prevChar) || !/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(prevChar)) {
        return false;
    }
    const nonConnectingToNext = [
        'ا', 'د', 'ذ', 'ر', 'ز', 'و', 'آ', 'أ', 'إ', 'ؤ',
        'ۀ', 'ژ', 'ڑ', 'ڈ', 'ډ', 'ړ', 'ږ', 'ڗ', 'ڙ', 'ۆ', 'ۇ', 'ۈ', 'ۋ', 'ۅ', 'ۉ', 'ې', 'ے'
    ];

    if (char === 'ـ') {
        return !nonConnectingToNext.includes(prevChar);
    }
    return !nonConnectingToNext.includes(prevChar);
}

function canConnectToNext(char, nextChar) {

    if (!nextChar || isPunctuation(char) || isPunctuation(nextChar) ||
        !/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(nextChar)) {
        return false;
    }
    const nonConnectingToNext = [
        'ا', 'د', 'ذ', 'ر', 'ز', 'و', 'آ', 'أ', 'إ', 'ؤ',
        'ۀ', 'ژ', 'ڑ', 'ڈ', 'ډ', 'ړ', 'ږ', 'ڗ', 'ڙ', 'ۆ', 'ۇ', 'ۈ', 'ۋ', 'ۅ', 'ۉ', 'ې', 'ے'
    ];

    if (char === 'ـ') {
        return true;
    }
    return !nonConnectingToNext.includes(char);
}

function replaceWithForm(char, position) {

    const forms = {

        'ا': { isolated: '\uFE8D', final: '\uFE8E' },
        'ب': { isolated: '\uFE8F', initial: '\uFE91', medial: '\uFE92', final: '\uFE90' },
        'ت': { isolated: '\uFE95', initial: '\uFE97', medial: '\uFE98', final: '\uFE96' },
        'ث': { isolated: '\uFE99', initial: '\uFE9B', medial: '\uFE9C', final: '\uFE9A' },
        'ج': { isolated: '\uFE9D', initial: '\uFE9F', medial: '\uFEA0', final: '\uFE9E' },
        'ح': { isolated: '\uFEA1', initial: '\uFEA3', medial: '\uFEA4', final: '\uFEA2' },
        'خ': { isolated: '\uFEA5', initial: '\uFEA7', medial: '\uFEA8', final: '\uFEA6' },
        'د': { isolated: '\uFEA9', final: '\uFEAA' },
        'ذ': { isolated: '\uFEAB', final: '\uFEAC' },
        'ر': { isolated: '\uFEAD', final: '\uFEAE' },
        'ز': { isolated: '\uFEAF', final: '\uFEB0' },
        'س': { isolated: '\uFEB1', initial: '\uFEB3', medial: '\uFEB4', final: '\uFEB2' },
        'ش': { isolated: '\uFEB5', initial: '\uFEB7', medial: '\uFEB8', final: '\uFEB6' },
        'ص': { isolated: '\uFEB9', initial: '\uFEBB', medial: '\uFEBC', final: '\uFEBA' },
        'ض': { isolated: '\uFEBD', initial: '\uFEBF', medial: '\uFEC0', final: '\uFEBE' },
        'ط': { isolated: '\uFEC1', initial: '\uFEC3', medial: '\uFEC4', final: '\uFEC2' },
        'ظ': { isolated: '\uFEC5', initial: '\uFEC7', medial: '\uFEC8', final: '\uFEC6' },
        'ع': { isolated: '\uFEC9', initial: '\uFECB', medial: '\uFECC', final: '\uFECA' },
        'غ': { isolated: '\uFECD', initial: '\uFECF', medial: '\uFED0', final: '\uFECE' },
        'ف': { isolated: '\uFED1', initial: '\uFED3', medial: '\uFED4', final: '\uFED2' },
        'ق': { isolated: '\uFED5', initial: '\uFED7', medial: '\uFED8', final: '\uFED6' },
        'ك': { isolated: '\uFED9', initial: '\uFEDB', medial: '\uFEDC', final: '\uFEDA' },
        'ل': { isolated: '\uFEDD', initial: '\uFEDF', medial: '\uFEE0', final: '\uFEDE' },
        'م': { isolated: '\uFEE1', initial: '\uFEE3', medial: '\uFEE4', final: '\uFEE2' },
        'ن': { isolated: '\uFEE5', initial: '\uFEE7', medial: '\uFEE8', final: '\uFEE6' },
        'ه': { isolated: '\uFEE9', initial: '\uFEEB', medial: '\uFEEC', final: '\uFEEA' },
        'و': { isolated: '\uFEED', final: '\uFEEE' },
        'ي': { isolated: '\uFEF1', initial: '\uFEF3', medial: '\uFEF4', final: '\uFEF2' },
        'ء': { isolated: '\uFE80' },
        'آ': { isolated: '\uFE81', final: '\uFE82' },
        'أ': { isolated: '\uFE83', final: '\uFE84' },
        'إ': { isolated: '\uFE87', final: '\uFE88' },
        'ؤ': { isolated: '\uFE85', final: '\uFE86' },
        'ئ': { isolated: '\uFE89', initial: '\uFE8B', medial: '\uFE8C', final: '\uFE8A' },
        'ة': { isolated: '\uFE93', final: '\uFE94' },
        'ى': { isolated: '\uFEEF', final: '\uFEF0' },
        'لا': { isolated: '\uFEFB', final: '\uFEFC' },
        'لأ': { isolated: '\uFEF7', final: '\uFEF8' },
        'لإ': { isolated: '\uFEF9', final: '\uFEFA' },
        'لآ': { isolated: '\uFEF5', final: '\uFEF6' },
        'پ': { isolated: '\uFB56', initial: '\uFB58', medial: '\uFB59', final: '\uFB57' },
        'چ': { isolated: '\uFB7A', initial: '\uFB7C', medial: '\uFB7D', final: '\uFB7B' },
        'ژ': { isolated: '\uFB8A', final: '\uFB8B' },
        'گ': { isolated: '\uFB92', initial: '\uFB94', medial: '\uFB95', final: '\uFB93' },
        'ک': { isolated: '\uFB8E', initial: '\uFB90', medial: '\uFB91', final: '\uFB8F' },
        'ی': { isolated: '\uFBFC', initial: '\uFBFE', medial: '\uFBFF', final: '\uFBFD' },
        'ٹ': { isolated: '\uFB66', initial: '\uFB68', medial: '\uFB69', final: '\uFB67' },
        'ڈ': { isolated: '\uFB88', final: '\uFB89' },
        'ڑ': { isolated: '\uFB8C', final: '\uFB8D' },
        'ں': { isolated: '\uFB9E', final: '\uFB9F' },
        'ھ': { isolated: '\uFBAA', initial: '\uFBAC', medial: '\uFBAD', final: '\uFBAB' },
        'ہ': { isolated: '\uFBA6', initial: '\uFBA8', medial: '\uFBA9', final: '\uFBA7' },
        'ۂ': { isolated: '\uFBA0', final: '\uFBA1' },
        'ۃ': { isolated: '\uFBA4', final: '\uFBA5' },
        'ے': { isolated: '\uFBE8', final: '\uFBE9' },
        'ۓ': { isolated: '\uFBFC', final: '\uFBFD' },
        'ټ': { isolated: '\uFB67', initial: '\uFB68', medial: '\uFB69', final: '\uFB66' },
        'ځ': { isolated: '\u0681', initial: '\u0681', medial: '\u0681', final: '\u0681' },
        'څ': { isolated: '\u0685', initial: '\u0685', medial: '\u0685', final: '\u0685' },
        'ډ': { isolated: '\u0689', final: '\u0689' },
        'ړ': { isolated: '\u0693', final: '\u0693' },

        'ږ': { isolated: '\u0696', final: '\u0696' },
        'ښ': { isolated: '\u069A', initial: '\u069A', medial: '\u069A', final: '\u069A' },
        'ګ': { isolated: '\u06AB', initial: '\u06AB', medial: '\u06AB', final: '\u06AB' },
        'ڼ': { isolated: '\u06BC', initial: '\u06BC', medial: '\u06BC', final: '\u06BC' },
        'ـ': { isolated: '\u0640', initial: '\u0640', medial: '\u0640', final: '\u0640' },
        '٠': { isolated: '٠' },
        '١': { isolated: '١' },
        '٢': { isolated: '٢' },
        '٣': { isolated: '٣' },
        '٤': { isolated: '٤' },
        '٥': { isolated: '٥' },
        '٦': { isolated: '٦' },
        '٧': { isolated: '٧' },
        '٨': { isolated: '٨' },
        '٩': { isolated: '٩' },
        'ڤ': { isolated: '\uFB6A', initial: '\uFB6C', medial: '\uFB6D', final: '\uFB6B' },
        'ڵ': { isolated: '\uFB8F', initial: '\uFB90', medial: '\uFB91', final: '\uFB8E' },
        'ڕ': { isolated: '\uFB8D', final: '\uFB8E' },
        'ۆ': { isolated: '\uFBD3', final: '\uFBD4' },
        'ۇ': { isolated: '\uFBD5', final: '\uFBD6' },
        'ۈ': { isolated: '\uFBD7', final: '\uFBD8' },
        'ۋ': { isolated: '\uFBD9', final: '\uFBDA' },
        'ۉ': { isolated: '\uFBE1', final: '\uFBE0' },
        'ۊ': { isolated: '\uFBDB', final: '\uFBDC' },
        'ې': { isolated: '\uFBE4', initial: '\uFBE6', medial: '\uFBE7', final: '\uFBE5' },
        'ۅ': { isolated: '\uFBDD', final: '\uFBDE' },
        'ێ': { isolated: '\uFBE8', initial: '\uFBEA', medial: '\uFBEB', final: '\uFBE9' },
        'ۍ': { isolated: '\uFBFC', final: '\uFBFD' },
        'ڃ': { isolated: '\uFB9C', initial: '\uFB9E', medial: '\uFB9F', final: '\uFB9D' },
        'ڄ': { isolated: '\uFB94', initial: '\uFB96', medial: '\uFB97', final: '\uFB95' },
        'ڇ': { isolated: '\uFB7C', initial: '\uFB7E', medial: '\uFB7F', final: '\uFB7D' },
        'ڌ': { isolated: '\uFB84', final: '\uFB85' },
        'ڍ': { isolated: '\uFB86', final: '\uFB87' },
        'ڏ': { isolated: '\uFB88', final: '\uFB89' },
        'ڊ': { isolated: '\uFB8A', final: '\uFB8B' },
        'ڙ': { isolated: '\uFB8C', final: '\uFB8D' },
        'ٻ': { isolated: '\uFB90', initial: '\uFB92', medial: '\uFB93', final: '\uFB91' },
        'ٺ': { isolated: '\uFB66', initial: '\uFB68', medial: '\uFB69', final: '\uFB67' },
        'ڻ': { isolated: '\uFB9A', initial: '\uFB9C', medial: '\uFB9D', final: '\uFB9B' },
        'ڨ': { isolated: '\uFB88', initial: '\uFB8A', medial: '\uFB8B', final: '\uFB89' },
        'ڭ': { isolated: '\uFB94', initial: '\uFB96', medial: '\uFB97', final: '\uFB95' },
        'ڜ': { isolated: '\uFB5C', initial: '\uFB5E', medial: '\uFB5F', final: '\uFB5D' },
        'ڥ': { isolated: '\uFB6A', initial: '\uFB6C', medial: '\uFB6D', final: '\uFB6B' },
        'ڦ': { isolated: '\uFB70', initial: '\uFB72', medial: '\uFB73', final: '\uFB71' },
        'ݣ': { isolated: '\u0762', initial: '\u0762', medial: '\u0762', final: '\u0762' },
        'ݪ': { isolated: '\u076A', initial: '\u076A', medial: '\u076A', final: '\u076A' },
        
        
        'ٱ': { isolated: '\u0671', initial: '\u0671', medial: '\u0671', final: '\uFB51' }, 
        'ٮ': { isolated: '\uFBE4', initial: '\uFBE8', medial: '\uFBE9', final: '\uFBE5' }, 
        'ڪ': { isolated: '\uFB8E', initial: '\uFB90', medial: '\uFB91', final: '\uFB8F' }, 
        'ۤ': { isolated: '\u06E4', initial: '\u06E4', medial: '\u06E4', final: '\u06E4' }, 
        
        
        'ٯ': { isolated: '\u066F', initial: '\u066F', medial: '\u066F', final: '\u066F' }, 
        'ڢ': { isolated: '\uFB6E', initial: '\uFB70', medial: '\uFB71', final: '\uFB6F' }, 
        'ڧ': { isolated: '\uFB74', initial: '\uFB76', medial: '\uFB77', final: '\uFB75' }, 
        'ڡ': { isolated: '\uFBE0', initial: '\uFBE2', medial: '\uFBE3', final: '\uFBE1' }, 
        'ۏ': { isolated: '\u06CF', final: '\u06CF' }, 
        
        
        'ݐ': { isolated: '\u0750', initial: '\u0750', medial: '\u0750', final: '\u0750' }, 
        'ݑ': { isolated: '\u0751', initial: '\u0751', medial: '\u0751', final: '\u0751' }, 
        'ݒ': { isolated: '\u0752', initial: '\u0752', medial: '\u0752', final: '\u0752' }, 
        'ݓ': { isolated: '\u0753', initial: '\u0753', medial: '\u0753', final: '\u0753' }, 
        'ݔ': { isolated: '\u0754', initial: '\u0754', medial: '\u0754', final: '\u0754' }, 
        'ݕ': { isolated: '\u0755', initial: '\u0755', medial: '\u0755', final: '\u0755' }, 
    };

    if (forms[char] && forms[char][position]) {
        return forms[char][position];
    }
    if (forms[char]) {
        if (position === 'initial' && !forms[char].initial) {
            return forms[char].isolated || char;
        }
        if (position === 'medial' && !forms[char].medial) {
            return forms[char].final || forms[char].isolated || char;
        }
        if (position === 'final' && !forms[char].final) {
            return forms[char].isolated || char;
        }
        return forms[char].isolated || char;
    }

    return char;
}

/**
 * Retrieves the version and supported languages of the script.
 * @property {string} version - The version of the script.
 * @property {string[]} supportedLanguages - List of supported languages.
 * @returns {VersionInfo} - The version and supported languages.
 */
function getVersion() {
    return {
        version: "1.0.0",
        supportedLanguages: ["Arabic", "Persian", "Urdu", "Pashto", "Kurdish", "Sindhi", "Uyghur"]
    };
}

export {isArabicScript, processArabicScriptText, getVersion};