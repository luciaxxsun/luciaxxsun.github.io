/* =========================================================
   星光谷 · 界面（HUD / 对话 / 商店 / 背包 / 睡觉）
   ========================================================= */

const UI = {
  dialogOpen: false, dialogWith: null, bagDirty: true, hudDirty: true,
  lastClock: '', lastEnergy: -1, lastGold: -1, panelOpen: false,

  init() {
    this.toolbarEl = document.getElementById('toolbar');
    this.toastEl = document.getElementById('toasts');
    this.heartsEl = document.getElementById('hearts');
    this.panelMask = document.getElementById('panelMask');
    this.panelTitle = document.getElementById('panelTitle');
    this.panelBody = document.getElementById('panelBody');
    this.dlg = document.getElementById('dlg');

    document.getElementById('panelClose').onclick = () => this.closePanel();
    this.panelMask.addEventListener('click', e => { if (e.target === this.panelMask) this.closePanel(); });
    document.getElementById('dlgClose').onclick = () => this.closeDialog();

    this.buildToolbar();
    this.refreshToolbar();
    this.buildHearts();
    this.hudDirty = true;
  },

  /* ---------- 工具条 ---------- */
  buildToolbar() {
    this.toolbarEl.innerHTML = '';
    this.slots = TOOLS.map((t, i) => {
      const d = document.createElement('div');
      d.className = 'slot';
      d.innerHTML = `<span class="key">${i + 1}</span><span class="tname" style="color:${t.color}">${t.n}</span>`;
      d.onclick = () => { G.tool = i; this.refreshToolbar(); sfx('click', 0.2); };
      this.toolbarEl.appendChild(d);
      return d;
    });
  },
  refreshToolbar() {
    this.slots.forEach((d, i) => d.classList.toggle('sel', i === G.tool));
    this.hudDirty = true;
  },

  /* ---------- 好感面板 ---------- */
  buildHearts() {
    this.heartsEl.innerHTML = '';
    this.heartRows = NPCS.map(def => {
      const row = document.createElement('div');
      row.className = 'hrow';
      row.innerHTML = `<b>${def.name}</b><span>♥ 0</span>`;
      this.heartsEl.appendChild(row);
      return row;
    });
  },
  refreshHearts() {
    NPCS.forEach((def, i) => {
      const pts = G.hearts[def.id] || 0;
      const full = Math.round(pts / 10);
      const row = this.heartRows[i];
      row.querySelector('span').textContent = '♥'.repeat(full) + '·'.repeat(10 - full);
      row.classList.toggle('max', pts >= 100);
    });
  },

  /* ---------- toast ---------- */
  toast(msg, keep) {
    const d = document.createElement('div');
    d.className = 'toast' + (keep ? ' keep' : '');
    d.textContent = msg;
    this.toastEl.appendChild(d);
    setTimeout(() => { d.classList.add('out'); setTimeout(() => d.remove(), 400); }, keep ? 2600 : 1700);
  },

  /* ---------- 通用面板 ---------- */
  openPanel(title, bodyHTML) {
    this.panelTitle.textContent = title;
    this.panelBody.innerHTML = bodyHTML;
    this.panelMask.classList.remove('hidden');
    this.panelOpen = true;
    G.paused = true;
  },
  closePanel() {
    this.panelMask.classList.add('hidden');
    this.panelOpen = false;
    if (!this.dialogOpen) G.paused = false;
    this.hudDirty = true;
  },

  /* ---------- 对话 ---------- */
  openDialog(npc) {
    this.dialogOpen = true;
    this.dialogWith = npc;
    G.paused = true;
    npc.talkT = 2.2;
    const pts = G.hearts[npc.id] || 0;
    if (!G.talked[npc.id]) {
      G.talked[npc.id] = true;
      G.hearts[npc.id] = Math.min(100, pts + 5);
      this.refreshHearts();
    }
    const tier = (G.hearts[npc.id] || 0) >= 70 ? 2 : (G.hearts[npc.id] || 0) >= 30 ? 1 : 0;
    const line = npc.def.lines[tier][Math.floor(Math.random() * npc.def.lines[tier].length)];
    const face = this.portrait(npc);
    this.dlg.querySelector('.face').innerHTML = `<img src="${face}">`;
    this.dlg.querySelector('h3').textContent = npc.name;
    this.dlg.querySelector('p').textContent = line;
    const acts = this.dlg.querySelector('.acts');
    acts.innerHTML = '';
    const giftBtn = document.createElement('button');
    giftBtn.textContent = '送东西';
    giftBtn.onclick = () => this.openGift(npc);
    const bye = document.createElement('button');
    bye.className = 'ghost';
    bye.textContent = '再见';
    bye.onclick = () => this.closeDialog();
    acts.appendChild(giftBtn);
    acts.appendChild(bye);
    this.dlg.classList.remove('hidden');
  },
  closeDialog() {
    this.dlg.classList.add('hidden');
    this.dialogOpen = false;
    this.dialogWith = null;
    if (!this.panelOpen) { G.paused = false; startMusic(); }
  },
  portrait(npc) {
    if (npc._face) return npc._face;
    const c = CV(16, 16), g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(npc.sprite, 0, 0, 16, 16, 0, 0, 16, 16);
    const big = CV(96, 96), bg = big.getContext('2d');
    bg.imageSmoothingEnabled = false;
    bg.drawImage(c, 0, 0, 96, 96);
    npc._face = big.toDataURL();
    return npc._face;
  },

  openGift(npc) {
    const items = Object.keys(G.bag).filter(k => !k.endsWith('_seed') && G.bag[k] > 0);
    if (!items.length) { this.toast('背包里没有能送的东西'); return; }
    if (G.gifted[npc.id]) { this.toast(npc.name + '今天已经收过你的礼物了'); return; }
    const html = `<div class="giftgrid">` + items.map(k =>
      `<button class="gift" data-id="${k}"><img src="${iconURL(k)}"><span>${ITEMS[k].n} ×${G.bag[k]}</span></button>`
    ).join('') + `</div><p class="dim">送出去的东西会从背包里消失。</p>`;
    this.dlg.classList.add('hidden');
    this.openPanel('送 ' + npc.name + ' 什么？', html);
    this.panelBody.querySelectorAll('.gift').forEach(btn => {
      btn.onclick = () => this.giveGift(npc, btn.dataset.id);
    });
  },
  giveGift(npc, id) {
    if (!takeItem(id, 1)) return;
    G.gifted[npc.id] = true;
    const liked = npc.def.likes.indexOf(id) >= 0;
    G.hearts[npc.id] = Math.min(100, (G.hearts[npc.id] || 0) + (liked ? 12 : 5));
    this.refreshHearts();
    sfx('coin', 0.3);
    this.closePanel();
    this.dlg.classList.remove('hidden');
    this.dlg.querySelector('p').textContent = liked
      ? GIFT_LIKED[Math.floor(Math.random() * GIFT_LIKED.length)]
      : GIFT_NEUTRAL[Math.floor(Math.random() * GIFT_NEUTRAL.length)];
    this.dialogOpen = true;
    G.paused = true;
    this.checkReward(npc);
  },
  checkReward(npc) {
    const pts = G.hearts[npc.id] || 0;
    if (pts >= 50 && !G.rewardPaid) { G.rewardPaid = G.rewardPaid || {}; }
    if (pts >= 50 && !(G.rewardPaid && G.rewardPaid[npc.id])) {
      G.rewardPaid = G.rewardPaid || {};
      G.rewardPaid[npc.id] = true;
      const seedId = Object.keys(CROPS).find(k => CROPS[k].season === G.season) || 'radish';
      addItem(seedId + '_seed', 3);
      this.toast(npc.name + '送了你 3 个' + CROPS[seedId].n + '种子', true);
    }
  },

  /* ---------- 商店 ---------- */
  openShop() {
    const buys = [];
    for (const k in CROPS) if (CROPS[k].season === G.season) buys.push({ id: k + '_seed', price: CROPS[k].seed, crop: k });
    buys.push({ id: 'bread', price: 30 });
    const buyHTML = buys.map(b => {
      const afford = G.gold >= b.price;
      const icon = b.crop ? iconURL(b.crop) : iconURL('bread');
      return `<button class="row buy ${afford ? '' : 'poor'}" data-id="${b.id}" data-price="${b.price}">
        <img src="${icon}"><span class="nm">${ITEMS[b.id].n}</span><span class="pr">${b.price} G</span></button>`;
    }).join('');
    const sellList = Object.keys(G.bag).filter(k => G.bag[k] > 0 && ITEMS[k] && ITEMS[k].sell > 0);
    const sellHTML = sellList.length ? sellList.map(k =>
      `<button class="row sell" data-id="${k}"><img src="${iconURL(k)}"><span class="nm">${ITEMS[k].n} ×${G.bag[k]}</span><span class="pr">+${ITEMS[k].sell * G.bag[k]} G</span></button>`
    ).join('') : `<p class="dim">现在没有可卖的东西。去收点菜吧。</p>`;
    const html = `
      <div class="shophead"><span class="gold">💰 <b id="shopGold">${G.gold}</b> G</span>
      <span class="dim">张伯：买种子，收成我全要。</span></div>
      <h4>买</h4><div class="shoplist">${buyHTML}</div>
      <h4>卖</h4><div class="shoplist">${sellHTML}</div>
      ${sellList.length ? `<button id="sellAll" class="wide">全部卖掉</button>` : ''}
    `;
    this.shopData = { buys };
    this.openPanel('杂货店 · 张伯', html);
    this.panelBody.querySelectorAll('.buy').forEach(btn => {
      btn.onclick = () => {
        const price = parseInt(btn.dataset.price);
        if (G.gold < price) { this.toast('钱不够'); return; }
        G.gold -= price; addItem(btn.dataset.id, 1);
        sfx('coin', 0.3); this.hudDirty = true;
        this.openShop();
      };
    });
    this.panelBody.querySelectorAll('.sell').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id, n = G.bag[id];
        if (!n) return;
        G.gold += ITEMS[id].sell * n;
        delete G.bag[id];
        sfx('coin', 0.35); this.hudDirty = true; this.bagDirty = true;
        this.checkMilestone();
        this.openShop();
      };
    });
    const sa = document.getElementById('sellAll');
    if (sa) sa.onclick = () => {
      let total = 0;
      for (const k in G.bag) if (ITEMS[k] && ITEMS[k].sell > 0 && G.bag[k] > 0) { total += ITEMS[k].sell * G.bag[k]; delete G.bag[k]; }
      if (total) { G.gold += total; sfx('coin', 0.4); this.toast('卖了 ' + total + ' G', true); }
      this.hudDirty = true; this.bagDirty = true;
      this.checkMilestone();
      this.openShop();
    };
  },
  checkMilestone() {
    if (G.gold >= TARGET_GOLD && G.milestone < 2) {
      G.milestone = 2;
      this.toast('🏆 攒够 ' + TARGET_GOLD + ' G！你可以把这当成退休了', true);
      saveGame();
    } else if (G.gold >= 1000 && G.milestone < 1) {
      G.milestone = 1;
      this.toast('存款 1000 G 了，农场有起色了', true);
    }
  },

  /* ---------- 背包 ---------- */
  toggleBag() {
    if (this.panelOpen) { this.closePanel(); return; }
    if (this.dialogOpen) return;
    this.openBag();
  },
  openBag() {
    const ids = Object.keys(G.bag).filter(k => G.bag[k] > 0);
    let total = 0;
    ids.forEach(k => { total += (ITEMS[k] ? ITEMS[k].sell : 0) * G.bag[k]; });
    let html = '';
    if (G.weather) html += `<p class="dim">${SEASONS[G.season]} ${G.day}日 · 体力 ${Math.round(G.energy)}/${G.maxEnergy} · 存款 ${G.gold} G</p>`;
    if (!ids.length) html += `<p class="dim">背包空空。翻地、播种、钓鱼、挖矿都会往这里装东西。</p>`;
    else {
      html += `<div class="baggrid">` + ids.map(k =>
        `<div class="bagitem"><img src="${iconURL(k)}"><b>${ITEMS[k].n}</b><span>×${G.bag[k]}</span><i>${ITEMS[k].sell} G</i></div>`
      ).join('') + `</div><p class="dim">合计可卖 ${total} G</p>`;
    }
    if (countItem('bread') > 0) {
      html += `<button class="wide" id="eatBtn">吃一块面包（+40 体力，剩 ${countItem('bread')}）</button>`;
    }
    html += `<p class="dim small">目标：攒够 ${TARGET_GOLD} G · 把三个村民的好感刷满</p>`;
    this.openPanel('背包', html);
    const eat = document.getElementById('eatBtn');
    if (eat) eat.onclick = () => {
      if (!takeItem('bread', 1)) return;
      G.energy = Math.min(G.maxEnergy, G.energy + 40);
      this.hudDirty = true;
      sfx('harvest', 0.3);
      this.toast('吃了面包，体力回来了', true);
      this.openBag();
    };
  },

  /* ---------- 睡觉 ---------- */
  openSleep() {
    this.openPanel('家', `<p>现在是 ${this.clock()}。要睡觉到明天早上吗？</p>
      <p class="dim">睡觉会回满体力，杂草和作物过一夜就长了。</p>
      <button class="wide" id="doSleep">睡觉 💤</button>
      <button class="wide ghost" id="noSleep">再逛逛</button>`);
    document.getElementById('doSleep').onclick = () => { this.closePanel(); advanceDay(); };
    document.getElementById('noSleep').onclick = () => this.closePanel();
  },
  forceSleep() {
    if (this._sleeping) return;
    this._sleeping = true;
    this.closePanel(); this.closeDialog();
    this.toast('已经凌晨了，你倒头就睡', true);
    setTimeout(() => { advanceDay(); this._sleeping = false; }, 400);
  },

  /* ---------- ESC ---------- */
  escape() {
    if (this.panelOpen) return this.closePanel();
    if (this.dialogOpen) return this.closeDialog();
    this.openPanel('暂停', `<p>${SEASONS[G.season]} ${G.day}日 · ${this.clock()}</p>
      <button class="wide" id="resumeBtn">继续</button>
      <button class="wide ghost" id="saveBtn">保存进度</button>
      <button class="wide ghost" id="restartBtn">重新开始（清空存档）</button>
      <p class="dim small">WASD 移动 · 1~5 换工具 · 空格 使用 · E 说话/进屋 · Tab 背包 · M 静音</p>`);
    document.getElementById('resumeBtn').onclick = () => this.closePanel();
    document.getElementById('saveBtn').onclick = () => { saveGame(); this.toast('已保存', true); };
    document.getElementById('restartBtn').onclick = () => {
      localStorage.removeItem(SAVE_KEY);
      location.reload();
    };
  },

  /* ---------- 开场 ---------- */
  showIntro(hasSave) {
    const el = document.getElementById('intro');
    el.classList.remove('hidden');
    el.innerHTML = `
      <div class="card">
        <h1>星 光 谷</h1>
        <p class="sub">一个小镇的种田生活</p>
        <p>你接手了爷爷留下的一小块地。<br>翻地、播种、浇水，等它长大；<br>去池塘钓鱼，去石场挖矿，去店里卖钱；<br>顺便和镇上三个人说说话。</p>
        <div class="keys">
          <span><b>WASD</b> 走路</span><span><b>1~5</b> 换工具</span>
          <span><b>空格</b> 使用</span><span><b>E</b> 说话 / 进屋</span>
          <span><b>Tab</b> 背包</span><span><b>Esc</b> 菜单</span>
        </div>
        <div class="btns">
          ${hasSave ? `<button id="continueBtn">继续上次</button>` : ''}
          <button id="newBtn" class="${hasSave ? 'ghost' : ''}">开始新的一天</button>
        </div>
      </div>`;
    el.classList.remove('hidden');
    if (hasSave) {
      document.getElementById('continueBtn').onclick = () => {
        loadGame(); buildGround(); spawnNpcs();
        this.startGame();
      };
    }
    document.getElementById('newBtn').onclick = () => {
      newGame();
      this.startGame();
    };
  },
  startGame() {
    document.getElementById('intro').classList.add('hidden');
    G.introOpen = false;
    G.started = true;
    G.paused = false;
    this.hudDirty = true;
    this.bagDirty = true;
    this.refreshHearts();
    this.refreshToolbar();
    startMusic();
    this.toast('先去农场（家门口左边）翻地吧', true);
  },

  /* ---------- 每帧 ---------- */
  clock() {
    const m = Math.floor(G.minutes);
    const h = Math.floor(m / 60), mm = m % 60;
    return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm;
  },
  tick(now, dt) {
    if (!G.started) return;
    const c = this.clock();
    if (c !== this.lastClock) {
      this.lastClock = c;
      document.getElementById('clockTxt').textContent = c;
      document.getElementById('dateTxt').textContent = SEASONS[G.season] + ' ' + G.day + '日';
      document.getElementById('wxTxt').textContent = G.weather === 'rain' ? '🌧' : '☀';
    }
    const e = Math.round(G.energy);
    if (e !== this.lastEnergy) {
      this.lastEnergy = e;
      document.getElementById('energyFill').style.width = Math.max(0, (G.energy / G.maxEnergy) * 100) + '%';
      document.getElementById('energyTxt').textContent = e + '/' + G.maxEnergy;
    }
    if (G.gold !== this.lastGold) {
      this.lastGold = G.gold;
      document.getElementById('goldTxt').textContent = G.gold;
      this.checkMilestone();
    }
    /* 当前能种什么 */
    const seed = seasonSeedId();
    const tipEl = document.getElementById('seedTip');
    tipEl.textContent = seed ? `可种：${CROPS[seed].n}（${countItem(seed + '_seed')} 颗）` : '没有当季种子';
    tipEl.className = seed ? 'ok' : 'no';
    /* 手上的工具提示 */
    document.getElementById('toolTip').textContent = TOOLS[G.tool].n + ' · ' + TOOLS[G.tool].tip;
  }
};
