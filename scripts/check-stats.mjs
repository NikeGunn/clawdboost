#!/usr/bin/env node
/**
 * 📊 ClawdBoost Stats Checker
 * 
 * Check your npm package download statistics daily!
 * 
 * Usage:
 *   node scripts/check-stats.mjs
 *   npm run stats
 */

const PACKAGE_NAME = 'clawdboost';

// ANSI colors for terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
};

const c = (color, text) => `${colors[color]}${text}${colors.reset}`;

async function fetchJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    return null;
  }
}

async function getDownloadStats() {
  console.log(c('bright', '\n📊 ClawdBoost Download Statistics'));
  console.log('═'.repeat(50));

  // Fetch all stats in parallel
  const [lastDay, lastWeek, lastMonth, packageInfo] = await Promise.all([
    fetchJSON(`https://api.npmjs.org/downloads/point/last-day/${PACKAGE_NAME}`),
    fetchJSON(`https://api.npmjs.org/downloads/point/last-week/${PACKAGE_NAME}`),
    fetchJSON(`https://api.npmjs.org/downloads/point/last-month/${PACKAGE_NAME}`),
    fetchJSON(`https://registry.npmjs.org/${PACKAGE_NAME}`),
  ]);

  // Package info
  if (packageInfo) {
    const latestVersion = packageInfo['dist-tags']?.latest || 'unknown';
    const versions = Object.keys(packageInfo.versions || {}).length;
    console.log(`\n${c('cyan', '📦 Package Info')}`);
    console.log(`   Name: ${c('bright', PACKAGE_NAME)}`);
    console.log(`   Latest: ${c('green', `v${latestVersion}`)}`);
    console.log(`   Total Versions: ${c('yellow', versions)}`);
  }

  // Download counts
  console.log(`\n${c('cyan', '📈 Downloads')}`);
  
  if (lastDay) {
    console.log(`   Today (24h):    ${c('green', formatNumber(lastDay.downloads))} downloads`);
  } else {
    console.log(`   Today (24h):    ${c('yellow', 'Loading...')}`);
  }
  
  if (lastWeek) {
    console.log(`   This Week:      ${c('green', formatNumber(lastWeek.downloads))} downloads`);
  } else {
    console.log(`   This Week:      ${c('yellow', 'Loading...')}`);
  }
  
  if (lastMonth) {
    console.log(`   This Month:     ${c('green', formatNumber(lastMonth.downloads))} downloads`);
  } else {
    console.log(`   This Month:     ${c('yellow', 'Loading...')}`);
  }

  // Calculate daily average
  if (lastMonth && lastMonth.downloads > 0) {
    const dailyAvg = Math.round(lastMonth.downloads / 30);
    console.log(`   Daily Average:  ${c('magenta', `~${formatNumber(dailyAvg)}`)} downloads/day`);
  }

  // Useful links
  console.log(`\n${c('cyan', '🔗 Quick Links')}`);
  console.log(`   npm:        ${c('blue', `https://www.npmjs.com/package/${PACKAGE_NAME}`)}`);
  console.log(`   npm stats:  ${c('blue', `https://npm-stat.com/charts.html?package=${PACKAGE_NAME}`)}`);
  console.log(`   bundlephobia: ${c('blue', `https://bundlephobia.com/package/${PACKAGE_NAME}`)}`);
  console.log(`   GitHub:     ${c('blue', 'https://github.com/NikeGunn/clawdboost')}`);

  console.log('\n' + '═'.repeat(50));
  console.log(c('green', '✨ Keep building! Every download is someone you helped!'));
  console.log('');

  return { lastDay, lastWeek, lastMonth };
}

async function getDownloadHistory() {
  console.log(`\n${c('bright', '📅 Download History (Last 7 Days)')}`);
  console.log('─'.repeat(40));

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const history = await fetchJSON(
    `https://api.npmjs.org/downloads/range/${startDate}:${endDate}/${PACKAGE_NAME}`
  );

  if (history && history.downloads) {
    const maxDownloads = Math.max(...history.downloads.map(d => d.downloads), 1);
    
    history.downloads.forEach(day => {
      const date = new Date(day.day);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const barLength = Math.round((day.downloads / maxDownloads) * 20);
      const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);
      
      console.log(`   ${dayName} ${dateStr}: ${c('green', bar)} ${day.downloads}`);
    });
  } else {
    console.log('   Unable to fetch history (check your internet connection)');
  }
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

async function main() {
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  console.log(c('bright', `\n🚀 ClawdBoost Stats - ${today}`));
  
  await getDownloadStats();
  await getDownloadHistory();
  
  console.log(`\n${c('yellow', '💡 Pro Tips:')}`);
  console.log('   • Run this daily to track your growth');
  console.log('   • Share milestones on social media');
  console.log('   • More features = more downloads!');
  console.log('');
}

main().catch(console.error);
