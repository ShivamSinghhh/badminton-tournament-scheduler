document.getElementById('footerYear').textContent = new Date().getFullYear();
let STATE = null; // { players, rounds, matchesPlayed, refereeCount, target }

// Persist the generated schedule and recorded results in the browser,
// so a refresh or accidental tab close doesn't wipe them.
const STORAGE_KEY = 'badminton-tournament-v1';

function saveState(){
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE)); } catch(e) { /* storage unavailable — app still works, just won't persist */ }
}

function loadState(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : null;
    return (data && Array.isArray(data.players) && Array.isArray(data.rounds)) ? data : null;
  } catch(e) { return null; }
}

function hasRecordedResults(){
  return !!(STATE && STATE.results && Object.values(STATE.results).some(Boolean));
}

function currentNames(){
  return document.getElementById('playersInput').value.split('\n').map(s=>s.trim()).filter(Boolean);
}

function updateLiveCount(){
  const n = currentNames().length;
  document.getElementById('playerCountLive').textContent = n + (n===1 ? ' player entered' : ' players entered');
}

function fillSample(){
  const count = Math.max(4, parseInt(document.getElementById('playerCountInput').value,10) || 40);
  const names = [];
  for(let i=1;i<=count;i++) names.push('Player ' + i);
  document.getElementById('playersInput').value = names.join('\n');
  document.getElementById('playerCountInput').value = count;
  updateLiveCount();
  flashField('playersInput');
}

// Number-of-players field changed: pad or trim the name list to match, keeping existing names.
function syncCountToList(){
  const target = Math.max(4, parseInt(document.getElementById('playerCountInput').value,10) || 4);
  const names = currentNames();
  if(target > names.length){
    for(let i=names.length+1;i<=target;i++) names.push('Player ' + i);
  } else if(target < names.length){
    names.length = target;
  }
  document.getElementById('playersInput').value = names.join('\n');
  updateLiveCount();
  flashField('playersInput');
}

// Name list edited by hand: keep the count field and live counter truthful.
function syncListToCount(){
  const n = currentNames().length;
  document.getElementById('playerCountInput').value = n || '';
  updateLiveCount();
}

function flashField(id){
  const el = document.getElementById(id);
  el.style.transition = 'none';
  el.style.borderColor = 'var(--court-green)';
  requestAnimationFrame(()=>{
    el.style.transition = 'border-color .6s ease';
    setTimeout(()=>{ el.style.borderColor = 'var(--line)'; }, 50);
  });
}

function shuffleArray(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]] = [arr[j],arr[i]];
  }
}

function generateSchedule(players, numCourts, matchesPerPlayer){
  const n = players.length;
  const matchesPlayed = new Array(n).fill(0);
  const refereeCount = new Array(n).fill(0);
  const partnerCount = Array.from({length:n},()=>new Array(n).fill(0));
  const opponentCount = Array.from({length:n},()=>new Array(n).fill(0));
  const rounds = [];
  const maxRounds = matchesPerPlayer * 4 + 30;
  let roundNum = 0;

  while(roundNum < maxRounds){
    const eligible = [];
    for(let i=0;i<n;i++) if(matchesPlayed[i] < matchesPerPlayer) eligible.push(i);
    if(eligible.length < 4) break;

    const usableCourts = Math.min(numCourts, Math.floor(eligible.length/4));
    if(usableCourts < 1) break;
    const slots = usableCourts*4;

    const sorted = eligible.map(i=>({i, r:Math.random()}))
      .sort((a,b)=> (matchesPlayed[a.i]-matchesPlayed[b.i]) || (a.r-b.r))
      .map(x=>x.i);
    const active = sorted.slice(0, slots);
    const activeSet = new Set(active);
    const sittingOut = [];
    for(let i=0;i<n;i++) if(!activeSet.has(i)) sittingOut.push(i);

    let best = null;
    const attempts = 70;
    for(let a=0;a<attempts;a++){
      const pool = [...active];
      shuffleArray(pool);
      const groups = [];
      for(let c=0;c<usableCourts;c++) groups.push(pool.slice(c*4, c*4+4));
      let totalCost = 0;
      const courtAssignments = groups.map(g=>{
        const [p0,p1,p2,p3] = g;
        const options = [
          [[p0,p1],[p2,p3]],
          [[p0,p2],[p1,p3]],
          [[p0,p3],[p1,p2]]
        ];
        let bestPairing = null, bestCost = Infinity;
        for(const [t1,t2] of options){
          const cost = partnerCount[t1[0]][t1[1]] + partnerCount[t2[0]][t2[1]]
            + opponentCount[t1[0]][t2[0]] + opponentCount[t1[0]][t2[1]]
            + opponentCount[t1[1]][t2[0]] + opponentCount[t1[1]][t2[1]];
          if(cost < bestCost){ bestCost = cost; bestPairing = [t1,t2]; }
        }
        totalCost += bestCost;
        return { teamA:bestPairing[0], teamB:bestPairing[1] };
      });
      if(!best || totalCost < best.totalCost) best = { courtAssignments, totalCost };
    }

    const refsNeededPerCourt = 2;
    const refPool = [...sittingOut].sort((x,y)=> (refereeCount[x]-refereeCount[y]) || (Math.random()-0.5));
    const referees = [];
    for(let c=0;c<usableCourts;c++){
      const pair = [];
      for(let k=0;k<refsNeededPerCourt;k++){
        const poolIdx = c*refsNeededPerCourt + k;
        pair.push(poolIdx < refPool.length ? refPool[poolIdx] : null);
      }
      referees.push(pair);
    }

    best.courtAssignments.forEach((m, idx)=>{
      [...m.teamA, ...m.teamB].forEach(p=>matchesPlayed[p]++);
      partnerCount[m.teamA[0]][m.teamA[1]]++; partnerCount[m.teamA[1]][m.teamA[0]]++;
      partnerCount[m.teamB[0]][m.teamB[1]]++; partnerCount[m.teamB[1]][m.teamB[0]]++;
      m.teamA.forEach(x=> m.teamB.forEach(y=>{ opponentCount[x][y]++; opponentCount[y][x]++; }));
      referees[idx].forEach(ref=>{ if(ref !== null) refereeCount[ref]++; });
    });

    const refereeSet = new Set(referees.flat().filter(r=>r!==null));
    rounds.push({
      roundNum: roundNum+1,
      courts: best.courtAssignments.map((m, idx)=>({
        court: idx+1,
        teamA: m.teamA.map(i=>players[i]),
        teamB: m.teamB.map(i=>players[i]),
        refereeIdxs: referees[idx],
        referees: referees[idx].map(r=> r !== null ? players[r] : null)
      })),
      byeIdx: sittingOut.filter(i=>!refereeSet.has(i)),
      bye: sittingOut.filter(i=>!refereeSet.has(i)).map(i=>players[i])
    });
    roundNum++;
  }

  return { rounds, matchesPlayed, refereeCount };
}

function handleGenerate(){
  const err = document.getElementById('configError');
  err.textContent = '';
  const rawNames = document.getElementById('playersInput').value
    .split('\n').map(s=>s.trim()).filter(Boolean);
  const courts = parseInt(document.getElementById('courtsInput').value, 10);
  const matches = parseInt(document.getElementById('matchesInput').value, 10);

  if(rawNames.length < 4){ err.textContent = 'Add at least 4 players.'; return; }
  if(!courts || courts < 1){ err.textContent = 'Enter at least 1 court.'; return; }
  if(!matches || matches < 1){ err.textContent = 'Enter at least 1 match per player.'; return; }

  const dupeCheck = new Set();
  const players = rawNames.map((nm,idx)=>{
    let name = nm;
    if(dupeCheck.has(name)) name = name + ' (' + (idx+1) + ')';
    dupeCheck.add(name);
    return name;
  });

  if(hasRecordedResults() && !confirm('Generating a new schedule will erase the match results you have recorded. Continue?')) return;

  const result = generateSchedule(players, courts, matches);
  const pointsCap = parseInt(document.getElementById('pointsCapInput').value,10) || 15;
  const timeCap = parseInt(document.getElementById('timeCapInput').value,10) || 8;
  STATE = { players, courts, matches, pointsCap, timeCap, ...result, results: {} };
  saveState();
  renderOutput();
}

function renderOutput(){
  const panel = document.getElementById('outputPanel');
  const underTarget = STATE.matchesPlayed.filter(m=>m<STATE.matches).length;
  panel.innerHTML = `
    <div class="tabs">
      <button class="tab-btn active" data-tab="schedule" onclick="switchTab('schedule')">Match Schedule</button>
      <button class="tab-btn" data-tab="referees" onclick="switchTab('referees')">Referee Sheet</button>
      <button class="tab-btn" data-tab="scorecards" onclick="switchTab('scorecards')">Score Cards</button>
      <button class="tab-btn" data-tab="players" onclick="switchTab('players')">Player Sheets</button>
      <button class="tab-btn" data-tab="standings" onclick="switchTab('standings')">Standings &amp; Results</button>
      <button class="tab-btn" data-tab="fairness" onclick="switchTab('fairness')">Fairness Check</button>
    </div>
    <div class="toolbar">
      <button class="btn btn-ghost" onclick="downloadCSV()">Download CSV</button>
      <button class="btn btn-amber" onclick="printCurrent()">Print Current Tab</button>
    </div>
    ${underTarget>0 ? `<div class="note-box"><b>Note:</b> ${underTarget} player(s) got fewer than ${STATE.matches} matches — this happens when the numbers don't divide evenly across ${STATE.courts} court(s). Check the Fairness tab for exact counts, or nudge courts/matches-per-player to smooth it out.</div>` : ''}
    <div class="tab-content active" id="tab-schedule">${renderScheduleTab()}</div>
    <div class="tab-content" id="tab-referees">${renderRefereeTab()}</div>
    <div class="tab-content" id="tab-scorecards">${renderScorecardsTab()}</div>
    <div class="tab-content" id="tab-players">${renderPlayersTab()}</div>
    <div class="tab-content" id="tab-standings">${renderStandingsTab()}</div>
    <div class="tab-content" id="tab-fairness">${renderFairnessTab()}</div>
  `;
}

function switchTab(name){
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active', b.dataset.tab===name));
  document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
  document.getElementById('tab-'+name).classList.add('active');
}

function printCurrent(){
  document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('printing'));
  document.querySelector('.tab-content.active').classList.add('printing');
  window.print();
}

function renderScheduleTab(){
  return STATE.rounds.map(r=>{
    const courts = r.courts.map(c=>`
      <div class="match-card">
        <div class="court-label">Court ${c.court}</div>
        <div class="team-row"><span class="team-tag a">1</span><span class="team-names">${c.teamA.join(' &amp; ')} <span class="wall-note">(wall side &middot; serves first)</span></span></div>
        <div class="vs-divider">VS</div>
        <div class="team-row"><span class="team-tag b">2</span><span class="team-names">${c.teamB.join(' &amp; ')}</span></div>
        <div class="ref-line">Referees: <b>${c.referees.filter(Boolean).join(' & ') || 'Unassigned'}</b></div>
      </div>
    `).join('');
    return `
      <div class="round-block">
        <div class="round-header">
          <span class="rnum">Round ${r.roundNum}</span>
          <span class="rmeta">${r.courts.length} court${r.courts.length>1?'s':''} in play &middot; ${r.bye.length} sitting out</span>
        </div>
        <div class="courts-grid">${courts}</div>
        ${r.bye.length ? `<div class="sitting-row"><b>Sitting out this round:</b> ${r.bye.join(', ')}</div>` : ''}
      </div>
    `;
  }).join('');
}

function buildPointBoxes(cap){
  let html = '';
  for(let i=1;i<=cap;i++) html += `<span class="point-box">${i}</span>`;
  return html;
}

function renderScorecardsTab(){
  const cap = STATE.pointsCap || 15;
  const timeCap = STATE.timeCap || 8;
  const cards = [];
  STATE.rounds.forEach(r=>{
    r.courts.forEach(c=>{
      const refs = c.referees.filter(Boolean).join(' & ') || 'Unassigned';
      cards.push(`
        <div class="scorecard">
          <div class="scorecard-head">
            <span class="sc-title">Round ${r.roundNum} &middot; Court ${c.court}</span>
            <span class="sc-sub">First to ${cap} &middot; ${timeCap} min cap</span>
          </div>
          <div class="sc-team">
            <div class="sc-team-label"><span class="num">1</span> Team 1 &mdash; Wall Side, Serves First</div>
            <div class="sc-players">${c.teamA.join(' & ')}</div>
            <div class="point-boxes">${buildPointBoxes(cap)}</div>
          </div>
          <div class="sc-team">
            <div class="sc-team-label"><span class="num">2</span> Team 2</div>
            <div class="sc-players">${c.teamB.join(' & ')}</div>
            <div class="point-boxes">${buildPointBoxes(cap)}</div>
          </div>
          <div class="sc-footer">
            <div class="sc-final-score">Final: <span class="sc-blank"></span> &ndash; <span class="sc-blank"></span></div>
            <div class="sc-winner-boxes">
              <span><span class="sc-checkbox"></span> Team 1 won</span>
              <span><span class="sc-checkbox"></span> Team 2 won</span>
            </div>
          </div>
          <div class="sc-refs">Referees: ${refs}</div>
        </div>
      `);
    });
  });
  return `
    <div class="note-box"><b>How referees use this:</b> cross off a numbered box as each point is scored (one row per team), circle or fill the checkbox for the winning team, and write in the final score. Hand each referee pair the cards for their assigned rounds before play starts — print this tab to get one card per match.</div>
    <div class="scorecards-grid">${cards.join('')}</div>
  `;
}

function renderRefereeTab(){
  let rows = '';
  STATE.rounds.forEach(r=>{
    r.courts.forEach(c=>{
      const refText = c.referees.filter(Boolean).join(' & ') || '<i>Unassigned</i>';
      rows += `<tr><td>${r.roundNum}</td><td>Court ${c.court}</td><td>${refText}</td><td>${c.teamA.join(' & ')} vs ${c.teamB.join(' & ')}</td></tr>`;
    });
  });
  return `<div class="table-wrap"><table>
    <thead><tr><th>Round</th><th>Court</th><th>Referees</th><th>Match</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

function renderPlayersTab(){
  const options = STATE.players.map((p,i)=>`<option value="${i}">${p}</option>`).join('');
  return `
    <div style="margin-bottom:16px;">
      <select id="playerSelect" onchange="renderSinglePlayer()">${options}</select>
      <button class="btn btn-ghost" style="margin-left:8px;" onclick="renderAllPlayers()">Show All Players (print view)</button>
    </div>
    <div id="playerDetail"></div>
  `;
}

function buildPlayerRows(pIdx){
  const rows = [];
  STATE.rounds.forEach(r=>{
    const court = r.courts.find(c => c.teamA.includes(STATE.players[pIdx]) || c.teamB.includes(STATE.players[pIdx]));
    if(court){
      const onTeamA = court.teamA.includes(STATE.players[pIdx]);
      const partner = (onTeamA ? court.teamA : court.teamB).find(n=>n!==STATE.players[pIdx]);
      const opponents = onTeamA ? court.teamB : court.teamA;
      rows.push(`<div class="pc-row"><span class="pc-round">R${r.roundNum}</span><span class="badge play">Playing</span><span>Court ${court.court} &middot; with <b>${partner}</b> vs ${opponents.join(' & ')}</span></div>`);
    } else if(r.bye.includes(STATE.players[pIdx])){
      rows.push(`<div class="pc-row"><span class="pc-round">R${r.roundNum}</span><span class="badge bye">Bye</span><span>Sitting out</span></div>`);
    } else {
      const refCourt = r.courts.find(c=>c.referees.includes(STATE.players[pIdx]));
      if(refCourt){
        const otherRef = refCourt.referees.filter(n=>n && n!==STATE.players[pIdx]).join(' & ');
        rows.push(`<div class="pc-row"><span class="pc-round">R${r.roundNum}</span><span class="badge ref">Referee</span><span>Court ${refCourt.court}${otherRef ? ' &middot; with ' + otherRef : ''} &middot; ${refCourt.teamA.join(' & ')} vs ${refCourt.teamB.join(' & ')}</span></div>`);
      }
    }
  });
  return rows.join('');
}

function renderSinglePlayer(){
  const idx = parseInt(document.getElementById('playerSelect').value,10);
  document.getElementById('playerDetail').innerHTML = `
    <div class="player-card">
      <h4>${STATE.players[idx]}</h4>
      ${buildPlayerRows(idx)}
    </div>
  `;
}

function renderAllPlayers(){
  let html = '';
  STATE.players.forEach((p,idx)=>{
    html += `<div class="player-card"><h4>${p}</h4>${buildPlayerRows(idx)}</div>`;
  });
  document.getElementById('playerDetail').innerHTML = html;
}

function resultKey(roundNum, court){ return roundNum + '_' + court; }

function recordResult(roundNum, court, winner){
  const key = resultKey(roundNum, court);
  // clicking the already-selected winner again clears it (undo)
  STATE.results[key] = (STATE.results[key] === winner) ? null : winner;
  saveState();
  document.getElementById('tab-standings').innerHTML = renderStandingsTab();
}

function renderStandingsTab(){
  const recordSections = STATE.rounds.map(r=>{
    const rows = r.courts.map(c=>{
      const key = resultKey(r.roundNum, c.court);
      const winner = STATE.results[key];
      return `
        <div class="result-row">
          <span class="rc-label">R${r.roundNum} &middot; C${c.court}</span>
          <button class="result-btn a ${winner==='A'?'winner':''}" onclick="recordResult(${r.roundNum},${c.court},'A')">
            <span class="rb-tag">1</span>${c.teamA.join(' & ')} <span class="wall-note">(wall side)</span>
          </button>
          <button class="result-btn b ${winner==='B'?'winner':''}" onclick="recordResult(${r.roundNum},${c.court},'B')">
            <span class="rb-tag">2</span>${c.teamB.join(' & ')}
          </button>
          ${!winner ? '<span class="result-undecided">not recorded</span>' : ''}
        </div>
      `;
    }).join('');
    return `<div class="result-round-title">Round ${r.roundNum}</div>${rows}`;
  }).join('');

  const standings = STATE.players.map((p, idx)=>{
    let wins = 0, losses = 0, played = 0;
    const ticks = [];
    STATE.rounds.forEach(r=>{
      const court = r.courts.find(c => c.teamA.includes(p) || c.teamB.includes(p));
      if(!court) return;
      played++;
      const onA = court.teamA.includes(p);
      const winner = STATE.results[resultKey(r.roundNum, court.court)];
      if(!winner){ ticks.push('pending'); return; }
      const won = (onA && winner==='A') || (!onA && winner==='B');
      if(won){ wins++; ticks.push('win'); } else { losses++; ticks.push('loss'); }
    });
    return { name:p, wins, losses, played, ticks };
  }).sort((a,b)=> b.wins - a.wins || (b.wins-b.losses) - (a.wins-a.losses));

  const maxWins = standings.length ? standings[0].wins : 0;

  const standingsRows = standings.map((s, i)=>{
    const rankClass = (s.wins>0 && s.wins===maxWins) ? 'gold' : '';
    const tickHtml = s.ticks.map(t=>{
      const symbol = t==='win' ? '&#10003;' : t==='loss' ? '&#10005;' : '&middot;';
      return `<span class="tick ${t}">${symbol}</span>`;
    }).join('');
    return `<tr>
      <td><span class="rank-badge ${rankClass}">${i+1}</span></td>
      <td>${s.name}</td>
      <td>${s.played}</td>
      <td><b>${s.wins}</b></td>
      <td>${s.losses}</td>
      <td><div class="tick-seq">${tickHtml || '<span class="hint">no matches</span>'}</div></td>
    </tr>`;
  }).join('');

  return `
    <div class="note-box"><b>How this works:</b> mark the winning team for each match below as results come in. The standings table updates live, ranking players by total wins — this is your leaderboard for the "most matches won" award. Results reset if you regenerate the schedule.</div>
    <div class="panel" style="margin-bottom:20px;">
      <h4 style="margin-bottom:12px;">Record Match Results</h4>
      ${recordSections}
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Rank</th><th>Player</th><th>Played</th><th>Won</th><th>Lost</th><th>Game-by-game</th></tr></thead>
        <tbody>${standingsRows}</tbody>
      </table>
    </div>
  `;
}

function renderFairnessTab(){
  const rows = STATE.players.map((p,i)=>{
    const m = STATE.matchesPlayed[i];
    const ref = STATE.refereeCount[i];
    const flag = m >= STATE.matches ? `<span class="stat-flag ok">On target</span>` : `<span class="stat-flag low">${STATE.matches - m} short</span>`;
    return `<tr><td>${p}</td><td>${m} / ${STATE.matches}</td><td>${ref}</td><td>${flag}</td></tr>`;
  }).join('');
  return `<div class="table-wrap"><table>
    <thead><tr><th>Player</th><th>Matches Played</th><th>Times Refereed</th><th>Status</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

function downloadCSV(){
  let csv = 'Round,Court,Team A,Team B,Referee 1,Referee 2\n';
  STATE.rounds.forEach(r=>{
    r.courts.forEach(c=>{
      csv += `${r.roundNum},${c.court},"${c.teamA.join(' & ')}","${c.teamB.join(' & ')}","${c.referees[0] || ''}","${c.referees[1] || ''}"\n`;
    });
    if(r.bye.length) csv += `${r.roundNum},Bye,"${r.bye.join(' & ')}",,,\n`;
  });
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tournament_schedule.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const saved = loadState();
if(saved){
  // Restore the last tournament: put its settings back in the form and re-render.
  STATE = saved;
  STATE.results = STATE.results || {};
  document.getElementById('playersInput').value = STATE.players.join('\n');
  document.getElementById('playerCountInput').value = STATE.players.length;
  document.getElementById('courtsInput').value = STATE.courts;
  document.getElementById('matchesInput').value = STATE.matches;
  document.getElementById('pointsCapInput').value = STATE.pointsCap;
  document.getElementById('timeCapInput').value = STATE.timeCap;
  updateLiveCount();
  renderOutput();
} else {
  fillSample();
  updateLiveCount();
}
