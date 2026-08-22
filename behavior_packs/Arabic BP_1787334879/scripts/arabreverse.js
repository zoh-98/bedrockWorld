import { world } from "@minecraft/server";
var OriginalAlfUpperMdd = 0x0622,
  OriginalAlfUpperHamza = 0x0623,
  OriginalAlfLowerHamza = 0x0625,
  OriginalAlf = 0x0627,
  OriginalLam = 0x0644;

var LamAlefGlyphs = [
  [0x0622, 0xFEF6, 0xFEF5],
  [0x0623, 0xFEF8, 0xFEF7],
  [0x0627, 0xFEFC, 0xFEFB],
  [0x0625, 0xFEFA, 0xFEF9]
];

var ShaddaHarakatGlyphs = {
  0x064C: 0xFC5E, // Dammatan + Shadda
  0x064D: 0xFC5F, // Kasratan + Shadda
  0x064E: 0xFC60, // Fatha + Shadda
  0x065F: 0xFC61, // Damma + Shadda
  0x0650: 0xFC62, // Kasra + Shadda
  0x0670: 0xFC63 // Superscript Alef + Shadda
};

var Harakat = {
  0x0600: true, 0x0601: true, 0x0602: true, 0x0603: true,
  0x0606: true, 0x0607: true, 0x0608: true, 0x0609: true,
  0x060A: true, 0x060B: true, 0x060D: true, 0x060E: true,
  0x0610: true, 0x0611: true, 0x0612: true, 0x0613: true,
  0x0614: true, 0x0615: true, 0x0616: true, 0x0617: true,
  0x0618: true, 0x0619: true, 0x061A: true, 0x061B: true,
  0x061E: true, 0x061F: true, 0x063B: true, 0x063C: true,
  0x063D: true, 0x063E: true, 0x063F: true, 0x0640: true,
  0x064B: true, 0x064C: true, 0x064D: true, 0x064E: true,
  0x064F: true, 0x0650: true, 0x0651: true, 0x0652: true,
  0x0653: true, 0x0654: true, 0x0655: true, 0x0656: true,
  0x0657: true, 0x0658: true, 0x0659: true, 0x065A: true,
  0x065B: true, 0x065C: true, 0x065D: true, 0x065E: true,
  0x0660: true, 0x066A: true, 0x066B: true, 0x066C: true,
  0x066F: true, 0x0670: true, 0x0672: true, 0x06D4: true,
  0x06D5: true, 0x06D6: true, 0x06D7: true, 0x06D8: true,
  0x06D9: true, 0x06DA: true, 0x06DB: true, 0x06DC: true,
  0x06DF: true, 0x06E0: true, 0x06E1: true, 0x06E2: true,
  0x06E3: true, 0x06E4: true, 0x06E5: true, 0x06E6: true,
  0x06E7: true, 0x06E8: true, 0x06E9: true, 0x06EA: true,
  0x06EB: true, 0x06EC: true, 0x06ED: true, 0x06EE: true,
  0x06EF: true, 0x06D6: true, 0x06D7: true, 0x06D8: true,
  0x06D9: true, 0x06DA: true, 0x06DB: true, 0x06DC: true,
  0x06DD: true, 0x06DE: true, 0x06DF: true, 0x06F0: true,
  0x06FD: true, 0xFE70: true, 0xFE71: true, 0xFE72: true,
  0xFE73: true, 0xFE74: true, 0xFE75: true, 0xFE76: true,
  0xFE77: true, 0xFE78: true, 0xFE79: true, 0xFE7A: true,
  0xFE7B: true, 0xFE7C: true, 0xFE7D: true, 0xFE7E: true,
  0xFE7F: true, 0xFC5E: true, 0xFC5F: true, 0xFC60: true,
  0xFC61: true, 0xFC62: true, 0xFC63: true
};

var Glyphs = {
  0x0622: [0x0622, 0xFE81, 0xFE81, 0xFE82, 0xFE82, 2],
  0x0623: [0x0623, 0xFE83, 0xFE83, 0xFE84, 0xFE84, 2],
  0x0624: [0x0624, 0xFE85, 0xFE85, 0xFE86, 0xFE86, 2],
  0x0625: [0x0625, 0xFE87, 0xFE87, 0xFE88, 0xFE88, 2],
  0x0626: [0x0626, 0xFE89, 0xFE8B, 0xFE8C, 0xFE8A, 4],
  0x0627: [0x0627, 0x0627, 0x0627, 0xFE8E, 0xFE8E, 2],
  0x0628: [0x0628, 0xFE8F, 0xFE91, 0xFE92, 0xFE90, 4],
  0x0629: [0x0629, 0xFE93, 0xFE93, 0xFE94, 0xFE94, 2],
  0x062A: [0x062A, 0xFE95, 0xFE97, 0xFE98, 0xFE96, 4],
  0x062B: [0x062B, 0xFE99, 0xFE9B, 0xFE9C, 0xFE9A, 4],
  0x062C: [0x062C, 0xFE9D, 0xFE9F, 0xFEA0, 0xFE9E, 4],
  0x062D: [0x062D, 0xFEA1, 0xFEA3, 0xFEA4, 0xFEA2, 4],
  0x062E: [0x062E, 0xFEA5, 0xFEA7, 0xFEA8, 0xFEA6, 4],
  0x062F: [0x062F, 0xFEA9, 0xFEA9, 0xFEAA, 0xFEAA, 2],
  0x0630: [0x0630, 0xFEAB, 0xFEAB, 0xFEAC, 0xFEAC, 2],
  0x0631: [0x0631, 0xFEAD, 0xFEAD, 0xFEAE, 0xFEAE, 2],
  0x0632: [0x0632, 0xFEAF, 0xFEAF, 0xFEB0, 0xFEB0, 2],
  0x0633: [0x0633, 0xFEB1, 0xFEB3, 0xFEB4, 0xFEB2, 4],
  0x0634: [0x0634, 0xFEB5, 0xFEB7, 0xFEB8, 0xFEB6, 4],
  0x0635: [0x0635, 0xFEB9, 0xFEBB, 0xFEBC, 0xFEBA, 4],
  0x0636: [0x0636, 0xFEBD, 0xFEBF, 0xFEC0, 0xFEBE, 4],
  0x0637: [0x0637, 0xFEC1, 0xFEC3, 0xFEC4, 0xFEC2, 4],
  0x0638: [0x0638, 0xFEC5, 0xFEC7, 0xFEC8, 0xFEC6, 4],
  0x0639: [0x0639, 0xFEC9, 0xFECB, 0xFECC, 0xFECA, 4],
  0x063A: [0x063A, 0xFECD, 0xFECF, 0xFED0, 0xFECE, 4],
  0x0641: [0x0641, 0xFED1, 0xFED3, 0xFED4, 0xFED2, 4],
  0x0642: [0x0642, 0xFED5, 0xFED7, 0xFED8, 0xFED6, 4],
  0x0643: [0x0643, 0xFED9, 0xFEDB, 0xFEDC, 0xFEDA, 4],
  0x0644: [0x0644, 0xFEDD, 0xFEDF, 0xFEE0, 0xFEDE, 4],
  0x0645: [0x0645, 0xFEE1, 0xFEE3, 0xFEE4, 0xFEE2, 4],
  0x0646: [0x0646, 0xFEE5, 0xFEE7, 0xFEE8, 0xFEE6, 4],
  0x0647: [0x0647, 0xFEE9, 0xFEEB, 0xFEEC, 0xFEEA, 4],
  0x0648: [0x0648, 0xFEED, 0xFEED, 0xFEEE, 0xFEEE, 2],
  0x0649: [0x0649, 0xFEEF, 0xFEEF, 0xFEF0, 0xFEF0, 2],
  0x0671: [0x0671, 0x0671, 0x0671, 0xFB51, 0xFB51, 2],
  0x064A: [0x064A, 0xFEF1, 0xFEF3, 0xFEF4, 0xFEF2, 4],
  0x066E: [0x066E, 0xFBE4, 0xFBE8, 0xFBE9, 0xFBE5, 4],
  0x06AA: [0x06AA, 0xFB8E, 0xFB90, 0xFB91, 0xFB8F, 4],
  0x06C1: [0x06C1, 0xFBA6, 0xFBA8, 0xFBA9, 0xFBA7, 4],
  0x06E4: [0x06E4, 0x06E4, 0x06E4, 0x06E4, 0xFEEE, 2],
  0x067E: [0x067E, 0xFB56, 0xFB58, 0xFB59, 0xFB57, 4],
  0x0698: [0x0698, 0xFB8A, 0xFB8A, 0xFB8A, 0xFB8B, 2],
  0x06AF: [0x06AF, 0xFB92, 0xFB94, 0xFB95, 0xFB93, 4],
  0x0686: [0x0686, 0xFB7A, 0xFB7C, 0xFB7D, 0xFB7B, 4],
  0x06A9: [0x06A9, 0xFB8E, 0xFB90, 0xFB91, 0xFB8F, 4],
  0x06CC: [0x06CC, 0xFEEF, 0xFEF3, 0xFEF4, 0xFEF0, 4]
};

var GlyphList = [
  [0x0622, 0xFE81, 0xFE81, 0xFE82, 0xFE82, 2],
  [0x0623, 0xFE83, 0xFE83, 0xFE84, 0xFE84, 2],
  [0x0624, 0xFE85, 0xFE85, 0xFE86, 0xFE86, 2],
  [0x0625, 0xFE87, 0xFE87, 0xFE88, 0xFE88, 2],
  [0x0626, 0xFE89, 0xFE8B, 0xFE8C, 0xFE8A, 4],
  [0x0627, 0x0627, 0x0627, 0xFE8E, 0xFE8E, 2],
  [0x0628, 0xFE8F, 0xFE91, 0xFE92, 0xFE90, 4],
  [0x0629, 0xFE93, 0xFE93, 0xFE94, 0xFE94, 2],
  [0x062A, 0xFE95, 0xFE97, 0xFE98, 0xFE96, 4],
  [0x062B, 0xFE99, 0xFE9B, 0xFE9C, 0xFE9A, 4],
  [0x062C, 0xFE9D, 0xFE9F, 0xFEA0, 0xFE9E, 4],
  [0x062D, 0xFEA1, 0xFEA3, 0xFEA4, 0xFEA2, 4],
  [0x062E, 0xFEA5, 0xFEA7, 0xFEA8, 0xFEA6, 4],
  [0x062F, 0xFEA9, 0xFEA9, 0xFEAA, 0xFEAA, 2],
  [0x0630, 0xFEAB, 0xFEAB, 0xFEAC, 0xFEAC, 2],
  [0x0631, 0xFEAD, 0xFEAD, 0xFEAE, 0xFEAE, 2],
  [0x0632, 0xFEAF, 0xFEAF, 0xFEB0, 0xFEB0, 2],
  [0x0633, 0xFEB1, 0xFEB3, 0xFEB4, 0xFEB2, 4],
  [0x0634, 0xFEB5, 0xFEB7, 0xFEB8, 0xFEB6, 4],
  [0x0635, 0xFEB9, 0xFEBB, 0xFEBC, 0xFEBA, 4],
  [0x0636, 0xFEBD, 0xFEBF, 0xFEC0, 0xFEBE, 4],
  [0x0637, 0xFEC1, 0xFEC3, 0xFEC4, 0xFEC2, 4],
  [0x0638, 0xFEC5, 0xFEC7, 0xFEC8, 0xFEC6, 4],
  [0x0639, 0xFEC9, 0xFECB, 0xFECC, 0xFECA, 4],
  [0x063A, 0xFECD, 0xFECF, 0xFED0, 0xFECE, 4],
  [0x0641, 0xFED1, 0xFED3, 0xFED4, 0xFED2, 4],
  [0x0642, 0xFED5, 0xFED7, 0xFED8, 0xFED6, 4],
  [0x0643, 0xFED9, 0xFEDB, 0xFEDC, 0xFEDA, 4],
  [0x0644, 0xFEDD, 0xFEDF, 0xFEE0, 0xFEDE, 4],
  [0x0645, 0xFEE1, 0xFEE3, 0xFEE4, 0xFEE2, 4],
  [0x0646, 0xFEE5, 0xFEE7, 0xFEE8, 0xFEE6, 4],
  [0x0647, 0xFEE9, 0xFEEB, 0xFEEC, 0xFEEA, 4],
  [0x0648, 0xFEED, 0xFEED, 0xFEEE, 0xFEEE, 2],
  [0x0649, 0xFEEF, 0xFEEF, 0xFEF0, 0xFEF0, 2],
  [0x0671, 0x0671, 0x0671, 0xFB51, 0xFB51, 2],
  [0x064A, 0xFEF1, 0xFEF3, 0xFEF4, 0xFEF2, 4],
  [0x066E, 0xFBE4, 0xFBE8, 0xFBE9, 0xFBE5, 4],
  [0x06AA, 0xFB8E, 0xFB90, 0xFB91, 0xFB8F, 4],
  [0x06C1, 0xFBA6, 0xFBA8, 0xFBA9, 0xFBA7, 4],
  [0x067E, 0xFB56, 0xFB58, 0xFB59, 0xFB57, 4],
  [0x0698, 0xFB8A, 0xFB8A, 0xFB8A, 0xFB8B, 2],
  [0x06AF, 0xFB92, 0xFB94, 0xFB95, 0xFB93, 4],
  [0x0686, 0xFB7A, 0xFB7C, 0xFB7D, 0xFB7B, 4],
  [0x06A9, 0xFB8E, 0xFB90, 0xFB91, 0xFB8F, 4],
  [0x06CC, 0xFEEF, 0xFEF3, 0xFEF4, 0xFEF0, 4]
];

function getReshapedGlyph(target, location) {
  var glyph = Glyphs[target];
  return glyph ? glyph[location] : target;
}

function getGlyphType(target) {
  var glyph = Glyphs[target];
  return glyph ? glyph[5] : 2;
}

function getLamAlef(candidateAlef, candidateLam, isEndOfWord) {
  var shift = isEndOfWord ? 2 : 1;

  if (candidateLam == OriginalLam) {
    if (candidateAlef == OriginalAlfUpperMdd) return LamAlefGlyphs[0][shift];
    if (candidateAlef == OriginalAlfUpperHamza) return LamAlefGlyphs[1][shift];
    if (candidateAlef == OriginalAlf) return LamAlefGlyphs[2][shift];
    if (candidateAlef == OriginalAlfLowerHamza) return LamAlefGlyphs[3][shift];
  }
}

function replaceShadda(unshapedWord) {
  var word = [],
    skipNext = false;

  for (var i in unshapedWord) {
    var c = unshapedWord[i];
    if (skipNext) {
      skipNext = false;
    }
    else if (c == 0x651 && ShaddaHarakatGlyphs[unshapedWord[i - 1]]) {
      word.push(ShaddaHarakatGlyphs[unshapedWord[i - 1]]);
    }
    else if (c == 0x651 && ShaddaHarakatGlyphs[unshapedWord[i + 1]]) {
      word.push(ShaddaHarakatGlyphs[unshapedWord[i + 1]]);
      skipNext = true;
    }
    else {
      word.push(c);
    }
  }

  return word;
}

function replaceLamAlef(unshapedWord) {
  var letters = unshapedWord.slice(); // Deep copy

  var currLetter = 0, prevLetter = 0;
  for (var i = 0; i < letters.length; ++i) {
    currLetter = letters[i];

    if (!Harakat[currLetter] && currLetter != OriginalLam) {
      prevLetter = currLetter;
    }

    if (currLetter == OriginalLam) {
      var candidateLam = currLetter,
        lamPosition = i,
        harakatPosition = lamPosition + 1;

      while (harakatPosition < letters.length - 1 && Harakat[letters[harakatPosition]]) {
        harakatPosition++;
      }

      if (harakatPosition < letters.length) {
        var lamAlef = (getGlyphType(prevLetter) > 2) ?
          getLamAlef(letters[harakatPosition], candidateLam, false) :
          getLamAlef(letters[harakatPosition], candidateLam, true);

        if (lamAlef) {
          letters[lamPosition] = lamAlef;
          letters[harakatPosition] = undefined;
        }
      }
    }
  }

  unshapedWord = [];
  for (var i = 0; i < letters.length; ++i) {
    var c = letters[i];
    if (c) unshapedWord.push(c);
  }

  return unshapedWord;
}

function decomposeWord(word) {
  var harakat = [],
    harakatPositions = [],
    letters = [],
    letterPositions = [];

  for (var i = 0; i < word.length; ++i) {
    var c = word[i];
    if (Harakat[c]) {
      harakatPositions.push(i);
      harakat.push(c);
    }
    else {
      letterPositions.push(i);
      letters.push(c);
    }
  }

  return {
    reshaped: word,
    harakat: harakat,
    letters: letters,
    harakatPositions: harakatPositions,
    letterPositions: letterPositions
  };
}

function reshapeDecomposed(word) {
  if (!word[0]) return word;
  if (!word[1]) return [getReshapedGlyph(word[0], 1)];

  var reshaped = [];
  var before, after;
  for (var i = 0; i < word.length; ++i) {
    var c = word[i];

    after = (i != word.length - 1) && (getGlyphType(word[i]) == 4);
    before = (i != 0) && (getGlyphType(word[i - 1]) == 4);

    if (after && before) {
      reshaped.push(getReshapedGlyph(word[i], 3));
    }
    else if (after && !before) {
      reshaped.push(getReshapedGlyph(word[i], 2));
    }
    else if (!after && before) {
      reshaped.push(getReshapedGlyph(word[i], 4));
    }
    else {
      reshaped.push(getReshapedGlyph(word[i], 1));
    }
  }

  return reshaped;
}

function reconstructDecomposed(word, reshaped) {
  var withHarakat = [];

  for (var i = 0; i < word.letterPositions.length; ++i) {
    var pos = word.letterPositions[i];
    withHarakat[pos] = reshaped[i];
  }

  for (var i = 0; i < word.harakatPositions.length; ++i) {
    var pos = word.harakatPositions[i];
    withHarakat[pos] = word.harakat[i];
  }

  return withHarakat;
}

function getReshapedWord(word) {
  word = replaceLamAlef(word);
  word = replaceShadda(word);

  var decomposed = decomposeWord(word),
    result = [];

  if (decomposed.letters[0]) {
    result = reshapeDecomposed(decomposed.letters);
  }

  return reconstructDecomposed(decomposed, result);
}

function isArabicCharacter(c) {
  return Glyphs[c] || Harakat[c];
}

function hasArabicLetters(word) {
  for (var i = 0; i < word.length; ++i) {
    if (isArabicCharacter(word[i])) return true;
  }

  return false;
}

function isArabicWord(word) {
  for (var i = 0; i < word.length; ++i) {
    if (!isArabicCharacter(word[i])) return false;
  }

  return true;
}

function getWordsFromMixedWord(word) {
  var words = [],
    tempWord = [];

  for (var i = 0; i < words.length; ++i) {
    var c = words[i];
    if (isArabicCharacter(c)) {
      if (tempWord[0] && !isArabicWord(tempWord)) {
        words.push(tempWord);
        tempWord = [c];
      }
      else {
        tempWord.push(c);
      }
    }
    else {
      if (tempWord[0] && isArabicWord(tempWord)) {
        words.push(tempWord);
        tempWord = [c];
      }
      else {
        tempWord.push(c);
      }
    }
  }

  if (tempWord[0]) words.push(tempWord);

  return words;
}

function reverseWord(word) {
  var reversed = [];
  for (var i = word.length - 1; i >= 0; --i) {
    reversed.push(word[i]);
  }
  return reversed;
}

function reshapeWords(words, noSpaces) {
  var nonArabicPositions = [];

  for (var i = 0; i < words.length; ++i) {
    var word = words[i];
    if (hasArabicLetters(word)) {
      // Reverse word ordering, mixed words don't have to reverse order
      if (nonArabicPositions.length > 0 && !noSpaces) {
        for (var j = 0; j < nonArabicPositions.length / 2; ++j) {
          var pos = nonArabicPositions[j],
            oppositePos = nonArabicPositions[nonArabicPositions.length - j - 1],
            temp = words[pos];
          words[pos] = words[oppositePos];
          words[oppositePos] = temp;
        }
        nonArabicPositions = [];
      }

      words[i] = isArabicWord(word) ?
        getReshapedWord(word) : reshapeWords(getWordsFromMixedWord(word), true);
      words[i] = reverseWord(words[i]);
    }
    else {
      // words[i] = reverseWord(word);
      nonArabicPositions.push(i);
    }
  }

  if (nonArabicPositions.length > 0 && !noSpaces) {
    for (var i = 0; i < nonArabicPositions.length / 2; ++i) {
      var pos = nonArabicPositions[i],
        oppositePos = nonArabicPositions[nonArabicPositions.length - i - 1];
      temp = words[pos];
      words[pos] = words[oppositePos];
      words[oppositePos] = temp;
    }
  }

  var sentence = [];
  for (var i = 0; i < words.length; ++i) {
    var word = words[i];
    for (var j = 0; j < word.length; ++j) {
      sentence.push(word[j]);
    }
    if (i < words.length - 1 && words[i + 1][0] && !noSpaces) {
      sentence.push(0x20);
    }
  }

  return sentence;
}

function getWords(sentence) {
  // Define a regular expression to test if a character is Arabic
  var arabicRegex = /[\u0600-\u06FF]/;
  var currWord = [],
    words = [currWord];
  var isArabic = false; // A flag to indicate if the current word is Arabic or not

  for (var i = 0; i < sentence.length; ++i) {
    var c = sentence[i];
    if (c == 0x20 || c == 0xA || c == 0x9 || c == 0xD || c == 0x0) {
      // If the character is a whitespace or a null terminator, end the current word
      currWord = [];
      words.push(currWord);
      isArabic = false; // Reset the flag
    }
    else {
      // If the character is not a whitespace or a null terminator, add it to the current word
      currWord.push(c);
      // Check if the character is Arabic or not
      if (arabicRegex.test(c)) {
        // If the character is Arabic, set the flag to true
        isArabic = true;
      }
      else {
        // If the character is not Arabic, and the flag was true, end the current word and start a new one
        if (isArabic) {
          currWord = [];
          words.push(currWord);
          isArabic = false;
        }
      }
    }
  }

  return words;
}



function reshapeSentence(sentence) {

  if (!sentence[0]) return []
  return reshapeWords(getWords(sentence));
}

function decodeUnicode(str) {
  var r = [], i = 0;
  while (i < str.length) {
    var chr = str.charCodeAt(i++);
    if (chr >= 0xD800 && chr <= 0xDBFF) {
      // surrogate pair
      var low = str.charCodeAt(i++);
      r.push(0x10000 + ((chr - 0xD800) << 10) | (low - 0xDC00));
    }
    else {
      // ordinary character
      r.push(chr);
    }
  }
  return r;
}

function encodeUnicode(str) {
  var result = '';
  for (var i = 0; i < str.length; i++) {
    result += String.fromCodePoint(str[i]);
  }
  return result;
}

function arabicReshape(str, asUnicode) {
  if (str.charCodeAt) str = decodeUnicode(str); // string to unicode array
  if (!str[0]) return [];

  var lines = [[]];

  // Split into lines
  var currLine = lines[0];
  for (var i = 0; i < str.length; ++i) {
    var c = str[i];
    if (c == 0xA) { // '\n'
      currLine = [];
      lines.push(currLine);
    }
    else {
      currLine.push(c);
    }
  }

  // Process and join lines
  str = [];
  for (var i = 0; i < lines.length; ++i) {
    // Process line
    lines[i] = reshapeSentence(lines[i]);

    // Add it to the string
    for (var j = 0; j < lines[i].length; ++j) {
      str.push(lines[i][j]);
    }

    // Add a '\n' if not the last line
    if (i != lines.length - 1) {
      str.push(0xA);
    }
  }

  return asUnicode ? str : encodeUnicode(str);
}

function arabicLength(strArray) {
  var count = 0;
  for (var i = 0; i < strArray.length; ++i) {
    var c = strArray[i];
    if (!Harakat[c] && c != 0) count++
  }
  return count;
}

function addSpacesForNonArabicChars(src) {
  var arabicLetters = /[\u0600-\u06FF]/; // Unicode range for Arabic letters
  
  var result = '';
  for (var i = 0; i < src.length; i++) {
    var currentChar = src.charAt(i);
    var previousChar = i > 0 ? src.charAt(i - 1) : '';
    var nextChar = i < src.length - 1 ? src.charAt(i + 1) : '';

    var isArabicPrevious = arabicLetters.test(previousChar);
    var isArabicNext = arabicLetters.test(nextChar);

    if (!arabicLetters.test(currentChar)) {
      if (isArabicPrevious) {
        result += ' ';
      }
      result += currentChar;
      if (isArabicNext) {
        result += ' ';
      }
    } else {
      result += currentChar;
    }
  }

  return result;
}

function reverseWordsOrder(reversed) {
  var linesArray = reversed.split("\n"); // Split the input by newline characters
  var reversedLinesArray = linesArray.map(function(line) {
    var wordsArray = line.split(" "); // Split each line by spaces
    var reversedArray = wordsArray.reverse();
    return reversedArray.join(" ");
  });
  var reversedStr = reversedLinesArray.join("\n"); // Join the lines using newline characters
  return reversedStr;
}

function convert(src) {
	
	let reversed = addSpacesForNonArabicChars(src);
	reversed = reversed.replace(/ء/g, ' ء ');
	reversed = arabicReshape(reversed);
	reversed = reverseWordsOrder(reversed);
	reversed = reversed.replace(/ء\ /g, 'ء');
	return reversed;
}
export default convert;

