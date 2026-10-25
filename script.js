(() => {

  // Subtle cursor-following white glow on pointer devices.
  const aura = document.createElement('div');
  aura.id = 'pointer-aura';
  aura.setAttribute('aria-hidden', 'true');
  document.body.appendChild(aura);
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let frame = 0;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    window.addEventListener('pointermove', event => {
      targetX = event.clientX;
      targetY = event.clientY;
      document.body.classList.add('pointer-aura-active');
      if (frame) return;
      const animate = () => {
        currentX += (targetX - currentX) * 0.18;
        currentY += (targetY - currentY) * 0.18;
        aura.style.setProperty('--aura-x', `${currentX}px`);
        aura.style.setProperty('--aura-y', `${currentY}px`);
        if (Math.abs(targetX-currentX) > 0.5 || Math.abs(targetY-currentY) > 0.5) {
          frame = window.requestAnimationFrame(animate);
        } else {
          frame = 0;
        }
      };
      frame = window.requestAnimationFrame(animate);
    }, { passive: true });
    window.addEventListener('pointerleave', () => document.body.classList.remove('pointer-aura-active'));
  }

  const body = document.body;
  const intro = document.getElementById('intro');
  const skip = document.getElementById('skip-intro');
  let finished = false;
  function finishIntro() {
    if (finished) return;
    finished = true;
    intro.classList.add('is-done');
    body.classList.add('ready');
    body.classList.remove('intro-loading');
  }
  function lightOn() {
    intro.classList.add('is-on');
    window.setTimeout(finishIntro, 2100);
  }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    intro.classList.add('is-on');
    window.setTimeout(finishIntro, 350);
  } else {
    window.setTimeout(lightOn, 750);
  }
  skip.addEventListener('click', finishIntro);

  // Make Workbench navigation go directly to the live interactive simulation board, even while the intro/reveal animation is active.
  document.querySelectorAll('a[href="#circuit-lab"]').forEach(link => {
    link.addEventListener('click', event => {
      const target = document.getElementById('circuit-lab');
      if (!target) return;
      event.preventDefault();
      finishIntro();
      target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      if (history.replaceState) history.replaceState(null, '', '#circuit-lab');
    });
  });

  const form = document.getElementById('ask-form');
  const input = document.getElementById('ask-input');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const question = input.value.trim();
    if (!question) {
      input.focus();
      input.placeholder = 'Type a question to get started…';
      return;
    }
    document.body.classList.add('leaving-for-chat');
    let transition = document.getElementById('chat-transition');
    if (!transition) {
      transition = document.createElement('div');
      transition.id = 'chat-transition';
      transition.innerHTML = '<div class="transition-orb">ϟ</div><p>Bringing your idea to the workbench…</p>';
      document.body.appendChild(transition);
    }
    requestAnimationFrame(() => transition.classList.add('is-visible'));
    window.setTimeout(() => {
      window.location.href = 'chat.html?prompt=' + encodeURIComponent(question);
    }, 480);
  });
  document.querySelectorAll('[data-question]').forEach(button => {
    button.addEventListener('click', () => {
      input.value = button.dataset.question;
      input.focus();
    });
  });
  document.querySelectorAll('.feature').forEach(card => {
    card.addEventListener('mousemove', e => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5;
      const y = (e.clientY - r.top) / r.height - .5;
      card.style.transform = `perspective(700px) rotateY(${x * 2}deg) rotateX(${-y * 2}deg) translateY(-2px)`;
    });
    card.addEventListener('mouseleave', () => card.style.transform = '');
  });
})();

/* Lightweight, educational circuit editor */
(() => {
  const board = document.getElementById('circuit-board');
  if (!board) return;
  const svg = document.getElementById('wire-layer');
  const parts = new Map();
  const wires = [];
  let nextId = 1, selectedPart = null, selectedWire = null, pendingTerminal = null;
  const defaultPositions = {battery:[7,14], resistor:[34,17], led:[61,14], ground:[78,55], switch:[36,57]};
  const definitions = {
    battery:{title:'Battery', graphic:'▣', value:'5 V DC', terminals:['+','−'], voltage:5},
    resistor:{title:'Resistor', graphic:'〰', value:'220 Ω', terminals:['A','B'], resistance:220},
    led:{title:'LED', graphic:'◉', value:'Red · 2 V nominal', terminals:['A','K'], drop:2},
    switch:{title:'Switch', graphic:'⏻', value:'Closed switch', terminals:['1','2'], closed:true},
    ground:{title:'Ground', graphic:'⏚', value:'0 V reference', terminals:['GND'], ground:true}
  };
  const status = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
  function addPart(type, pos) {
    const def=definitions[type]; if(!def) return;
    const id='p'+nextId++;
    const el=document.createElement('div'); el.className='circuit-part'; el.dataset.id=id;
    const terminals=def.terminals.map((t,i)=>`<button type="button" class="terminal" data-terminal="${i}" aria-label="${def.title} terminal ${t}" title="Terminal ${t}"></button>`).join('');
    el.innerHTML=`<div class="part-head"><span>${def.title}</span><span>⠿</span></div><div class="part-graphic">${def.graphic}</div><span class="part-value">${def.value}</span><div class="terminal-row">${terminals}</div>`;
    board.appendChild(el);
    const p=pos||defaultPositions[type]||[20+Math.random()*55,20+Math.random()*45];
    const item={id,type,el,x:p[0],y:p[1],def};
    parts.set(id,item); place(item); selectPart(id); bindPart(item); renderWires();
  }
  function place(item) {
    const maxX=Math.max(0,board.clientWidth-item.el.offsetWidth);
    const maxY=Math.max(0,board.clientHeight-item.el.offsetHeight);
    item.x=Math.max(0,Math.min(maxX,item.x)); item.y=Math.max(0,Math.min(maxY,item.y));
    item.el.style.left=item.x+'px'; item.el.style.top=item.y+'px';
  }
  function terminalPoint(id,index) {
    const item=parts.get(id); if(!item) return null;
    const term=item.el.querySelector(`[data-terminal="${index}"]`); if(!term) return null;
    const a=term.getBoundingClientRect(), b=board.getBoundingClientRect();
    return {x:a.left+a.width/2-b.left,y:a.top+a.height/2-b.top};
  }
  function bindPart(item) {
    item.el.addEventListener('click',e=>{ if(e.target.closest('.terminal')) return; selectPart(item.id); });
    item.el.querySelectorAll('.terminal').forEach(t=>t.addEventListener('click',e=>{
      e.stopPropagation(); selectPart(item.id);
      const terminal={part:item.id,index:Number(t.dataset.terminal)};
      if(!pendingTerminal){pendingTerminal=terminal;t.classList.add('pending');status('sim-status','Wire endpoint selected');return;}
      if(pendingTerminal.part===terminal.part && pendingTerminal.index===terminal.index){pendingTerminal=null;t.classList.remove('pending');return;}
      wires.push({id:'w'+nextId++,a:pendingTerminal,b:terminal});
      board.querySelectorAll('.terminal.pending').forEach(x=>x.classList.remove('pending'));
      pendingTerminal=null; renderWires(); status('sim-status','Wire connected'); status('sim-explanation','Connection added. Run simulation to check the circuit.');
    }));
    const head=item.el.querySelector('.part-head');
    head.addEventListener('pointerdown',e=>{
      if(e.button!==0)return;
      e.preventDefault(); selectPart(item.id);
      const startX=e.clientX,startY=e.clientY,ox=item.x,oy=item.y;
      head.setPointerCapture(e.pointerId);
      const move=ev=>{item.x=ox+ev.clientX-startX;item.y=oy+ev.clientY-startY;place(item);renderWires();};
      const up=()=>{head.removeEventListener('pointermove',move);head.removeEventListener('pointerup',up);};
      head.addEventListener('pointermove',move);head.addEventListener('pointerup',up);
    });
  }
  function selectPart(id){selectedPart=id;selectedWire=null;parts.forEach(p=>p.el.classList.toggle('selected',p.id===id));renderWires();}
  function renderWires(){
    svg.setAttribute('viewBox',`0 0 ${board.clientWidth} ${board.clientHeight}`);svg.innerHTML='';
    wires.forEach(w=>{
      const a=terminalPoint(w.a.part,w.a.index),b=terminalPoint(w.b.part,w.b.index);if(!a||!b)return;
      const mid=(a.x+b.x)/2;
      const path=document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d',`M ${a.x} ${a.y} C ${mid} ${a.y}, ${mid} ${b.y}, ${b.x} ${b.y}`);
      path.setAttribute('class','wire-line'+(selectedWire===w.id?' selected':''));
      path.style.pointerEvents='stroke';path.style.cursor='pointer';path.style.pointerEvents='stroke';
      path.addEventListener('click',()=>{selectedWire=w.id;selectedPart=null;parts.forEach(p=>p.el.classList.remove('selected'));renderWires();status('sim-status','Wire selected');});
      svg.appendChild(path);
    });
  }
  function deleteSelected(){
    if(selectedWire){const i=wires.findIndex(w=>w.id===selectedWire);if(i>=0)wires.splice(i,1);selectedWire=null;}
    else if(selectedPart){parts.get(selectedPart)?.el.remove();parts.delete(selectedPart);wires.splice(0,wires.length,...wires.filter(w=>w.a.part!==selectedPart&&w.b.part!==selectedPart));selectedPart=null;}
    renderWires();status('sim-status','Item deleted');status('sim-current','— mA');status('sim-power','— mW');
  }
  function simulate(){
    const batteries=[...parts.values()].filter(p=>p.type==='battery');
    const leds=[...parts.values()].filter(p=>p.type==='led');
    const resistors=[...parts.values()].filter(p=>p.type==='resistor');
    const switches=[...parts.values()].filter(p=>p.type==='switch');
    const connections=new Map();
    wires.forEach(w=>{
      const a=`${w.a.part}:${w.a.index}`,b=`${w.b.part}:${w.b.index}`;
      if(!connections.has(a))connections.set(a,[]);if(!connections.has(b))connections.set(b,[]);
      connections.get(a).push(b);connections.get(b).push(a);
    });
    function connected(a,b){
      const seen=new Set([a]),q=[a];
      while(q.length){const n=q.shift();if(n===b)return true;(connections.get(n)||[]).forEach(v=>{if(!seen.has(v)){seen.add(v);q.push(v);}});}
      return false;
    }
    const battery=batteries[0],led=leds[0],res=resistors[0];
    const fail=msg=>{status('sim-status','No current');status('sim-voltage',battery?battery.def.voltage+' V':'— V');status('sim-current','0 mA');status('sim-power','0 mW');status('sim-explanation',msg);leds.forEach(p=>p.el.classList.remove('part-led','on'));};
    if(!battery||!led||!res){fail('Add a battery, a resistor, and an LED to test a basic series circuit.');return;}
    if(switches.some(s=>!s.def.closed)){fail('The switch is open, so the circuit is interrupted.');return;}
    const plus=`${battery.id}:0`,minus=`${battery.id}:1`,ra=`${res.id}:0`,rb=`${res.id}:1`,la=`${led.id}:0`,lk=`${led.id}:1`;
    const forward=connected(plus,ra)&&connected(rb,la)&&connected(lk,minus);
    const reverse=connected(plus,rb)&&connected(ra,lk)&&connected(la,minus);
    if(!forward&&!reverse){fail('No complete series path found. Connect battery + → resistor → LED anode (A) → LED cathode (K) → battery −.');return;}
    if(reverse){fail('The LED is reverse-biased in this simple model. Swap its A and K connections.');return;}
    const v=battery.def.voltage, drop=led.def.drop, r=res.def.resistance;
    if(v<=drop){fail('Supply voltage is too low to exceed the LED’s nominal forward drop.');return;}
    const current=(v-drop)/r, power=current*current*r;
    status('sim-status','Circuit conducting');status('sim-voltage',v.toFixed(2)+' V');status('sim-current',(current*1000).toFixed(2)+' mA');status('sim-power',(power*1000).toFixed(2)+' mW');
    led.el.classList.add('part-led','on');
    status('sim-explanation',`Estimated series current = (Vs − VLED) / R = (${v} − ${drop}) / ${r} ≈ ${(current*1000).toFixed(2)} mA. Idealized model; wire resistance, temperature, LED curve, and source limits are omitted.`);
  }
  document.querySelectorAll('[data-add-part]').forEach(b=>b.addEventListener('click',()=>addPart(b.dataset.addPart)));
  document.getElementById('delete-selected').addEventListener('click',deleteSelected);
  document.getElementById('clear-lab').addEventListener('click',()=>{parts.forEach(p=>p.el.remove());parts.clear();wires.length=0;selectedPart=selectedWire=pendingTerminal=null;renderWires();status('sim-status','Board cleared');status('sim-voltage','— V');status('sim-current','— mA');status('sim-power','— mW');});
  document.getElementById('simulate-lab').addEventListener('click',simulate);
  document.getElementById('wire-mode').addEventListener('click',()=>{pendingTerminal=null;board.querySelectorAll('.terminal.pending').forEach(x=>x.classList.remove('pending'));status('sim-status','Ready to wire');status('sim-explanation','Click one terminal dot, then a second terminal dot to add a wire.');});
  window.addEventListener('resize',()=>{parts.forEach(place);renderWires();});
  addPart('battery',[.06*board.clientWidth,.14*board.clientHeight]);
  addPart('resistor',[.31*board.clientWidth,.14*board.clientHeight]);
  addPart('led',[.56*board.clientWidth,.14*board.clientHeight]);
})();
