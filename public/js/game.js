/**
 * Wolfdragon Game — Stub (Parts 2–8 will build this out)
 * Currently just draws the "loading" state on canvas.
 */

(function () {
  const canvas  = document.getElementById('game-canvas');
  const ctx     = canvas.getContext('2d');
  const overlay = document.querySelector('.game-coming-soon');

  // Will be replaced in Part 2 with the full pixel-art engine
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#cc0000';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('WOLFDRAGON', canvas.width / 2, canvas.height / 2 - 20);

  ctx.fillStyle = '#660000';
  ctx.font = '13px monospace';
  ctx.fillText('Game engine loading soon...', canvas.width / 2, canvas.height / 2 + 10);

  // Hide the HTML overlay once canvas is drawn
  if (overlay) overlay.classList.add('hidden');
})();
