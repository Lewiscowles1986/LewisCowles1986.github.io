const fs = require('fs');
const path = require('path');
const readline = require('readline');

const BLOG_DIR = path.join(__dirname, '..', 'blog');

function createPrompter() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return {
    ask: (query) => new Promise(resolve => rl.question(query, resolve)),
    close: () => rl.close()
  };
}

// Detect specific notice type from post HTML content
function detectNoticeType(content) {
  const match = content.match(/<blockquote class="editorial-notice">([\s\S]*?)<\/blockquote>/i);
  if (!match) {
    return { hasNotice: false, label: '[□]' };
  }

  const noticeText = match[1];
  if (noticeText.includes('no longer agree')) {
    return { hasNotice: true, type: 'outdated', label: '[☑ Outdated]' };
  } else if (noticeText.includes('no longer representative')) {
    return { hasNotice: true, type: 'unrepresentative', label: '[☑ Unrepresentative]' };
  } else if (noticeText.includes('superseded')) {
    return { hasNotice: true, type: 'superseded', label: '[☑ Superseded]' };
  } else {
    return { hasNotice: true, type: 'custom', label: '[☑ Custom Notice]' };
  }
}

// Extract the post descriptor from an index.html file
function describePost(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const titleMatch = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : path.basename(path.dirname(filePath));
  const dateMatch = content.match(/datetime="(\d{4}-\d{2}-\d{2})"/i);

  return {
    slug: path.basename(path.dirname(filePath)),
    title: rawTitle,
    date: dateMatch ? dateMatch[1] : 'Unknown date',
    path: filePath,
    ...detectNoticeType(content)
  };
}

// Resolve a CLI argument (slug, relative or absolute path) to a target HTML file
function resolveTarget(target) {
  if (!target.endsWith('index.html')) {
    if (fs.existsSync(path.join(__dirname, '..', 'blog', target, 'index.html'))) {
      target = path.join('blog', target, 'index.html');
    } else if (fs.existsSync(path.join(__dirname, '..', target))) {
      target = target;
    }
  }
  return path.resolve(__dirname, '..', target);
}

// Gather all post index files
function getPostFiles() {
  const posts = [];
  const entries = fs.readdirSync(BLOG_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && entry.name !== '2019' && entry.name !== '2020' && entry.name !== '2021') {
      const indexPath = path.join(BLOG_DIR, entry.name, 'index.html');
      if (fs.existsSync(indexPath)) {
        posts.push(describePost(indexPath));
      }
    }
  }

  // Sort by date descending
  return posts.sort((a, b) => b.date.localeCompare(a.date));
}

// Add, update, or remove editorial callout in an HTML file
function applyDisclaimer(filePath, disclaimerHtml) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // Remove existing notice if present
  content = content.replace(/<blockquote class="editorial-notice">[\s\S]*?<\/blockquote>\s*/gi, '');

  if (disclaimerHtml) {
    const noticeBlock = `<blockquote class="editorial-notice">\n\t\t\t\t\t<p>${disclaimerHtml}</p>\n\t\t\t\t</blockquote>\n\t\t\t\t`;
    content = content.replace(/(<div class="e-content">)/i, `$1\n\t\t\t\t${noticeBlock}`);
  }

  fs.writeFileSync(filePath, content, 'utf-8');
}

async function main() {
  const prompter = createPrompter();

  // Optional CLI argument: pre-select a target file and skip the menu
  const [arg] = process.argv.slice(2).filter(a => a && !a.startsWith('-'));
  const autoTarget = arg ? resolveTarget(arg) : null;

  while (true) {
    const posts = getPostFiles();

    console.log('\n==================================================');
    console.log(' 📌 BLOG EDITORIAL DISCLAIMER & TRIAGE TOOL');
    console.log('==================================================\n');

    posts.forEach((post, index) => {
      const numStr = `[${index + 1}]`.padEnd(5);
      const labelStr = post.label.padEnd(20);
      console.log(` ${numStr} ${labelStr} ${post.date} - ${post.title}`);
    });

    console.log('\n--------------------------------------------------');
    const selectionStr = autoTarget
      ? ''
      : await prompter.ask('\nSelect a post number to edit (or "q" to quit): ');

    if (selectionStr.trim().toLowerCase() === 'q') {
      console.log('Goodbye!');
      break;
    }

    let selectedPost;
    if (autoTarget) {
      if (!fs.existsSync(autoTarget)) {
        console.error(`Error: Could not find target HTML file "${autoTarget}".`);
        prompter.close();
        process.exit(1);
      }
      selectedPost = describePost(autoTarget);
    } else {
      const selection = parseInt(selectionStr, 10);
      if (isNaN(selection) || selection < 1 || selection > posts.length) {
        console.log('❌ Invalid selection.');
        continue;
      }
      selectedPost = posts[selection - 1];
    }
    console.log(`\n--------------------------------------------------`);
    console.log(` Selected: "${selectedPost.title}" (${selectedPost.date})`);
    console.log(` Current Status: ${selectedPost.label}`);
    console.log(`--------------------------------------------------\n`);

    console.log(' Select Disclaimer Type:');
    console.log('  [1] [☑ Outdated]         "I no longer agree with the opinions/approach expressed in this post."');
    console.log('  [2] [☑ Unrepresentative] "This post is no longer representative of my current views."');
    console.log('  [3] [☑ Superseded]       "Superseded with link to replacement post"');
    console.log('  [4] [☑ Custom]           "Enter custom disclaimer message"');
    console.log('  [5] [□]                  "Remove existing disclaimer callout"');
    console.log('  [0] Cancel');

    const option = await prompter.ask('\n Choice [0-5]: ');
    let disclaimerHtml = null;

    switch (option.trim()) {
      case '1':
        disclaimerHtml = '<strong>Author Note:</strong> I no longer agree with the opinions or technical approach expressed in this post.';
        break;
      case '2':
        disclaimerHtml = '<strong>Author Note:</strong> This post was written at an earlier stage in my engineering journey and is no longer representative of my current views or practices.';
        break;
      case '3':
        const replacementTitle = await prompter.ask('   Replacement Post Title: ');
        const replacementUrl = await prompter.ask('   Replacement Post URL (e.g. /blog/new-post/): ');
        disclaimerHtml = `<strong>Author Note:</strong> The ideas in this post have been superseded. Please see <a href="${replacementUrl}">${replacementTitle}</a> for my updated thoughts.`;
        break;
      case '4':
        const customText = await prompter.ask('   Enter custom callout message: ');
        disclaimerHtml = `<strong>Author Note:</strong> ${customText}`;
        break;
      case '5':
        disclaimerHtml = null;
        break;
      case '0':
      default:
        console.log('Cancelled.');
        if (autoTarget) {
          prompter.close();
          return;
        }
        continue;
    }

    applyDisclaimer(selectedPost.path, disclaimerHtml);

    if (disclaimerHtml) {
      console.log(`\n✅ Added disclaimer callout to ${selectedPost.slug}/index.html`);
    } else {
      console.log(`\n✅ Removed disclaimer from ${selectedPost.slug}/index.html`);
    }

    // When a post was pre-selected from the CLI, handle it once then exit
    if (autoTarget) {
      break;
    }
  }

  prompter.close();
}

main().catch(err => console.error(err));
