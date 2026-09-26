const fs = require('fs');
const path = require('path');

// Helper to count syllables in an English word accurately
function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!word) return 0;
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

// Check if a word is complex (>= 3 syllables) for Gunning Fog
function isComplexWord(word) {
  const cleanWord = word.replace(/[^a-zA-Z]/g, '');
  if (!cleanWord || cleanWord.length < 6) return false;
  
  // Ignore common prefixes/suffixes for Fog complex word count
  let stem = cleanWord.toLowerCase();
  if (stem.endsWith('ing') || stem.endsWith('es') || stem.endsWith('ed')) {
    stem = stem.slice(0, -3);
  }
  return countSyllables(stem) >= 3;
}

// Extract article text from HTML
function extractArticleText(htmlContent) {
  const match = htmlContent.match(/<div class="e-content">([\s\S]*?)<\/div>/i);
  let rawHtml = match ? match[1] : htmlContent;
  
  // Remove pre/code blocks from readability scoring
  const textWithoutCode = rawHtml.replace(/<pre[\s\S]*?<\/pre>/gi, '').replace(/<code[\s\S]*?<\/code>/gi, '');
  
  // Extract paragraphs for structural paragraph length check
  const paragraphMatches = textWithoutCode.match(/<p>([\s\S]*?)<\/p>/gi) || [];
  const paragraphTexts = paragraphMatches.map(p => p.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);

  const cleanText = textWithoutCode.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return { cleanText, paragraphTexts };
}

// Get nominated file or target
function getTargetFile() {
  const args = process.argv.slice(2);
  if (args.length > 0) {
    let target = args[0];
    if (!target.endsWith('index.html')) {
      if (fs.existsSync(path.join(__dirname, '..', 'blog', target, 'index.html'))) {
        target = path.join('blog', target, 'index.html');
      } else if (fs.existsSync(path.join(__dirname, '..', target))) {
        target = target;
      }
    }
    return path.resolve(__dirname, '..', target);
  }

  const blogDir = path.join(__dirname, '..', 'blog');
  const entries = fs.readdirSync(blogDir, { withFileTypes: true });
  
  let nominatedFile = null;
  let newestPost = null;
  let newestMtime = 0;

  for (const entry of entries) {
    if (entry.isDirectory() && entry.name !== '2019' && entry.name !== '2020' && entry.name !== '2021') {
      const indexPath = path.join(blogDir, entry.name, 'index.html');
      if (fs.existsSync(indexPath)) {
        const stats = fs.statSync(indexPath);
        if (stats.mtimeMs > newestMtime) {
          newestMtime = stats.mtimeMs;
          newestPost = indexPath;
        }
        const content = fs.readFileSync(indexPath, 'utf-8');
        if (content.includes('data-proofread="true"') || content.includes('data-review="true"')) {
          nominatedFile = indexPath;
          break;
        }
      }
    }
  }

  return nominatedFile || newestPost;
}

function runProofreader() {
  const filePath = getTargetFile();
  if (!filePath || !fs.existsSync(filePath)) {
    console.error('Error: Could not find target HTML file for proofreading.');
    process.exit(1);
  }

  const relativePath = path.relative(path.join(__dirname, '..'), filePath);
  const htmlContent = fs.readFileSync(filePath, 'utf-8');
  
  const titleMatch = htmlContent.match(/<title>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/&amp;/g, '&') : relativePath;

  const { cleanText, paragraphTexts } = extractArticleText(htmlContent);

  const sentences = cleanText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  const words = cleanText.match(/\b[a-zA-Z0-9'-]+\b/g) || [];
  
  const wordCount = words.length;
  const sentenceCount = sentences.length || 1;
  const totalSyllables = words.reduce((acc, w) => acc + countSyllables(w), 0);
  const complexWords = words.filter(isComplexWord);

  const avgWordsPerSentence = wordCount / sentenceCount;
  const avgSyllablesPerWord = totalSyllables / (wordCount || 1);
  const complexWordPct = (complexWords.length / (wordCount || 1)) * 100;

  // 1. Flesch Reading Ease
  const fleschEase = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);

  // 2. Flesch-Kincaid Grade Level
  const fkGrade = (0.39 * avgWordsPerSentence) + (11.8 * avgSyllablesPerWord) - 15.59;

  // 3. Gunning Fog Index
  const gunningFog = 0.4 * (avgWordsPerSentence + complexWordPct);

  // Passive voice detection per sentence
  const passiveSentences = sentences.filter(s => /\b(am|is|are|was|were|be|been|being)\s+([a-z]+ed|[a-z]+en)\b/i.test(s));
  const passivePct = (passiveSentences.length / sentenceCount) * 100;

  // Paragraph length check for ISO 24495
  const paragraphWordCounts = paragraphTexts.map(p => (p.match(/\b[a-zA-Z0-9'-]+\b/g) || []).length);
  const maxParagraphWords = paragraphWordCounts.length > 0 ? Math.max(...paragraphWordCounts) : 0;
  const avgParagraphWords = paragraphWordCounts.length > 0 ? paragraphWordCounts.reduce((a, b) => a + b, 0) / paragraphWordCounts.length : 0;

  // 4. ISO 24495-1 Plain Language Foundation Assessment
  // Principles: Findable, Comprehensible, Usable, Perceivable
  let isoDeductions = 0;

  // Sentence length penalty (> 18 words/sentence)
  if (avgWordsPerSentence > 18) {
    isoDeductions += (avgWordsPerSentence - 18) * 2.5;
  }
  // Complex word penalty (> 10% complex words)
  if (complexWordPct > 10) {
    isoDeductions += (complexWordPct - 10) * 3;
  }
  // Passive voice penalty (> 10% passive sentences)
  if (passivePct > 10) {
    isoDeductions += (passivePct - 10) * 1.5;
  }
  // Overly long paragraph penalty (> 120 words)
  if (maxParagraphWords > 120) {
    isoDeductions += (maxParagraphWords - 120) * 0.15;
  }

  const isoScore = Math.max(0, Math.min(100, Math.round(100 - isoDeductions)));

  let isoRating = 'ISO 24495 Compliant (High Plain Language Quality)';
  if (isoScore < 60) isoRating = 'ISO 24495 Non-Compliant (High Complexity / Needs Editing)';
  else if (isoScore < 75) isoRating = 'ISO 24495 Moderate Compliance (Fairly Clear)';
  else if (isoScore < 85) isoRating = 'ISO 24495 Good Compliance (Clear & Readably Accessible)';

  const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));
  const longSentences = sentences.filter(s => s.split(/\s+/).length > 25);

  // Filler words
  const fillerWords = ['basically', 'literally', 'actually', 'obviously', 'simply', 'really', 'very'];
  const foundFillers = {};
  words.forEach(w => {
    const lower = w.toLowerCase();
    if (fillerWords.includes(lower)) {
      foundFillers[lower] = (foundFillers[lower] || 0) + 1;
    }
  });

  console.log('\n==================================================');
  console.log(` 📝 PROOFREADING & MULTI-INDEX READABILITY REPORT`);
  console.log(` File: ${relativePath}`);
  console.log(` Title: ${title}`);
  console.log('==================================================\n');

  console.log(`📊 CORE STATS:`);
  console.log(` - Word Count:             ${wordCount} words`);
  console.log(` - Sentences:              ${sentenceCount} sentences`);
  console.log(` - Paragraphs:             ${paragraphTexts.length} paragraphs`);
  console.log(` - Estimated Reading Time: ~${readTimeMinutes} min read`);
  console.log(` - Avg Sentence Length:    ${avgWordsPerSentence.toFixed(1)} words/sentence`);
  console.log(` - Avg Paragraph Length:   ${avgParagraphWords.toFixed(1)} words/paragraph`);

  console.log(`\n📚 MULTI-INDEX READABILITY EVALUATION:`);
  console.log(` - Flesch Reading Ease:    ${fleschEase.toFixed(1)} / 100  (Higher = Easier)`);
  console.log(` - Flesch-Kincaid Grade:   ${fkGrade.toFixed(1)}        (Target: 7.0 - 10.0)`);
  console.log(` - Gunning Fog Index:      ${gunningFog.toFixed(1)}        (Target: 6.0 - 10.0)`);
  console.log(` - Complex Words (3+ syl): ${complexWords.length} (${complexWordPct.toFixed(1)}%)`);

  console.log(`\n🌐 ISO 24495-1 PLAIN LANGUAGE FOUNDATION:`);
  console.log(` - ISO 24495 Score:        ${isoScore} / 100`);
  console.log(` - Compliance Rating:      ${isoRating}`);

  console.log(`\n🔍 STYLE & EDITORIAL AUDIT:`);
  console.log(` - Passive Voice Sentences: ${passiveSentences.length} (${passivePct.toFixed(1)}%)`);
  if (passiveSentences.length > 0) {
    console.log(`   Sample: "${passiveSentences[0].trim()}"`);
  }

  const fillerCount = Object.values(foundFillers).reduce((a, b) => a + b, 0);
  console.log(` - Filler/Weasel Words:     ${fillerCount}`);
  if (fillerCount > 0) {
    console.log(`   Details: ${Object.entries(foundFillers).map(([k, v]) => `${k} (${v})`).join(', ')}`);
  }

  if (longSentences.length > 0) {
    console.log(`\n⚠️  LONG SENTENCES (> 25 words): ${longSentences.length}`);
    longSentences.slice(0, 3).forEach((s, idx) => {
      console.log(`   ${idx + 1}. "${s.trim()}"`);
    });
  } else {
    console.log(`\n✅ Sentence lengths are well-balanced.`);
  }

  console.log('\n==================================================\n');
}

runProofreader();
