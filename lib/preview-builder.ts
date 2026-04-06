import { PREMIUM_FONTS_CDN, GSAP_CDN, LENIS_CDN, FA_CDN, SHADCN_BASE_CSS } from './cdn-models';

interface PreviewBuildOpts {
  rawHtml: string;
  isEditMode: boolean;
  layoutDebugActive: boolean;
  previewDarkMode: string;
  gridFlexDebugActive: boolean;
}

/** Build the final preview HTML with injected CDNs, error capture, and optional visual editor. */
export function buildPreviewHtml(opts: PreviewBuildOpts): string {
  const { rawHtml, isEditMode, layoutDebugActive, previewDarkMode, gridFlexDebugActive } = opts;

  // Replace unresolved AI-generated placeholders with fallbacks
  let html = rawHtml
    .replace(/__GEMINI_IMAGE_([a-zA-Z0-9_-]+)__/g, (_m: string, id: string) =>
      `https://placehold.co/800x600/1a1a2e/eaeaea?text=${encodeURIComponent(id)}`)
    .replace(/__LTX_VIDEO_URL__/g, '');

  // Strip Tailwind CDN script — causes CORS errors in srcdoc iframes
  html = html.replace(/<script[^>]*src=["']https?:\/\/cdn\.tailwindcss\.com[^"']*["'][^>]*><\/script>/gi, '<!-- tailwind cdn removed -->')
    .replace(/<script[^>]*src=["']https?:\/\/cdn\.tailwindcss\.com[^"']*["'][^>]*\/>/gi, '<!-- tailwind cdn removed -->');

  // Auto-inject premium fonts if not present
  if (!html.includes('fonts.googleapis.com') && !html.includes('fonts.gstatic.com')) {
    const headEnd = html.indexOf('</head>');
    if (headEnd !== -1) html = html.slice(0, headEnd) + '\n' + PREMIUM_FONTS_CDN + '\n' + html.slice(headEnd);
  }

  // Auto-inject design system CSS only if HTML lacks its own design system
  const hasOwnCSS = /<style[^>]*>[\s\S]{300,}<\/style>/i.test(html) && (/:root\s*\{/.test(html) || /--\w+\s*:/.test(html));
  if (!html.includes('aurion-design-system') && !hasOwnCSS) {
    const headEnd = html.indexOf('</head>');
    if (headEnd !== -1) html = html.slice(0, headEnd) + '\n' + SHADCN_BASE_CSS + '\n' + html.slice(headEnd);
  }

  // Auto-inject GSAP if code references it
  if (/\bgsap\b|ScrollTrigger/i.test(html) && !html.includes('gsap.min.js')) {
    const headEnd = html.indexOf('</head>');
    if (headEnd !== -1) html = html.slice(0, headEnd) + '\n' + GSAP_CDN + '\n' + html.slice(headEnd);
  }

  // Auto-inject Lenis if code references it
  if (/\bLenis\b/i.test(html) && !html.includes('lenis.min.js')) {
    const headEnd = html.indexOf('</head>');
    if (headEnd !== -1) html = html.slice(0, headEnd) + '\n' + LENIS_CDN + '\n' + html.slice(headEnd);
  }

  // Auto-inject Font Awesome if code uses fa- classes
  if (/\bfa-|fas |far |fab /.test(html) && !html.includes('font-awesome')) {
    const headEnd = html.indexOf('</head>');
    if (headEnd !== -1) html = html.slice(0, headEnd) + '\n' + FA_CDN + '\n' + html.slice(headEnd);
  }

  // Error capture + console forwarding script
  const errorCaptureScript = `<script>(function(){var sent={};var overlay=null;function showOverlay(msg){if(overlay)overlay.remove();overlay=document.createElement('div');overlay.id='__err_overlay';overlay.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:999999;background:rgba(24,24,27,0.97);border-top:2px solid #ef4444;padding:16px 20px;font-family:ui-monospace,monospace;font-size:13px;color:#fca5a5;max-height:40vh;overflow:auto;backdrop-filter:blur(8px)';var h=document.createElement('div');h.style.cssText='display:flex;align-items:center;justify-content:space-between;margin-bottom:8px';var t=document.createElement('span');t.style.cssText='color:#ef4444;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.5px';t.textContent='Runtime Error';var btn=document.createElement('button');btn.textContent='\\u2715';btn.style.cssText='background:none;border:none;color:#666;font-size:16px;cursor:pointer;padding:0 4px';btn.onclick=function(){overlay.remove();overlay=null};h.appendChild(t);h.appendChild(btn);overlay.appendChild(h);var m=document.createElement('pre');m.style.cssText='margin:0;white-space:pre-wrap;word-break:break-all;line-height:1.5;color:#fecaca;font-size:12px';m.textContent=msg;overlay.appendChild(m);document.body.appendChild(overlay)}function fwd(msg,src,ln,col){var k=msg+(src||"")+(ln||"");if(sent[k])return;sent[k]=1;showOverlay(String(msg)+(ln?' (line '+ln+')':''));try{parent.postMessage({type:"aurion_error",error:{message:String(msg).slice(0,500),source:src||"",line:ln||0,col:col||0}},"*")}catch(e){}}window.onerror=function(m,s,l,c){fwd(m,s,l,c)};window.addEventListener("unhandledrejection",function(e){fwd("Unhandled Promise: "+(e.reason&&e.reason.message||e.reason||"unknown"))});var _ce=console.error;console.error=function(){var a=Array.prototype.slice.call(arguments).map(function(x){return typeof x==="object"?JSON.stringify(x):String(x)}).join(" ");fwd("console.error: "+a);_ce.apply(console,arguments)};var _cl=console.log;console.log=function(){var a=Array.prototype.slice.call(arguments).map(function(x){return typeof x==="object"?JSON.stringify(x,null,2):String(x)}).join(" ");try{parent.postMessage({type:"aurion_console",level:"log",text:a},"*")}catch(e){}_cl.apply(console,arguments)};var _cw=console.warn;console.warn=function(){var a=Array.prototype.slice.call(arguments).map(function(x){return typeof x==="object"?JSON.stringify(x):String(x)}).join(" ");try{parent.postMessage({type:"aurion_console",level:"warn",text:a},"*")}catch(e){}_cw.apply(console,arguments)};var _ci=console.info;console.info=function(){var a=Array.prototype.slice.call(arguments).map(function(x){return typeof x==="object"?JSON.stringify(x):String(x)}).join(" ");try{parent.postMessage({type:"aurion_console",level:"info",text:a},"*")}catch(e){}_ci.apply(console,arguments)}})();</script>`;

  const layoutDebugCss = layoutDebugActive ? `<style>*{outline:1px solid rgba(59,130,246,0.35)!important;}*:hover{outline:2px solid rgba(59,130,246,0.8)!important;}</style>` : '';
  const darkModeCss = previewDarkMode === 'dark' ? `<style>html{filter:invert(1) hue-rotate(180deg)!important;}img,video,canvas,svg{filter:invert(1) hue-rotate(180deg)!important;}</style>` : previewDarkMode === 'light' ? `<style>html{background:#fff!important;color:#000!important;}</style>` : '';
  const gridFlexCss = gridFlexDebugActive ? `<style>[style*="display:grid"],[style*="display: grid"]{outline:2px dashed #ec4899!important;position:relative!important;}[style*="display:grid"]::after,[style*="display: grid"]::after{content:"GRID";position:absolute;top:0;right:0;background:#ec4899;color:#fff;font-size:9px;padding:1px 4px;z-index:9999;}[style*="display:flex"],[style*="display: flex"]{outline:2px dashed #a855f7!important;position:relative!important;}[style*="display:flex"]::after,[style*="display: flex"]::after{content:"FLEX";position:absolute;top:0;right:0;background:#a855f7;color:#fff;font-size:9px;padding:1px 4px;z-index:9999;}</style>` : '';

  // When NOT in edit mode: simple link+form blocker
  if (!isEditMode) {
    const interceptScript = `<script>document.addEventListener('click',function(e){var a=e.target.closest('a');if(a){e.preventDefault();e.stopPropagation();}},true);document.addEventListener('submit',function(e){e.preventDefault();},true);</script>`;
    const combined = errorCaptureScript + interceptScript + layoutDebugCss + darkModeCss + gridFlexCss;
    if (html.includes('</body>')) {
      return html.replace('</body>', combined + '</body>');
    }
    return html + combined;
  }

  // ─── EDIT MODE: full visual editor ───
  const L: string[] = [];
  L.push('<script>');
  L.push('(function(){');
  L.push('document.addEventListener("submit",function(e){e.preventDefault();},true);');
  L.push('var TT="H1,H2,H3,H4,H5,H6,P,SPAN,A,LI,TD,TH,LABEL,BUTTON,FIGCAPTION,BLOCKQUOTE,CAPTION,SUMMARY,LEGEND,DT,DD,STRONG,EM,B,I,U,SMALL,SUB,SUP,MARK,DEL,INS,CITE,CODE,PRE,KBD,ABBR,TIME,ADDRESS".split(",");');
  L.push('var BT="DIV,SECTION,HEADER,FOOTER,NAV,MAIN,ARTICLE,ASIDE,FIGURE,UL,OL,TABLE,FORM,FIELDSET".split(",");');
  L.push('function hasText(el){for(var i=0;i<el.childNodes.length;i++){if(el.childNodes[i].nodeType===3&&el.childNodes[i].textContent.trim())return true;}return false;}');
  L.push('function isTextOk(el){if(!el||el===document.body||el===document.documentElement)return false;if(el.closest("#__ed_tb,#__ed_mv"))return false;var t=el.tagName;if(TT.indexOf(t)!==-1)return true;if(BT.indexOf(t)!==-1&&hasText(el))return true;return false;}');
  L.push('function findTextEl(n){while(n&&n!==document.body){if(isTextOk(n))return n;n=n.parentElement;}return null;}');
  L.push('var SKIP_DRAG="HTML,BODY,HEAD,SCRIPT,STYLE,LINK,META,TITLE,BR,HR,WBR,NOSCRIPT".split(",");');
  L.push('function isDragOk(el){if(!el||el===document.body||el===document.documentElement)return false;if(el.closest("#__ed_tb,#__ed_mv"))return false;if(SKIP_DRAG.indexOf(el.tagName)!==-1)return false;var r=el.getBoundingClientRect();if(r.width<10||r.height<10)return false;return true;}');
  L.push('function findDragEl(n){var best=null;while(n&&n!==document.body){if(isDragOk(n))best=n;n=n.parentElement;}return best;}');
  L.push('function findDeepDrag(n){while(n&&n!==document.body){if(isDragOk(n))return n;n=n.parentElement;}return null;}');
  L.push('var sel=null,hov=null,mvTarget=null;');
  L.push('var tb=document.createElement("div");tb.id="__ed_tb";');
  L.push('tb.style.cssText="position:fixed;top:-999px;left:0;z-index:2147483647;display:flex;align-items:center;gap:4px;padding:5px 10px;background:#111;border:1px solid #333;border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,.7);font-family:system-ui,sans-serif;font-size:12px;color:#fff;pointer-events:auto;";');
  L.push('function mkBtn(label,cmd,extra){var b=document.createElement("button");b.textContent=label;b.dataset.cmd=cmd;b.style.cssText="all:unset;cursor:pointer;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:6px;font-size:14px;"+(extra||"");b.onmouseenter=function(){b.style.background="#333";};b.onmouseleave=function(){b.style.background="transparent";};return b;}');
  L.push('function mkSep(){var s=document.createElement("span");s.style.cssText="width:1px;height:20px;background:#333;margin:0 2px;";return s;}');
  L.push('tb.appendChild(mkBtn("B","bold","font-weight:bold;"));');
  L.push('tb.appendChild(mkBtn("I","italic","font-style:italic;"));');
  L.push('tb.appendChild(mkBtn("U","underline","text-decoration:underline;"));');
  L.push('tb.appendChild(mkBtn("S","strikeThrough","text-decoration:line-through;"));');
  L.push('tb.appendChild(mkSep());');
  L.push('function mkColor(title,role,visual){var lbl=document.createElement("label");lbl.title=title;lbl.style.cssText="cursor:pointer;display:flex;align-items:center;position:relative;width:28px;height:28px;justify-content:center;border-radius:6px;";lbl.onmouseenter=function(){lbl.style.background="#333";};lbl.onmouseleave=function(){lbl.style.background="transparent";};var vis=document.createElement("span");vis.style.cssText=visual;lbl.appendChild(vis);var inp=document.createElement("input");inp.type="color";inp.dataset.role=role;inp.style.cssText="position:absolute;opacity:0;width:100%;height:100%;cursor:pointer;";lbl.appendChild(inp);return lbl;}');
  L.push('tb.appendChild(mkColor("Text color","fg","font-size:14px;font-weight:bold;border-bottom:3px solid #3b82f6;display:block;line-height:1;"));');
  L.push('tb.appendChild(mkColor("Highlight","bg","width:16px;height:16px;background:linear-gradient(135deg,#ff6b6b,#ffd93d,#6bcb77,#4d96ff);border-radius:4px;display:block;"));');
  L.push('tb.appendChild(mkSep());');
  L.push('var szSel=document.createElement("select");szSel.style.cssText="all:unset;cursor:pointer;padding:2px 6px;border-radius:6px;font-size:11px;background:#222;color:#fff;height:28px;";');
  L.push('["Size:","XS:1","S:2","M:3","L:4","XL:5","2XL:6","3XL:7"].forEach(function(s){var p=s.split(":");var o=document.createElement("option");o.textContent=p[0];o.value=p[1]||"";szSel.appendChild(o);});');
  L.push('tb.appendChild(szSel);tb.appendChild(mkSep());');
  L.push('tb.appendChild(mkBtn("\\u2261","justifyLeft","font-size:16px;"));');
  L.push('tb.appendChild(mkBtn("\\u2263","justifyCenter","font-size:16px;"));');
  L.push('tb.appendChild(mkSep());');
  L.push('tb.appendChild(mkBtn("\\u2715","removeFormat","font-size:13px;color:#ef4444;"));');
  L.push('document.body.appendChild(tb);');
  L.push('var mv=document.createElement("div");mv.id="__ed_mv";');
  L.push('mv.style.cssText="position:fixed;top:-999px;left:0;z-index:2147483646;display:flex;flex-direction:column;gap:2px;pointer-events:auto;";');
  L.push('function mkMvBtn(label,title,fn){var b=document.createElement("button");b.innerHTML=label;b.title=title;b.style.cssText="all:unset;cursor:pointer;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:5px;background:rgba(17,17,17,.9);border:1px solid #333;color:#fff;font-size:11px;backdrop-filter:blur(8px);";b.onmouseenter=function(){b.style.background="#333";};b.onmouseleave=function(){b.style.background="rgba(17,17,17,.9)";};b.onclick=function(e){e.preventDefault();e.stopPropagation();fn();};return b;}');
  L.push('var mvUp=mkMvBtn("\\u25B2","Move up",function(){if(!mvTarget||!mvTarget.previousElementSibling)return;mvTarget.previousElementSibling.insertAdjacentElement("beforebegin",mvTarget);posMv(mvTarget);notifySync();});');
  L.push('var mvDown=mkMvBtn("\\u25BC","Move down",function(){if(!mvTarget||!mvTarget.nextElementSibling)return;mvTarget.nextElementSibling.insertAdjacentElement("afterend",mvTarget);posMv(mvTarget);notifySync();});');
  L.push('var mvDup=mkMvBtn("\\u2750","Duplicate",function(){if(!mvTarget)return;var cl=mvTarget.cloneNode(true);mvTarget.insertAdjacentElement("afterend",cl);notifySync();});');
  L.push('var mvDel=mkMvBtn("\\u2716","Delete",function(){if(!mvTarget)return;mvTarget.remove();mvTarget=null;mv.style.top="-999px";notifySync();});');
  L.push('mvDel.style.color="#ef4444";');
  L.push('var mvAI=mkMvBtn("\\u2728","AI: modify this element",function(){if(!mvTarget)return;var r=mvTarget.getBoundingClientRect();function cssPath(el){if(!el||el===document.body)return"body";var p=el.parentElement;if(!p)return el.tagName.toLowerCase();var sibs=Array.from(p.children).filter(function(c){return c.tagName===el.tagName;});var idx=sibs.indexOf(el);var s=el.tagName.toLowerCase();if(el.id)s+="#"+el.id;else if(sibs.length>1)s+=":nth-of-type("+(idx+1)+")";return cssPath(p)+" > "+s;}var c=document.documentElement.cloneNode(false);var path=cssPath(mvTarget);parent.postMessage({type:"aurion_select_prompt",element:{outerHtml:mvTarget.outerHTML.slice(0,8000),cssPath:path,tagName:mvTarget.tagName,rect:{top:r.top,left:r.left,width:r.width,height:r.height}}},"*");});');
  L.push('mvAI.style.color="#a78bfa";mvAI.style.background="rgba(167,139,250,.15)";mvAI.style.border="1px solid rgba(167,139,250,.3)";');
  L.push('var mvDrag=document.createElement("div");mvDrag.title="Drag to move";mvDrag.innerHTML="\\u2630";mvDrag.style.cssText="cursor:grab;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:5px;background:rgba(17,17,17,.9);border:1px solid #333;color:#888;font-size:12px;user-select:none;";');
  L.push('mv.appendChild(mvUp);mv.appendChild(mvDrag);mv.appendChild(mvDown);');
  L.push('var mvSep=document.createElement("div");mvSep.style.cssText="height:1px;background:#333;margin:1px 0;";mv.appendChild(mvSep);');
  L.push('mv.appendChild(mvDup);mv.appendChild(mvDel);mv.appendChild(mvAI);');
  L.push('document.body.appendChild(mv);');
  L.push('var dragEl=null,dragGhost=null,dragPlaceholder=null;');
  L.push('mvDrag.addEventListener("mousedown",function(e){if(!mvTarget)return;e.preventDefault();dragEl=mvTarget;');
  L.push('dragGhost=dragEl.cloneNode(true);var w=Math.min(dragEl.offsetWidth,400);dragGhost.style.cssText="position:fixed;pointer-events:none;opacity:0.5;z-index:2147483645;width:"+w+"px;max-height:200px;overflow:hidden;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,.5);transform:scale(0.92);";');
  L.push('document.body.appendChild(dragGhost);');
  L.push('dragPlaceholder=document.createElement("div");dragPlaceholder.style.cssText="height:4px;background:#3b82f6;border-radius:2px;margin:4px 0;transition:all .15s;pointer-events:none;";');
  L.push('dragEl.style.opacity="0.25";dragEl.style.outline="2px dashed #3b82f6";');
  L.push('moveDragGhost(e);document.addEventListener("mousemove",onDragMove);document.addEventListener("mouseup",onDragEnd);});');
  L.push('function moveDragGhost(e){if(dragGhost){dragGhost.style.top=(e.clientY+10)+"px";dragGhost.style.left=(e.clientX+10)+"px";}}');
  L.push('function onDragMove(e){moveDragGhost(e);if(!dragEl||!dragEl.parentElement)return;');
  L.push('var parent=dragEl.parentElement;var siblings=Array.from(parent.children).filter(function(c){return c!==dragEl&&c!==dragPlaceholder&&c!==dragGhost&&!c.id&&c.tagName!=="SCRIPT"&&c.tagName!=="STYLE";});');
  L.push('if(dragPlaceholder.parentElement)dragPlaceholder.remove();');
  L.push('var closest=null,closestDist=99999,before=true;');
  L.push('siblings.forEach(function(sib){var r=sib.getBoundingClientRect();var mid=r.top+r.height/2;var dist=Math.abs(e.clientY-mid);if(dist<closestDist){closestDist=dist;closest=sib;before=e.clientY<mid;}});');
  L.push('if(closest){if(before){closest.insertAdjacentElement("beforebegin",dragPlaceholder);}else{closest.insertAdjacentElement("afterend",dragPlaceholder);}}');
  L.push('}');
  L.push('function onDragEnd(){document.removeEventListener("mousemove",onDragMove);document.removeEventListener("mouseup",onDragEnd);');
  L.push('if(dragGhost){dragGhost.remove();dragGhost=null;}');
  L.push('if(dragEl){dragEl.style.opacity="";dragEl.style.outline="";if(dragPlaceholder&&dragPlaceholder.parentElement){dragPlaceholder.insertAdjacentElement("beforebegin",dragEl);}if(dragPlaceholder)dragPlaceholder.remove();dragPlaceholder=null;posMv(dragEl);notifySync();}dragEl=null;}');
  L.push('function posMv(el){if(!el){mv.style.top="-999px";return;}mvTarget=el;var r=el.getBoundingClientRect();var panelLeft=r.left-32;if(panelLeft<4)panelLeft=r.right+4;mv.style.top=Math.max(4,r.top)+"px";mv.style.left=panelLeft+"px";}');
  L.push('tb.addEventListener("mousedown",function(e){e.preventDefault();e.stopPropagation();},true);');
  L.push('tb.addEventListener("click",function(e){e.preventDefault();e.stopPropagation();var btn=e.target.closest("button[data-cmd]");if(btn){document.execCommand(btn.dataset.cmd,false,null);notifySync();}},true);');
  L.push('mv.addEventListener("mousedown",function(e){if(e.target===mvDrag)return;e.preventDefault();e.stopPropagation();},true);');
  L.push('tb.querySelectorAll("input[type=color]").forEach(function(inp){inp.addEventListener("input",function(){if(inp.dataset.role==="fg"){document.execCommand("foreColor",false,inp.value);}else{document.execCommand("hiliteColor",false,inp.value);}notifySync();});});');
  L.push('szSel.addEventListener("change",function(){if(szSel.value){document.execCommand("fontSize",false,szSel.value);notifySync();}szSel.selectedIndex=0;});');
  L.push('function posTb(el){if(!el)return;var r=el.getBoundingClientRect();var tw=tb.offsetWidth||300;var th=tb.offsetHeight||40;var tx=Math.max(4,Math.min(r.left+(r.width-tw)/2,window.innerWidth-tw-4));var ty=r.top-th-8;if(ty<4)ty=r.bottom+8;tb.style.top=ty+"px";tb.style.left=tx+"px";}');
  L.push('var st=document.createElement("style");st.id="__ed_st";');
  L.push('st.textContent=".__ed_h{outline:2px dashed rgba(59,130,246,.35)!important;outline-offset:2px;cursor:text!important;position:relative}.__ed_s{outline:2px solid #3b82f6!important;outline-offset:2px;cursor:text!important;min-height:1em}.__ed_h:not(.__ed_s)::after{content:attr(data-tag);position:absolute;top:-18px;left:0;font-size:9px;background:#3b82f6;color:#fff;padding:1px 5px;border-radius:3px;pointer-events:none;font-family:system-ui,sans-serif;font-weight:500;line-height:14px;z-index:2147483646;white-space:nowrap}.__ed_dh{outline:2px dashed rgba(168,85,247,.35)!important;outline-offset:1px;position:relative}.__ed_dh::before{content:attr(data-dtag);position:absolute;top:-16px;right:0;font-size:8px;background:#a855f7;color:#fff;padding:1px 4px;border-radius:3px;pointer-events:none;font-family:system-ui,sans-serif;font-weight:500;line-height:12px;z-index:2147483646;white-space:nowrap}[contenteditable=true]{cursor:text!important}#__ed_tb button:hover,#__ed_tb select:hover{background:#333!important}";');
  L.push('document.head.appendChild(st);');
  L.push('document.addEventListener("mouseover",function(e){');
  L.push('var tel=findTextEl(e.target);if(hov&&hov!==tel){hov.classList.remove("__ed_h");hov.removeAttribute("data-tag");}if(tel){tel.classList.add("__ed_h");tel.setAttribute("data-tag",tel.tagName.toLowerCase());hov=tel;}else{hov=null;}');
  L.push('var del=findDeepDrag(e.target);if(del&&del!==mvTarget){posMv(del);}');
  L.push('},true);');
  L.push('document.addEventListener("click",function(e){');
  L.push('if(e.target.closest("#__ed_tb,#__ed_mv"))return;');
  L.push('var a=e.target.closest("a");if(a)e.preventDefault();');
  L.push('var el=findTextEl(e.target);');
  L.push('if(!el){doDesel();return;}');
  L.push('e.preventDefault();');
  L.push('if(sel&&sel!==el){sel.contentEditable="false";sel.classList.remove("__ed_s");}');
  L.push('var isNew=sel!==el;sel=el;el.contentEditable="true";el.classList.add("__ed_s");');
  L.push('if(isNew){el.focus();setTimeout(function(){posTb(el);},0);}else{posTb(el);}');
  L.push('},true);');
  L.push('document.addEventListener("mouseup",function(e){if(sel&&sel.contentEditable==="true"){setTimeout(function(){posTb(sel);},10);}},true);');
  L.push('function doDesel(){if(sel){sel.contentEditable="false";sel.classList.remove("__ed_s");}sel=null;tb.style.top="-999px";}');
  L.push('function doSelTab(el){if(sel&&sel!==el){sel.contentEditable="false";sel.classList.remove("__ed_s");}sel=el;el.contentEditable="true";el.classList.add("__ed_s");el.focus();var rng=document.createRange();var s=window.getSelection();rng.selectNodeContents(el);rng.collapse(false);s.removeAllRanges();s.addRange(rng);posTb(el);}');
  L.push('document.addEventListener("input",function(){if(sel)posTb(sel);notifySync();},true);');
  L.push('document.addEventListener("keydown",function(e){if(e.key==="Escape"){doDesel();e.preventDefault();}if(e.key==="Tab"&&sel){e.preventDefault();var all=Array.from(document.querySelectorAll("*")).filter(isTextOk);var i=all.indexOf(sel);var nx=all[e.shiftKey?(i-1+all.length)%all.length:(i+1)%all.length];if(nx)doSelTab(nx);}});');
  L.push('window.addEventListener("scroll",function(){if(sel)posTb(sel);if(mvTarget)posMv(mvTarget);},true);');
  L.push('window.addEventListener("resize",function(){if(sel)posTb(sel);if(mvTarget)posMv(mvTarget);});');
  L.push('var syncT;');
  L.push('function notifySync(){clearTimeout(syncT);syncT=setTimeout(function(){var c=document.documentElement.cloneNode(true);c.querySelectorAll("#__ed_tb,#__ed_st,#__ed_mv").forEach(function(n){n.remove();});c.querySelectorAll(".__ed_h,.__ed_s,.__ed_dh,[contenteditable],[data-tag],[data-dtag]").forEach(function(n){n.classList.remove("__ed_h","__ed_s","__ed_dh");n.removeAttribute("contenteditable");n.removeAttribute("data-tag");n.removeAttribute("data-dtag");});c.querySelectorAll("script").forEach(function(s){var t=s.textContent||"";if(t.indexOf("__ed_")!==-1||t.indexOf("aurion_edit")!==-1)s.remove();});parent.postMessage({type:"aurion_edit",html:"<!DOCTYPE html>"+c.outerHTML},"*");},600);}');
  L.push('})();');
  L.push('</scr'+'ipt>');

  const editorScript = L.join('\n');
  const editGridFlexCss = gridFlexDebugActive ? `<style>[style*="display:grid"],[style*="display: grid"]{outline:2px dashed #ec4899!important;position:relative!important;}[style*="display:flex"],[style*="display: flex"]{outline:2px dashed #a855f7!important;position:relative!important;}</style>` : '';
  const combined = errorCaptureScript + editorScript + layoutDebugCss + darkModeCss + editGridFlexCss;
  if (html.includes('</body>')) {
    return html.replace('</body>', combined + '</body>');
  }
  return html + combined;
}
