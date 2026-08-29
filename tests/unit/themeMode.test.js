const test = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

test('Dark/Light Mode Theme System Tests', async (t) => {
  await t.test('Header Component contains theme toggle buttons for Desktop & Mobile', () => {
    const headerHtml = fs.readFileSync(path.join(__dirname, '../../public/components/header.html'), 'utf8');
    assert.ok(headerHtml.includes('id="btnThemeToggle"'), 'Desktop theme toggle button must exist');
    assert.ok(headerHtml.includes('id="themeToggleIcon"'), 'Theme toggle icon must exist');
    assert.ok(headerHtml.includes('id="btnThemeToggleMobile"'), 'Mobile theme toggle button must exist');
    assert.ok(headerHtml.includes('window.toggleTheme()'), 'Toggle function call must be attached');
  });

  await t.test('index.html & graphview.html have anti-FOUC script and light/dark styles', () => {
    const indexHtml = fs.readFileSync(path.join(__dirname, '../../public/index.html'), 'utf8');
    const graphviewHtml = fs.readFileSync(path.join(__dirname, '../../public/graphview.html'), 'utf8');

    [indexHtml, graphviewHtml].forEach(html => {
      assert.ok(html.includes("localStorage.getItem('theme')"), 'Must check localStorage for saved theme');
      assert.ok(html.includes('html.light .glass-panel') || html.includes('html:not(.dark) .glass-panel'), 'Must have light mode glass-panel');
      assert.ok(html.includes('html.light .markdown-body') || html.includes('html:not(.dark) .markdown-body'), 'Must have light mode markdown styles');
      assert.ok(html.includes('html.light .node-text') || html.includes('html:not(.dark) .node-text'), 'Must have light mode node text styling');
    });
  });

  await t.test('login.html supports Dark/Light mode and has toggle button', () => {
    const loginHtml = fs.readFileSync(path.join(__dirname, '../../public/login.html'), 'utf8');
    assert.ok(loginHtml.includes('id="btnLoginThemeToggle"'), 'Login page must have theme toggle button');
    assert.ok(loginHtml.includes('toggleLoginTheme'), 'Login page must define toggleLoginTheme function');
    assert.ok(loginHtml.includes("localStorage.getItem('theme')"), 'Login page must read theme from storage');
  });

  await t.test('header.js exposes window.toggleTheme, window.applyTheme and window.getCurrentTheme', () => {
    const headerJs = fs.readFileSync(path.join(__dirname, '../../public/js/header.js'), 'utf8');
    assert.ok(headerJs.includes('window.toggleTheme = toggleTheme'), 'Must export toggleTheme');
    assert.ok(headerJs.includes('window.applyTheme = applyTheme'), 'Must export applyTheme');
    assert.ok(headerJs.includes('window.getCurrentTheme = getCurrentTheme'), 'Must export getCurrentTheme');
    assert.ok(headerJs.includes("new CustomEvent('themechange'"), 'Must dispatch themechange event');
  });

  await t.test('graph.js reacts to themechange and updates link/node styling and folder group contrast', () => {
    const graphJs = fs.readFileSync(path.join(__dirname, '../../public/js/graph.js'), 'utf8');
    assert.ok(graphJs.includes("window.addEventListener('themechange'"), 'Graph must listen to themechange');
    assert.ok(graphJs.includes('defaultLinkStroke') || graphJs.includes('isDarkMode'), 'Graph must dynamically compute link stroke based on theme');
    assert.ok(graphJs.includes('text-slate-800 dark:text-white'), 'Folder items must have high contrast in light mode');
  });
});
