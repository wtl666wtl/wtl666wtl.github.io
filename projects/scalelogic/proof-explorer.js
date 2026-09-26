(() => {
  const host = document.querySelector('#proof-explorer');
  const bank = window.SCALELOGIC_EXAMPLES;
  if (!host || !bank?.length) return;
  const $ = selector => host.querySelector(selector);
  const ns = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs = {}, text) => {
    const el = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
    if (text !== undefined) el.textContent = text;
    return el;
  };
  let level = 4, depth = 3, current, step = 0, selected, timer, fit = true;
  const history = new Map();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const descriptions = [
    'Follow a chain of implications from the given facts to the goal.',
    'Bring multiple premises together before applying a rule.',
    'Track explicit negative facts alongside positive ones.',
    'Derive alternatives, then use evidence to eliminate a branch.',
    'Instantiate universal rules for an individual, then combine and eliminate.'
  ];

  function stop() {
    clearInterval(timer); timer = null;
    $('#proof-play').textContent = 'Play proof';
    $('#proof-play').setAttribute('aria-pressed', 'false');
  }

  function choose() {
    stop();
    const key = `${level}-${depth}`;
    const pool = bank.filter(e => e.level === level && e.depth === depth);
    let available = pool.filter(e => !(history.get(key) || []).includes(e.id));
    if (!available.length) {
      available = pool.filter(e => e.id !== current?.id);
      history.set(key, []);
    }
    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    current = available[current ? random[0] % available.length : 0];
    history.set(key, [...(history.get(key) || []), current.id]);
    step = 0; selected = null;
    host.dataset.example = current.id;
    host.dataset.depth = depth;
    host.querySelectorAll('[data-logic]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.logic === level)));
    host.querySelectorAll('[data-depth]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.depth === depth)));
    $('#proof-description').textContent = descriptions[level];
    $('#proof-goal').textContent = current.goal;
    $('#proof-meta').textContent = `D = ${depth} · ${current.statements.filter(s => s.kind === 'fact').length} facts · ${current.statements.filter(s => s.kind === 'rule').length} rules`;
    $('#proof-symbol-key').textContent = `${current.nodes[0].lines[0]} means “${current.nodes[0].text}”.`;
    $('#proof-progress').max = current.steps;
    renderStatements(); renderGraph(); update(false);
    $('#proof-canvas').scrollTop = 0;
    $('#proof-premises').scrollTop = 0;
  }

  function renderStatements() {
    $('#proof-premises').replaceChildren();
    for (const kind of ['fact', 'rule']) {
      const heading = document.createElement('h4');
      heading.textContent = kind === 'fact' ? 'Given facts' : 'Rules';
      $('#proof-premises').append(heading);
      const list = document.createElement('ul');
      current.statements.filter(s => s.kind === kind).forEach(s => {
        const item = document.createElement('li'); item.dataset.statement = s.id;
        const ref = document.createElement('span'); ref.className = 'statement-id'; ref.textContent = s.id;
        const content = document.createElement('span'); content.textContent = s.text;
        item.append(ref, content); list.append(item);
      });
      $('#proof-premises').append(list);
    }
  }

  function renderGraph() {
    const svg = $('#proof-graph'); svg.replaceChildren();
    svg.append(svgEl('title', {id:'proof-graph-title'}, 'A complete ScaleLogic derivation'));
    svg.append(svgEl('desc', {}, 'Arrows connect supporting facts to derived statements. Select a node to inspect its rule and dependencies.'));
    const defs = svgEl('defs');
    for (const [id, color] of [['proof-arrow','#c3d2d8'], ['proof-arrow-active','#267c8b']]) {
      const marker = svgEl('marker',{id,viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:5,markerHeight:5,orient:'auto-start-reverse'});
      marker.append(svgEl('path',{d:'M 0 0 L 10 5 L 0 10 z',fill:color})); defs.append(marker);
    }
    svg.append(defs);
    const positions = new Map();
    let y = 24;
    const maxRank = Math.max(...current.nodes.map(n => n.rank));
    for(let rank = 0; rank <= maxRank; rank++) {
      const row = current.nodes.filter(n => n.rank === rank);
      const barycenter = n => n.deps.reduce((sum,id)=>sum+(positions.get(id)?.x || 280),0) / (n.deps.length || 1);
      row.sort((a,b)=>barycenter(a)-barycenter(b));
      for(let offset = 0; offset < row.length; offset += 3) {
        const group = row.slice(offset,offset+3);
        group.forEach((node,i)=>positions.set(node.id,{x:280+(i-(group.length-1)/2)*178,y}));
        y += 94;
      }
      y += 8;
    }
    svg.setAttribute('viewBox', `0 0 560 ${y-8}`);
    svg.dataset.height = y-8;
    const edges = svgEl('g',{'aria-hidden':'true'});
    current.nodes.forEach(n=>n.deps.forEach(id=>{
      const a = positions.get(id), b = positions.get(n.id);
      const startY = a.y+68, endY = b.y-3, bend = (startY+endY)/2;
      // Long dependencies travel in the outer gutters so they never run
      // through an unrelated node in an intermediate row.
      let route = `M${a.x},${startY} C${a.x},${bend} ${b.x},${bend} ${b.x},${endY}`;
      if (b.y-a.y > 110) {
        const lane = a.x <= 280 ? 10 : 550;
        route = `M${a.x},${startY} C${a.x},${startY+12} ${lane},${startY+4} ${lane},${startY+16} L${lane},${endY-18} C${lane},${endY-6} ${b.x},${endY-16} ${b.x},${endY}`;
      }
      edges.append(svgEl('path',{d:route,
        class:'proof-edge','data-from':id,'data-to':n.id,'marker-end':'url(#proof-arrow)'}));
    }));
    svg.append(edges);
    current.nodes.forEach(n=>{
      const p = positions.get(n.id);
      const g = svgEl('g',{class:'proof-node',transform:`translate(${p.x-80} ${p.y})`,
        role:'button',tabindex:0,'aria-label':`${n.step ? 'Step '+n.step : 'Given fact'}: ${n.text}. ${n.operation}.`,
        'aria-pressed':'false','data-node':n.id,'data-y':p.y});
      g.append(svgEl('rect',{width:160,height:68,rx:10,class:'node-box'}));
      g.append(svgEl('text',{x:12,y:17,class:'node-caption'},n.goal ? 'GOAL' : n.step ? `STEP ${n.step} · ${n.source}` : `${n.source} · GIVEN`));
      n.lines.forEach((line,i)=>g.append(svgEl('text',{x:80,y:n.lines.length===1?44:36+i*17,'text-anchor':'middle',class:'node-formula'},line)));
      g.addEventListener('click',()=>{stop(); step=n.step; selected=n.id; update(false)});
      g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();g.dispatchEvent(new MouseEvent('click'))}});
      svg.append(g);
    });
    applyFit();
  }

  function applyFit() {
    $('#proof-canvas').classList.toggle('is-fit', fit);
    $('#proof-fit').textContent = fit ? 'Actual size' : 'Fit graph';
    $('#proof-fit').setAttribute('aria-pressed', String(fit));
  }

  function update(follow = true) {
    const focus = current.nodes.find(n => n.id === selected) || current.nodes.find(n=>n.step === step && step>0);
    const support = new Set(focus?.deps || []);
    host.querySelectorAll('[data-node]').forEach(el=>{
      const node = current.nodes.find(n=>n.id===el.dataset.node);
      el.classList.toggle('is-known',node.step<=step);
      el.classList.toggle('is-selected',node===focus);
      el.classList.toggle('is-support',support.has(node.id));
      el.classList.toggle('is-goal',!!node.goal);
      el.setAttribute('aria-pressed',String(node===focus));
    });
    host.querySelectorAll('.proof-edge').forEach(el=>{
      const target = current.nodes.find(n=>n.id===el.dataset.to);
      el.classList.toggle('is-known',target.step<=step);
      const active = target===focus;
      el.classList.toggle('is-active',active);
      el.setAttribute('marker-end',`url(#proof-arrow${active?'-active':''})`);
    });
    // Highlight the source rule and all given facts supporting this step.
    const sources = new Set(focus ? [focus.source] : []);
    const ancestors = [...support], visited = new Set();
    while(ancestors.length) {
      const id = ancestors.pop(); if(visited.has(id)) continue; visited.add(id);
      const n = current.nodes.find(n=>n.id===id);
      if(!n.step) sources.add(n.source);
      ancestors.push(...n.deps);
    }
    host.querySelectorAll('[data-statement]').forEach(el=>{
      el.classList.toggle('is-used',sources.has(el.dataset.statement));
      el.classList.toggle('is-current-rule',el.dataset.statement===focus?.source);
    });
    $('#proof-step-label').textContent = step ? `Step ${step} of ${current.steps}` : `Given facts · ${current.steps} steps to explore`;
    $('#proof-operation').textContent = focus?.operation || 'Start with what is given';
    $('#proof-explanation').textContent = focus?.explanation || 'Follow the arrows toward the goal. Play the proof, advance one step, or select any node to inspect its reasoning.';
    $('#proof-progress').value = step;
    $('#proof-progress').setAttribute('aria-valuetext',`Step ${step} of ${current.steps}`);
    $('#proof-back').disabled = step===0;
    $('#proof-next').disabled = step===current.steps;
    $('#proof-all').textContent = step===current.steps ? 'Reset' : 'Show all';
    if(follow && focus && !fit) {
      const el = $(`[data-node="${focus.id}"]`), canvas = $('#proof-canvas');
      const rect = el.getBoundingClientRect(), outer = canvas.getBoundingClientRect();
      if(rect.bottom>outer.bottom-28 || rect.top<outer.top+28) canvas.scrollTo({top:canvas.scrollTop+rect.top-outer.top-canvas.clientHeight/2+34,behavior:reduced.matches?'instant':'smooth'});
    }
    if(follow && focus) {
      const el = $(`[data-statement="${focus.source}"]`), panel = $('#proof-premises');
      const a = el.getBoundingClientRect(), b = panel.getBoundingClientRect();
      if(a.top<b.top || a.bottom>b.bottom) panel.scrollTo({top:panel.scrollTop+a.top-b.top-24,behavior:reduced.matches?'instant':'smooth'});
    }
  }

  host.querySelectorAll('[data-logic]').forEach(b=>b.addEventListener('click',()=>{level=+b.dataset.logic;choose()}));
  host.querySelectorAll('[data-depth]').forEach(b=>b.addEventListener('click',()=>{depth=+b.dataset.depth;choose()}));
  $('#proof-new').addEventListener('click',choose);
  $('#proof-fit').addEventListener('click',()=>{fit=!fit;applyFit()});
  $('#proof-next').addEventListener('click',()=>{stop();step=Math.min(current.steps,step+1);selected=null;update()});
  $('#proof-back').addEventListener('click',()=>{stop();step=Math.max(0,step-1);selected=null;update()});
  $('#proof-all').addEventListener('click',()=>{stop();step=step===current.steps?0:current.steps;selected=null;update();if(!step)$('#proof-canvas').scrollTo({top:0,behavior:'instant'})});
  $('#proof-progress').addEventListener('input',e=>{stop();step=+e.target.value;selected=null;update()});
  $('#proof-play').addEventListener('click',()=>{
    if(timer){stop();return}
    if(step===current.steps)step=0;
    selected=null;
    $('#proof-play').textContent='Pause';$('#proof-play').setAttribute('aria-pressed','true');
    const advance=()=>{step++;update();if(step===current.steps)stop()};
    timer=setInterval(advance,1900);advance();
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
  new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)stop()}).observe(host);
  host.classList.add('is-ready');
  choose();
})();
