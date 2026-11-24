const partyBlueprint = [
  { id: 'terry', name: 'Terry', role: '曲球鬥士', sprite: './assets/terry.png', maxHp: 92, maxMp: 26, attack: 17, skill: 'curve' },
  { id: 'migie', name: 'Migie', role: '門派醫者', sprite: './assets/migie.png', maxHp: 84, maxMp: 34, attack: 13, skill: 'heal' },
  { id: 'jery', name: 'jeRy', role: '封印術士', sprite: './assets/jery.png', maxHp: 96, maxMp: 30, attack: 18, skill: 'seal' },
];

const stages = [
  {
    name: '王座前哨戰',
    kicker: 'BATTLE 01 · THE THRONE',
    enemy: '魔王 Ken13',
    hp: 146,
    attack: 15,
    art: './assets/jrpg-castle.webp',
    sprite: './assets/ken13-boss.png',
    telegraph: 'Ken13 正在凝聚魔力，下一回合將發動重擊。',
    intro: {
      kicker: 'CHAPTER ONE · THE CHALLENGE',
      title: '三位勇者，踏入魔王城',
      text: 'Terry、Migie 與 jeRy 終於來到王座大殿。魔王 Ken13 的身影立於球道盡頭——打倒他，這場挑戰就會結束嗎？',
      art: './assets/jrpg-castle.webp',
      button: '迎戰 Ken13',
    },
  },
  {
    name: '魔力核心',
    kicker: 'BATTLE 02 · THE CORE',
    enemy: '失控的魔力核心',
    hp: 178,
    attack: 18,
    art: './assets/ending-revival.webp',
    sprite: './assets/magic-core.svg',
    telegraph: '核心脈動不穩，下一回合將釋放全體衝擊。',
    intro: {
      kicker: 'THE BOSS RETURNS',
      title: '球道中央，仍有光芒',
      text: 'Terry 的曲球擊倒了魔王，卻繞過球道中央的魔力核心。殘存的力量再次聚攏。稍作休整後，你們必須先封住核心。',
      art: './assets/ending-revival.webp',
      button: '封住魔力核心',
    },
  },
  {
    name: '最後一道封印',
    kicker: 'BATTLE 03 · THE FINAL SEAL',
    enemy: '復活的 Ken13',
    hp: 214,
    attack: 21,
    art: './assets/ending-terry.webp',
    sprite: './assets/ken13-awakened.png',
    telegraph: '魔王準備釋放王座衝擊，守住隊伍！',
    intro: {
      kicker: 'THE FINAL ROUND',
      title: '魔王再度站上球道',
      text: '核心的力量喚醒了 Ken13。隊伍整頓完畢，準備迎接最後的對決；只有擊中封印的核心，才能讓魔王城真正歸於平靜。',
      art: './assets/ending-terry.webp',
      button: '開始最終決戰',
    },
  },
];

const skills = {
  curve: { label: '弧光曲球', cost: 8, description: '強力攻擊 · 34 傷害' },
  heal: { label: '回春符', cost: 9, description: '治療最低生命隊友 · 38' },
  seal: { label: '封印一投', cost: 8, description: '封印攻擊 · 39 傷害' },
  doubleStrike: { label: '二連擊', cost: 15, description: '連續二次攻擊 · 每次 10-15 傷害' },
  powerSlash: { label: '續力斬', cost: 15, description: '單次爆擊 · 25 傷害' },
  rockPaperScissors: { label: '猜猜拳', cost: 5, description: '猜拳勝利造成 30 傷害' },
};

const learnableSkillIds = ['doubleStrike', 'powerSlash', 'rockPaperScissors'];
const gestureNames = { scissors: '剪刀', rock: '石頭', paper: '布' };
const learningChance = 0.2;
const maxLearnedSkills = 3;
const consumables = {
  hpPotion: { label: '補血藥', resource: 'hp', maximum: 'maxHp', amount: 20, price: 10 },
  mpPotion: { label: '補魔藥', resource: 'mp', maximum: 'maxMp', amount: 30, price: 10 },
};
const startingItemInventory = { hpPotion: 2, mpPotion: 2 };
const $ = id => document.getElementById(id);
const views = ['story-screen', 'battle-screen', 'ending-screen'].map($);

let party;
let itemInventory = { ...startingItemInventory };
let stageIndex = 0;
let enemy;
let round = 1;
let actorIndex = 0;
let acted = [];
let guarded = new Set();
let locked = false;
let animating = false;
let enemyActing = false;
let selectingGesture = false;
let selectingItems = false;
let selectedItemId = '';
let showingItemShop = false;
let itemShopUnlocked = false;

function showView(view) {
  views.forEach(item => { item.hidden = item !== view; });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function beginAdventure() {
  party = partyBlueprint.map(hero => ({
    ...hero,
    hp: hero.maxHp,
    mp: hero.maxMp,
    learnedSkills: [],
    learning: false,
  }));
  itemInventory = { ...startingItemInventory };
  stageIndex = 0;
  selectingGesture = false;
  selectingItems = false;
  selectedItemId = '';
  showingItemShop = false;
  itemShopUnlocked = false;
  showStory(stages[stageIndex].intro);
}

function showStory(scene) {
  $('story-kicker').textContent = scene.kicker;
  $('story-title').textContent = scene.title;
  $('story-text').textContent = scene.text;
  $('story-art').style.backgroundImage = `url("${scene.art}")`;
  $('story-continue').textContent = `${scene.button} →`;
  showView($('story-screen'));
}

function restBetweenBattles() {
  party.forEach(hero => {
    hero.hp = hero.hp > 0
      ? Math.min(hero.maxHp, hero.hp + 35)
      : Math.ceil(hero.maxHp / 2);
    hero.mp = Math.min(hero.maxMp, hero.mp + 14);
  });
}

function startBattle() {
  const stage = stages[stageIndex];
  enemy = { name: stage.enemy, hp: stage.hp, maxHp: stage.hp, mp: stage.hp, maxMp: stage.hp, attack: stage.attack };
  round = 1;
  actorIndex = 0;
  acted = [];
  guarded = new Set();
  locked = false;
  animating = false;
  enemyActing = false;
  selectingGesture = false;
  selectingItems = false;
  selectedItemId = '';
  showingItemShop = false;
  $('battle-kicker').textContent = stage.kicker;
  $('battle-title').textContent = stage.name;
  $('enemy-name').textContent = stage.enemy;
  $('enemy-backdrop').style.backgroundImage = `url("${stage.art}")`;
  $('boss-sprite').src = stage.sprite;
  $('boss-sprite').alt = stage.enemy;
  $('enemy-stage').dataset.bossState = stageIndex === 1 ? 'core' : stageIndex === 2 ? 'awakened' : 'ken13';
  $('enemy-telegraph').textContent = stage.telegraph;
  $('battle-message').textContent = `${stage.enemy} 擋在你們面前。選擇第一位勇者的行動。`;
  showView($('battle-screen'));
  renderBattle();
}

function nextLivingActor(fromIndex = 0) {
  for (let offset = 0; offset < party.length; offset++) {
    const index = (fromIndex + offset) % party.length;
    if (party[index].hp > 0 && !acted.includes(index)) return index;
  }
  return -1;
}

function renderParty() {
  $('party-list').innerHTML = party.map((hero, index) => {
    const hpPercent = Math.max(0, hero.hp / hero.maxHp * 100);
    const mpPercent = Math.max(0, hero.mp / hero.maxMp * 100);
    const active = !locked && !animating && index === actorIndex && hero.hp > 0;
    const dead = hero.hp <= 0;
    const protection = guarded.has(index) ? ' · 防禦中' : '';
    return `<article class="hero-card${active ? ' is-active' : ''}${dead ? ' is-dead' : ''}" data-hero-id="${hero.id}">
      <div class="hero-portrait" aria-hidden="true"><img src="${hero.sprite}" alt="" draggable="false">${hero.learning ? '<span class="learning-mark">!</span>' : ''}</div>
      <div class="hero-card-content">
        <div class="hero-card-head"><span class="hero-name">${hero.name}${protection}</span><span class="hero-role">${dead ? '無法戰鬥' : hero.role}</span></div>
        <div class="hero-bars"><span class="bar-label">HP</span><span class="bar-value">${hero.hp}/${hero.maxHp}</span><div class="health-track"><span style="width:${hpPercent}%"></span></div><span class="bar-label"></span></div>
        <div class="hero-bars"><span class="bar-label">MP</span><span class="bar-value">${hero.mp}/${hero.maxMp}</span><div class="mp-track"><span style="width:${mpPercent}%"></span></div><span class="bar-label"></span></div>
      </div>
    </article>`;
  }).join('');
}

function renderCommands() {
  const hero = party[actorIndex];
  const box = $('command-buttons');
  if (locked || !hero) {
    box.innerHTML = '';
    return;
  }
  if (selectingGesture) {
    box.innerHTML = `
      ${Object.entries(gestureNames).map(([choice, name]) => `<button class="command-button" data-action="skill" data-skill-id="rockPaperScissors" data-choice="${choice}"><strong>${name}</strong><small>猜拳出招</small></button>`).join('')}
      <button class="command-button" data-action="cancel-gesture"><strong>返回</strong><small>取消猜拳</small></button>`;
    bindCommandButtons(box);
    return;
  }
  if (selectedItemId) {
    const item = consumables[selectedItemId];
    box.innerHTML = `
      ${getItemTargets().map(({ id, name, target }) => {
        const resource = item.resource.toUpperCase();
        const eligible = canUseItemOnTarget(selectedItemId, target);
        return `<button class="command-button" data-action="use-item" data-item-id="${selectedItemId}" data-target-id="${id}" ${eligible ? '' : 'disabled'}><strong>${name}</strong><small>${resource} ${target[item.resource]}/${target[item.maximum]}</small></button>`;
      }).join('')}
      <button class="command-button" data-action="back-to-items"><strong>返回道具</strong><small>取消選擇</small></button>`;
    bindCommandButtons(box);
    return;
  }
  if (showingItemShop) {
    box.innerHTML = `
      <p class="command-note">示範購買：每件 NT$10，不會實際扣款。</p>
      ${Object.entries(consumables).map(([itemId, item]) => `<button class="command-button" data-action="buy-item" data-item-id="${itemId}"><strong>${item.label} · NT$${item.price}</strong><small>${item.resource.toUpperCase()} +${item.amount} · 購買一個</small></button>`).join('')}
      <button class="command-button" data-action="back-to-items"><strong>返回道具</strong><small>取消購買</small></button>`;
    bindCommandButtons(box);
    return;
  }
  if (selectingItems) {
    box.innerHTML = `
      ${Object.entries(consumables).map(([itemId, item]) => {
        const eligible = getItemTargets().some(({ target }) => canUseItemOnTarget(itemId, target));
        const count = itemInventory[itemId];
        return `<button class="command-button" data-action="select-item" data-item-id="${itemId}" ${count < 1 || !eligible ? 'disabled' : ''}><strong>${item.label} ×${count}</strong><small>${item.resource.toUpperCase()} +${item.amount}</small></button>`;
      }).join('')}
      ${itemShopUnlocked ? '<button class="command-button" data-action="open-item-shop"><strong>道具商店</strong><small>示範購買 · NT$10/個</small></button>' : ''}
      <button class="command-button" data-action="cancel-items"><strong>返回</strong><small>取消使用道具</small></button>`;
    bindCommandButtons(box);
    return;
  }

  const skill = skills[hero.skill];
  const skillHelp = hero.skill === 'heal' ? skill.description : `${skill.description} · MP ${skill.cost}`;
  const learnedCommands = hero.learnedSkills.map(skillId => {
    const learnedSkill = skills[skillId];
    if (skillId === 'rockPaperScissors') {
      return `<button class="command-button" data-action="open-gesture" ${hero.mp < learnedSkill.cost ? 'disabled' : ''}><strong>${learnedSkill.label}</strong><small>${learnedSkill.description} · MP ${learnedSkill.cost}</small></button>`;
    }
    return `<button class="command-button" data-action="skill" data-skill-id="${skillId}" ${hero.mp < learnedSkill.cost ? 'disabled' : ''}><strong>${learnedSkill.label}</strong><small>${learnedSkill.description} · MP ${learnedSkill.cost}</small></button>`;
  }).join('');
  box.innerHTML = `
    <button class="command-button" data-action="attack"><strong>普通攻擊</strong><small>造成 ${hero.attack} 傷害 · 不消耗 MP</small></button>
    <button class="command-button" data-action="skill" data-skill-id="${hero.skill}" ${hero.mp < skill.cost ? 'disabled' : ''}><strong>${skill.label}</strong><small>${skillHelp}</small></button>
    ${learnedCommands}
    <button class="command-button" data-action="open-items"><strong>使用道具</strong><small>補血藥 ${itemInventory.hpPotion} · 補魔藥 ${itemInventory.mpPotion}</small></button>
    <button class="command-button" data-action="guard"><strong>架勢防禦</strong><small>本回合受到傷害減半</small></button>`;
  bindCommandButtons(box);
}

function bindCommandButtons(box) {
  box.querySelectorAll('[data-action]').forEach(button => {
    button.addEventListener('click', () => handleCommandButton(button));
  });
}

function handleCommandButton(button) {
  const action = button.dataset.action;
  const itemId = button.dataset.itemId;
  if (action === 'open-gesture') {
    selectingGesture = true;
    renderCommands();
  } else if (action === 'cancel-gesture') {
    selectingGesture = false;
    renderCommands();
  } else if (action === 'open-items') {
    selectingItems = true;
    renderCommands();
  } else if (action === 'select-item') {
    selectedItemId = itemId;
    selectingItems = false;
    renderCommands();
  } else if (action === 'back-to-items') {
    selectedItemId = '';
    showingItemShop = false;
    selectingItems = true;
    renderCommands();
  } else if (action === 'cancel-items') {
    selectingItems = false;
    renderCommands();
  } else if (action === 'open-item-shop') {
    if (!itemShopUnlocked) return;
    selectingItems = false;
    showingItemShop = true;
    renderCommands();
  } else if (action === 'buy-item') {
    purchaseDemoItem(itemId);
  } else if (action === 'use-item') {
    takeAction('item', button.dataset.targetId, itemId);
  } else {
    takeAction(action, button.dataset.choice, button.dataset.skillId);
  }
}

function canUseItemOnTarget(itemId, target) {
  const item = consumables[itemId];
  return Boolean(item && target && target.hp > 0);
}

function getItemTargets() {
  return [
    { id: 'enemy', name: `${enemy.name}（敵方）`, target: enemy },
    ...party.map(member => ({ id: member.id, name: member.name, target: member })),
  ];
}

function purchaseDemoItem(itemId) {
  const item = consumables[itemId];
  if (!itemShopUnlocked || !item) return;
  itemInventory[itemId]++;
  $('battle-message').textContent = `示範購買成功：已獲得一個${item.label}（NT$${item.price}，不會實際扣款）。`;
  renderCommands();
}

function renderBattle() {
  const stage = stages[stageIndex];
  const percentage = Math.max(0, enemy.hp / enemy.maxHp * 100);
  const mpPercentage = Math.max(0, enemy.mp / enemy.maxMp * 100);
  $('enemy-health-bar').style.width = `${percentage}%`;
  $('enemy-health-text').textContent = `${enemy.hp} / ${enemy.maxHp}`;
  $('enemy-mp-bar').style.width = `${mpPercentage}%`;
  $('enemy-mp-text').textContent = `${enemy.mp} / ${enemy.maxMp}`;
  $('round-chip').textContent = `回合 ${round}`;
  $('log-count').textContent = `回合 ${round}`;
  $('party-status').textContent = enemyActing ? '敵方行動中'
    : animating ? '招式發動中'
      : `${acted.length} / ${party.filter(hero => hero.hp > 0).length} 人已行動`;
  const actor = party[actorIndex];
  $('turn-title').textContent = enemyActing ? '敵人正在行動…'
    : animating ? `${actor?.name ?? '勇者'} 發動招式…`
      : actor ? `${actor.name} 的回合` : '回合結束';
  $('turn-hint').textContent = enemyActing || animating ? '留意戰場上的動向' : '選擇攻擊、技能或防禦';
  renderParty();
  renderCommands();
}

function tryLearnSkill(hero) {
  const availableSkillIds = learnableSkillIds.filter(skillId => !hero.learnedSkills.includes(skillId));
  if (hero.learnedSkills.length >= maxLearnedSkills || !availableSkillIds.length || Math.random() >= learningChance) return null;

  const skillId = availableSkillIds[Math.floor(Math.random() * availableSkillIds.length)];
  hero.learnedSkills.push(skillId);
  hero.learning = true;
  window.setTimeout(() => {
    hero.learning = false;
    if (!views[1].hidden) renderParty();
  }, 1500);
  return skills[skillId];
}

function takeAction(action, choice, skillId) {
  if (locked || animating) return;
  const hero = party[actorIndex];
  if (!hero || hero.hp <= 0) return;
  const messages = [];
  let healingTarget = null;
  let effectAmount = 0;
  let recoveryType = 'hp';
  let selfDamage = 0;
  let damageNumbers = [];
  let usedSkillId = '';
  let gestureResult = '';
  if (action === 'attack') {
    enemy.hp = Math.max(0, enemy.hp - hero.attack);
    effectAmount = hero.attack;
    messages.push(`${hero.name} 發動普通攻擊，造成 ${hero.attack} 點傷害。`);
  } else if (action === 'guard') {
    guarded.add(actorIndex);
    messages.push(`${hero.name} 穩住架勢，準備承受攻擊。`);
  } else if (action === 'item') {
    const item = consumables[skillId];
    const target = choice === 'enemy' ? enemy : party.find(member => member.id === choice);
    if (!item || itemInventory[skillId] < 1 || !target || !canUseItemOnTarget(skillId, target)) return;

    itemInventory[skillId]--;
    selectedItemId = '';
    selectingItems = false;
    showingItemShop = false;
    effectAmount = Math.min(item.amount, target[item.maximum] - target[item.resource]);
    target[item.resource] += effectAmount;
    healingTarget = target;
    recoveryType = item.resource;
    messages.push(`${hero.name} 使用${item.label}，${target.name} 的 ${item.resource.toUpperCase()} 恢復 ${effectAmount} 點。`);
    if (!itemShopUnlocked && Object.values(itemInventory).every(count => count === 0)) {
      itemShopUnlocked = true;
      messages.push('初始道具已用完，示範商店已開放（不會實際扣款）。');
    }
  } else if (action === 'skill') {
    usedSkillId = skillId || hero.skill;
    const skill = skills[usedSkillId];
    const canUseSkill = usedSkillId === hero.skill || hero.learnedSkills.includes(usedSkillId);
    if (!skill || !canUseSkill) return;
    if (hero.mp < skill.cost) return;
    if (usedSkillId === 'rockPaperScissors' && !gestureNames[choice]) return;
    hero.mp -= skill.cost;
    selectingGesture = false;
    if (usedSkillId === 'heal') {
      const target = party.filter(member => member.hp > 0).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (!target) return;
      const restored = Math.min(target.maxHp - target.hp, 38);
      target.hp += restored;
      healingTarget = target;
      effectAmount = restored;
      messages.push(`${hero.name} 對 ${target.name} 施放回春符，恢復 ${restored} 點生命。`);
    } else if (usedSkillId === 'doubleStrike') {
      damageNumbers = [10 + Math.floor(Math.random() * 6), 10 + Math.floor(Math.random() * 6)];
      effectAmount = damageNumbers.reduce((total, damage) => total + damage, 0);
      enemy.hp = Math.max(0, enemy.hp - effectAmount);
      messages.push(`${hero.name} 使出「二連擊」，連續造成 ${damageNumbers[0]}、${damageNumbers[1]} 點傷害！`);
    } else if (usedSkillId === 'powerSlash') {
      effectAmount = 25;
      enemy.hp = Math.max(0, enemy.hp - effectAmount);
      messages.push(`${hero.name} 使出「續力斬」，爆擊造成 25 點傷害！`);
    } else if (usedSkillId === 'rockPaperScissors') {
      const opponentChoice = Object.keys(gestureNames)[Math.floor(Math.random() * 3)];
      messages.push(`${hero.name} 出${gestureNames[choice]}，對手出${gestureNames[opponentChoice]}。`);
      if (choice === opponentChoice) {
        gestureResult = `${gestureNames[choice]} VS ${gestureNames[opponentChoice]} · 平手`;
        messages.push('猜拳平手，雙方都沒有受傷。');
      } else if (
        (choice === 'scissors' && opponentChoice === 'paper')
        || (choice === 'rock' && opponentChoice === 'scissors')
        || (choice === 'paper' && opponentChoice === 'rock')
      ) {
        gestureResult = `${gestureNames[choice]} VS ${gestureNames[opponentChoice]} · 勝利`;
        effectAmount = 30;
        enemy.hp = Math.max(0, enemy.hp - effectAmount);
        messages.push('猜拳獲勝，擊中對手造成 30 點傷害！');
      } else {
        gestureResult = `${gestureNames[choice]} VS ${gestureNames[opponentChoice]} · 落敗`;
        selfDamage = 30;
        hero.hp = Math.max(0, hero.hp - selfDamage);
        messages.push(`${hero.name} 猜拳落敗，受到 30 點傷害！`);
      }
    } else {
      const damage = usedSkillId === 'curve' ? 34 : 39;
      enemy.hp = Math.max(0, enemy.hp - damage);
      effectAmount = damage;
      messages.push(`${hero.name} 使出「${skill.label}」，造成 ${damage} 點傷害！`);
    }
  }

  const learnedSkill = action === 'attack' ? tryLearnSkill(hero) : null;
  if (learnedSkill) messages.push(`${hero.name} 領悟新技能「${learnedSkill.label}」！`);
  acted.push(actorIndex);
  $('battle-message').textContent = messages.join(' ');
  animating = true;
  $('enemy-health-bar').style.width = `${Math.max(0, enemy.hp / enemy.maxHp * 100)}%`;
  $('enemy-health-text').textContent = `${enemy.hp} / ${enemy.maxHp}`;
  $('enemy-mp-bar').style.width = `${Math.max(0, enemy.mp / enemy.maxMp * 100)}%`;
  $('enemy-mp-text').textContent = `${enemy.mp} / ${enemy.maxMp}`;
  $('turn-title').textContent = action === 'item' ? `${hero.name} 使用道具…` : `${hero.name} 發動招式…`;
  $('turn-hint').textContent = action === 'item' ? '道具效果套用中' : '招式正在命中目標';
  $('party-status').textContent = '招式發動中';
  $('command-buttons').querySelectorAll('button').forEach(button => { button.disabled = true; });
  renderParty();
  playHeroAction(hero, action, effectAmount, healingTarget, usedSkillId, damageNumbers, selfDamage, gestureResult, recoveryType);

  window.setTimeout(() => {
    animating = false;
    if (enemy.hp <= 0) {
      finishBattle();
      return;
    }

    const next = nextLivingActor(actorIndex + 1);
    if (next >= 0) {
      actorIndex = next;
      renderBattle();
    } else {
      locked = true;
      window.setTimeout(enemyTurn, 180);
    }
  }, 620);
}

function addFloatingNumber(container, text, className) {
  const number = document.createElement('span');
  number.className = `floating-number ${className}`;
  number.textContent = text;
  container.append(number);
  window.setTimeout(() => number.remove(), 900);
  return number;
}

function playHeroAction(hero, action, amount, healingTarget, skillId = '', damageNumbers = [], selfDamage = 0, gestureResult = '', recoveryType = 'hp') {
  if (gestureResult) {
    const result = document.createElement('span');
    result.className = 'gesture-result';
    result.textContent = gestureResult;
    $('enemy-stage').append(result);
    window.setTimeout(() => result.remove(), 1500);
  }

  const card = document.querySelector(`[data-hero-id="${hero.id}"]`);
  if (selfDamage > 0) {
    card?.classList.add('is-hurt');
    if (card) addFloatingNumber(card, `-${selfDamage}`, 'damage-number');
    window.setTimeout(() => card?.classList.remove('is-hurt'), 650);
    return;
  }
  if (action === 'guard') {
    card?.classList.add('is-guarding');
    window.setTimeout(() => card?.classList.remove('is-guarding'), 700);
    return;
  }
  if (healingTarget) {
    card?.classList.add('is-casting');
    if (healingTarget === enemy) {
      const bossCharacter = $('boss-character');
      const bossEffect = recoveryType === 'mp' ? 'is-mp-restoring' : 'is-healing';
      bossCharacter.classList.add(bossEffect);
      const number = recoveryType === 'mp' ? `+${amount} MP` : `+${amount}`;
      const numberClass = recoveryType === 'mp' ? 'mp-number' : 'heal-number';
      addFloatingNumber(bossCharacter, number, numberClass);
      window.setTimeout(() => {
        card?.classList.remove('is-casting');
        bossCharacter.classList.remove(bossEffect);
      }, 750);
      return;
    }

    const targetCard = document.querySelector(`[data-hero-id="${healingTarget.id}"]`);
    targetCard?.classList.add('is-healing');
    if (targetCard) {
      const number = recoveryType === 'mp' ? `+${amount} MP` : `+${amount}`;
      const numberClass = recoveryType === 'mp' ? 'mp-number' : 'heal-number';
      addFloatingNumber(targetCard, number, numberClass);
    }
    window.setTimeout(() => {
      card?.classList.remove('is-casting');
      targetCard?.classList.remove('is-healing');
    }, 750);
    return;
  }

  if (!amount && !damageNumbers.length) return;
  const character = $('boss-character');
  character.classList.remove('is-hit');
  void character.offsetWidth;
  character.classList.add('is-hit');
  card?.classList.add('is-acting');
  const effectClass = action === 'attack' ? 'fx-slash'
    : skillId === 'curve' ? 'fx-curve'
      : skillId === 'doubleStrike' ? 'fx-double'
        : skillId === 'powerSlash' ? 'fx-critical'
          : skillId === 'rockPaperScissors' ? 'fx-rps'
            : 'fx-seal';
  const hits = damageNumbers.length ? damageNumbers : [amount];
  hits.forEach((damage, index) => {
    const effect = document.createElement('span');
    effect.className = `combat-effect ${effectClass}`;
    effect.style.animationDelay = `${index * 0.18}s`;
    if (skillId === 'seal' && action === 'skill') effect.textContent = '封';
    if (skillId === 'doubleStrike') effect.textContent = '連';
    if (skillId === 'powerSlash') effect.textContent = '斬';
    if (skillId === 'rockPaperScissors') effect.textContent = '拳';
    $('enemy-stage').append(effect);
    const number = addFloatingNumber($('enemy-stage'), `-${damage}`, 'damage-number');
    number.style.animationDelay = `${index * 0.18}s`;
    window.setTimeout(() => effect.remove(), 1000 + index * 180);
  });
  window.setTimeout(() => {
    character.classList.remove('is-hit');
    card?.classList.remove('is-acting');
  }, 760);
}

function enemyTurn() {
  if (views[1].hidden) return;
  locked = true;
  animating = false;
  enemyActing = true;
  renderBattle();
  window.setTimeout(() => {
    const messages = [];
    const impacts = [];
    const partyAlive = party.map((hero, index) => ({ hero, index })).filter(item => item.hero.hp > 0);
    const isAreaAttack = round % 3 === 0 && enemy.mp >= 15;
    if (round % 3 === 0 && !isAreaAttack) messages.push(`${enemy.name} MP 不足，改為單體攻擊`);
    if (isAreaAttack) {
      enemy.mp -= 15;
      messages.push(`${enemy.name} 消耗 15 MP 發動範圍衝擊`);
      partyAlive.forEach(({ hero, index }) => {
        const damage = Math.max(1, Math.floor(enemy.attack * 0.62 * (guarded.has(index) ? 0.5 : 1)));
        hero.hp = Math.max(0, hero.hp - damage);
        impacts.push({ id: hero.id, damage });
        messages.push(`${hero.name} 受到 ${damage} 點衝擊`);
      });
    } else if (partyAlive.length) {
      const targetItem = partyAlive.reduce((best, item) =>
        item.hero.hp / item.hero.maxHp < best.hero.hp / best.hero.maxHp ? item : best, partyAlive[0]);
      const damage = Math.max(1, Math.floor(enemy.attack * (guarded.has(targetItem.index) ? 0.5 : 1)));
      targetItem.hero.hp = Math.max(0, targetItem.hero.hp - damage);
      impacts.push({ id: targetItem.hero.id, damage });
      messages.push(`${enemy.name} 攻擊 ${targetItem.hero.name}，造成 ${damage} 點傷害。`);
    }

    guarded.clear();
    $('battle-message').textContent = messages.join('。') + '。';
    renderParty();
    playEnemyAction(impacts);

    window.setTimeout(() => {
      if (party.every(hero => hero.hp <= 0)) {
        finishBattle(false);
        return;
      }

      round++;
      acted = [];
      actorIndex = nextLivingActor();
      locked = false;
      enemyActing = false;
      $('battle-message').textContent += ' 勇者小隊準備反擊。';
      renderBattle();
    }, 650);
  }, 250);
}

function playEnemyAction(impacts) {
  const character = $('boss-character');
  character.classList.add('is-casting');
  const effect = document.createElement('span');
  effect.className = 'combat-effect fx-enemy-wave';
  $('enemy-stage').append(effect);
  impacts.forEach(({ id, damage }) => {
    const card = document.querySelector(`[data-hero-id="${id}"]`);
    card?.classList.add('is-hurt');
    if (card) addFloatingNumber(card, `-${damage}`, 'damage-number');
    window.setTimeout(() => card?.classList.remove('is-hurt'), 650);
  });
  window.setTimeout(() => {
    character.classList.remove('is-casting');
    effect.remove();
  }, 700);
}

function finishBattle(victory = true) {
  locked = true;
  animating = false;
  enemyActing = false;
  renderBattle();
  const result = document.createElement('div');
  result.className = 'battle-result';
  const message = document.createElement('p');
  const button = document.createElement('button');
  button.className = 'button button-primary';
  if (!victory) {
    message.textContent = '勇者小隊倒下了，但傳說尚未結束。調整戰術，再試一次吧。';
    button.textContent = '重新挑戰本場 ↻';
    button.addEventListener('click', startBattle);
  } else {
    const finishedStage = stageIndex;
    const nextStory = stageIndex < stages.length - 1;
    message.textContent = nextStory
      ? `${enemy.name} 暫時失去力量。王座深處仍有魔力在呼喚。`
      : '封印重新亮起，魔王城終於歸於寧靜。';
    const notice = document.createElement('span');
    notice.className = 'auto-transition';
    notice.textContent = nextStory ? '即將自動前往下一段劇情…' : '即將自動進入第一章結局…';
    result.append(message, notice);
    window.setTimeout(() => {
      if (views[1].hidden || !locked || stageIndex !== finishedStage) return;
      if (nextStory) {
        stageIndex++;
        restBetweenBattles();
        showStory(stages[stageIndex].intro);
      } else {
        showEnding();
      }
    }, 1800);
  }
  if (!victory) result.append(message, button);
  $('command-buttons').replaceChildren(result);
  $('turn-title').textContent = victory ? '戰鬥勝利' : '隊伍倒下';
  $('turn-hint').textContent = victory ? '劇情將自動繼續' : '你可以重新挑戰';
  $('party-status').textContent = victory ? '勝利' : '需要重試';
}

function showEnding() {
  $('ending-art').style.backgroundImage = 'url("./assets/ending-seal.webp")';
  $('ending-text').textContent = 'Terry 的曲球曾讓魔王倒下，卻沒有擊中藏在球道中央的力量。這一次，三位勇者並肩作戰，jeRy 將最後一道封印打入核心。王座下的法陣再次亮起，Ken13 終於被封印。第一章，完。';
  showView($('ending-screen'));
}

$('story-continue').addEventListener('click', startBattle);
$('play-again').addEventListener('click', beginAdventure);
beginAdventure();
