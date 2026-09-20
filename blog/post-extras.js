/* Post extras, shared by every post in blog/ (styles live in post-extras.css):
   1. builds the "Contents" rail from the h2/h3 headings inside <main>: a dash per heading at the screen edge,
      which opens into a card listing them on hover or click
   2. shows the full reference in a popover when a citation (a.cite) is hovered, focused, or tapped */
(function(){
  'use strict';

  var SIDE     = 'left';   // which screen edge the contents rail sits on: 'left' or 'right'
  var HOVER_MS = 350;      // how long the pointer must rest on a citation before the popover opens
  var LEAVE_MS = 220;      // grace period to travel from the citation into the popover
  var ACTIVE_Y = 120;      // a heading becomes "current" once it passes this many px from the top

  /* ======================= contents rail ======================= */

  function slugify(s){
    return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g,'')
      .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60) || 'section';
  }

  /* Heading label without decorations (level tags), ids, or nested links. */
  function labelOf(h){
    var c = h.cloneNode(true);
    c.querySelectorAll('.lvl-tag, [data-toc-skip]').forEach(function(n){ n.remove(); });
    c.querySelectorAll('[id]').forEach(function(n){ n.removeAttribute('id'); });
    c.querySelectorAll('a').forEach(function(a){ a.replaceWith.apply(a, Array.from(a.childNodes)); });
    return c;
  }

  /* Where a heading's link should point: its own id, else the id of the <section> it opens, else a new slug. */
  function anchorFor(h, generated){
    if(h.id) return h.id;
    var sec = h.closest('section[id]');
    if(sec && sec.querySelector('h1,h2,h3,h4') === h) return sec.id;
    var base = slugify(labelOf(h).textContent), id = base, n = 2;
    while(document.getElementById(id)) id = base + '-' + (n++);
    h.id = id; generated.push(id);
    return id;
  }

  function buildToc(){
    var main = document.querySelector('main');
    if(!main) return;
    var heads = Array.from(main.querySelectorAll('h2, h3')).filter(function(h){
      return !h.closest('.toc, .viz-card, figure, details, [data-toc-skip]');
    });
    if(heads.length < 2) return;

    var generated = [];
    var aside = document.createElement('aside'); aside.className = 'side-toc'; aside.dataset.side = SIDE;
    var rail = document.createElement('button'); rail.type = 'button'; rail.className = 'side-toc-rail';
    rail.setAttribute('aria-label','Table of contents'); rail.setAttribute('aria-expanded','false'); rail.setAttribute('aria-controls','side-toc-panel');
    var panel = document.createElement('div'); panel.className = 'side-toc-panel'; panel.id = 'side-toc-panel';
    var card = document.createElement('div'); card.className = 'side-toc-card';
    card.setAttribute('role','navigation'); card.setAttribute('aria-label','Contents');
    var title = document.createElement('div'); title.className = 'side-toc-title'; title.textContent = 'Contents';
    var list = document.createElement('ol');
    card.appendChild(title); card.appendChild(list); panel.appendChild(card);
    aside.appendChild(rail); aside.appendChild(panel);

    var entries = heads.map(function(h){
      var lv = h.tagName === 'H2' ? 'lv2' : 'lv3';
      var dash = document.createElement('i'); dash.className = lv; rail.appendChild(dash);
      var li = document.createElement('li'); li.className = lv;
      var a = document.createElement('a'); a.href = '#' + anchorFor(h, generated);
      a.append.apply(a, Array.from(labelOf(h).childNodes));
      li.appendChild(a); list.appendChild(li);
      return { h:h, a:a, dash:dash };
    });
    document.body.appendChild(aside);

    /* A heading id minted above did not exist when the browser resolved the URL hash. */
    if(location.hash && generated.indexOf(decodeURIComponent(location.hash.slice(1))) !== -1){
      var t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if(t) t.scrollIntoView();
    }

    /* Tighten the spacing between dashes on long posts so the rail fits the window;
       if even the tightest spacing is too tall, show the section-level dashes only. */
    function fit(){
      var room = window.innerHeight - 170 - 24;   // sticky nav, breathing room, the rail's own padding
      var gapFor = function(n){ return n < 2 ? 12 : Math.floor((room - n * 1.5) / (n - 1)); };
      var gap = gapFor(entries.length), h2Only = gap < 3;
      if(h2Only) gap = gapFor(heads.filter(function(h){ return h.tagName === 'H2'; }).length);
      aside.classList.toggle('h2-only', h2Only);
      rail.style.setProperty('--toc-gap', Math.max(3, Math.min(12, gap)) + 'px');
    }

    var current = null;
    function sync(){
      var idx = -1;
      for(var i = 0; i < entries.length; i++){
        if(entries[i].h.getBoundingClientRect().top <= ACTIVE_Y) idx = i; else break;
      }
      if(window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) idx = entries.length - 1;
      var e = idx < 0 ? null : entries[idx];
      if(e === current) return;
      if(current){ current.a.classList.remove('active'); current.a.removeAttribute('aria-current'); current.dash.classList.remove('active'); }
      current = e;
      if(!e) return;
      e.a.classList.add('active'); e.a.setAttribute('aria-current','location'); e.dash.classList.add('active');
    }

    /* Hovering opens the card for as long as the pointer stays on the widget; clicking the rail pins it open
       (that is also the touch and keyboard path) until a second click, an outside click, Escape, or a jump. */
    var isOpen = false, pinned = false, openT = 0, closeT = 0;
    function open(){
      clearTimeout(closeT);
      if(isOpen) return;
      isOpen = true; aside.classList.add('open'); rail.setAttribute('aria-expanded','true');
      if(current) card.scrollTop = current.a.offsetTop - card.clientHeight / 2 + current.a.offsetHeight / 2;
    }
    function close(){
      clearTimeout(openT); clearTimeout(closeT);
      isOpen = false; pinned = false; aside.classList.remove('open'); rail.setAttribute('aria-expanded','false');
    }
    aside.addEventListener('mouseenter', function(){ clearTimeout(closeT); openT = setTimeout(open, 80); });
    aside.addEventListener('mouseleave', function(){ clearTimeout(openT); if(!pinned) closeT = setTimeout(close, 250); });
    rail.addEventListener('click', function(){ if(isOpen && pinned) close(); else { pinned = true; open(); } });
    list.addEventListener('click', function(e){ if(e.target.closest('a')) close(); });
    aside.addEventListener('focusout', function(e){ if(e.relatedTarget && !aside.contains(e.relatedTarget)) close(); });
    document.addEventListener('pointerdown', function(e){ if(isOpen && !aside.contains(e.target)) close(); });
    document.addEventListener('keydown', function(e){
      if(e.key !== 'Escape' || !isOpen) return;
      if(aside.contains(document.activeElement)) rail.focus();
      close();
    });

    var ticking = false;
    function onScroll(){ if(ticking) return; ticking = true; requestAnimationFrame(function(){ ticking = false; sync(); }); }
    window.addEventListener('scroll', onScroll, { passive:true });
    window.addEventListener('resize', function(){ fit(); onScroll(); });
    window.addEventListener('load', sync);   // late-loading figures and KaTeX move the headings
    fit(); sync();
  }

  /* ======================= citation popovers ======================= */

  /* Keys under which a URL can be matched: the URL without its fragment, plus arXiv id / DOI when present,
     so that arxiv.org/html/2512.02556v1#S2 still finds the entry listed as arxiv.org/abs/2512.02556. */
  function urlKeys(href){
    var keys = [], u;
    try{ u = new URL(href, location.href); }catch(_){ return keys; }
    keys.push((u.host.replace(/^www\./,'') + u.pathname.replace(/\/+$/,'') + u.search).toLowerCase());
    var ax = /arxiv\.org$/i.test(u.host) && u.pathname.match(/(\d{4}\.\d{4,5})/);
    if(ax) keys.push('arxiv:' + ax[1]);
    var doi = /doi\.org$/i.test(u.host) && u.pathname.match(/^\/(10\..+)$/);
    if(doi) keys.push('doi:' + decodeURIComponent(doi[1]).toLowerCase());
    return keys;
  }

  function initCites(){
    var listEl = document.querySelector('.ref-list');
    if(!listEl || !document.querySelector('a.cite')) return;
    var items = Array.from(listEl.children).filter(function(el){ return el.tagName === 'LI'; });
    var byUrl = new Map();
    items.forEach(function(li, i){
      if(!li.id && !document.getElementById('ref-' + (i+1))) li.id = 'ref-' + (i+1);
      li.querySelectorAll('a[href]').forEach(function(a){
        urlKeys(a.href).forEach(function(k){ if(!byUrl.has(k)) byUrl.set(k, li); });
      });
    });

    function refFor(cite){
      var href = cite.getAttribute('href') || '';
      if(href.charAt(0) === '#'){
        var li = document.getElementById(decodeURIComponent(href.slice(1)));
        return li && items.indexOf(li) !== -1 ? li : null;
      }
      var keys = urlKeys(href);
      for(var i = 0; i < keys.length; i++) if(byUrl.has(keys[i])) return byUrl.get(keys[i]);
      return null;
    }

    var pop = document.createElement('div');
    pop.className = 'cite-pop'; pop.id = 'cite-pop'; pop.setAttribute('role','tooltip'); pop.hidden = true;
    document.body.appendChild(pop);

    var owner = null, showT = 0, hideT = 0;

    function fill(li){
      pop.textContent = '';
      var body = document.createElement('div');
      var n = document.createElement('span'); n.className = 'cite-pop-n'; n.textContent = '[' + (items.indexOf(li) + 1) + ']';
      body.appendChild(n);
      var c = li.cloneNode(true);
      c.querySelectorAll('[id]').forEach(function(x){ x.removeAttribute('id'); });
      c.querySelectorAll('a[href]').forEach(function(x){ x.target = '_blank'; x.rel = 'noopener'; });
      body.append.apply(body, Array.from(c.childNodes));
      pop.appendChild(body);
      if(li.id){
        var foot = document.createElement('div'); foot.className = 'cite-pop-foot';
        var j = document.createElement('a'); j.href = '#' + li.id; j.textContent = 'Show in references ↓';
        j.addEventListener('click', function(){
          hide(true);
          li.classList.add('ref-flash');
          setTimeout(function(){ li.classList.remove('ref-flash'); }, 1200);
        });
        foot.appendChild(j); pop.appendChild(foot);
      }
    }

    /* Above the citation when there is room, otherwise below; clamped to the viewport horizontally.
       A citation that wraps across lines has several boxes, so anchor to the one under the pointer. */
    function place(cite, x, y){
      var rects = Array.from(cite.getClientRects()), r = rects[0] || cite.getBoundingClientRect();
      if(x != null) rects.forEach(function(q){ if(x >= q.left - 1 && x <= q.right + 1 && y >= q.top - 1 && y <= q.bottom + 1) r = q; });
      var pw = pop.offsetWidth, ph = pop.offsetHeight, gap = 8, m = 12;
      var vw = document.documentElement.clientWidth;
      var col = (document.querySelector('main') || document.body).getBoundingClientRect();   // stay inside the article column
      var lo = Math.max(m, col.left), hi = Math.min(vw - m, col.right) - pw;
      var left = Math.max(lo, Math.min(r.left + r.width/2 - pw/2, hi));
      var above = r.top - ph - gap >= 56;   // leave the sticky nav uncovered
      pop.dataset.side = above ? 'above' : 'below';
      pop.style.left = (left + window.scrollX) + 'px';
      pop.style.top = ((above ? r.top - ph - gap : r.bottom + gap) + window.scrollY) + 'px';
    }

    function show(cite, x, y){
      var li = refFor(cite);
      if(!li) return;
      clearTimeout(hideT);
      if(owner && owner !== cite) owner.removeAttribute('aria-describedby');
      owner = cite; cite.setAttribute('aria-describedby', pop.id);
      fill(li);
      pop.hidden = false; pop.classList.remove('on');
      place(cite, x, y);
      requestAnimationFrame(function(){ pop.classList.add('on'); });
    }

    function hide(now){
      clearTimeout(showT); clearTimeout(hideT);
      function run(){
        pop.classList.remove('on');
        if(owner){ owner.removeAttribute('aria-describedby'); owner = null; }
        setTimeout(function(){ if(!owner) pop.hidden = true; }, 160);
      }
      if(now) run(); else hideT = setTimeout(run, LEAVE_MS);
    }

    function citeOf(t){ return t && t.closest ? t.closest('a.cite') : null; }

    /* mouse: rest on a citation to open; the popover itself can be entered to reach its links */
    document.addEventListener('mouseover', function(e){
      var cite = citeOf(e.target);
      if(cite){
        clearTimeout(hideT);
        if(cite === owner) return;
        clearTimeout(showT);
        var x = e.clientX, y = e.clientY;
        showT = setTimeout(function(){ show(cite, x, y); }, HOVER_MS);
      } else if(pop.contains(e.target)) clearTimeout(hideT);
    });
    document.addEventListener('mouseout', function(e){
      var from = citeOf(e.target) || (pop.contains(e.target) ? pop : null);
      if(!from) return;
      var to = e.relatedTarget;
      if(to && (from.contains(to) || (from !== pop && pop.contains(to)) || (from === pop && citeOf(to) === owner))) return;
      clearTimeout(showT);
      if(owner) hide(false);
    });

    /* keyboard */
    document.addEventListener('focusin', function(e){
      var cite = citeOf(e.target);
      if(cite && cite.matches(':focus-visible')) show(cite);
    });
    document.addEventListener('focusout', function(e){
      if(citeOf(e.target) && !pop.contains(e.relatedTarget)) hide(false);
    });
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && owner) hide(true); });

    /* touch: the first tap opens the popover, a second tap on the same citation follows its link */
    var lastPointer = 'mouse';
    document.addEventListener('pointerdown', function(e){
      lastPointer = e.pointerType || 'mouse';
      if(owner && !pop.contains(e.target) && citeOf(e.target) !== owner) hide(true);
    }, true);
    document.addEventListener('click', function(e){
      var cite = citeOf(e.target);
      if(!cite || lastPointer === 'mouse' || cite === owner || !refFor(cite)) return;
      e.preventDefault();
      show(cite, e.clientX, e.clientY);
    });

    window.addEventListener('resize', function(){ if(owner) hide(true); });
  }

  function boot(){ buildToc(); initCites(); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
