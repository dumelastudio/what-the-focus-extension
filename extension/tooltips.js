(() => {
  'use strict';
  // Same interaction as NapTabs: local tooltip, viewport clamping and keyboard support.
  const tooltip=document.createElement('div');
  tooltip.id='focus-tooltip';tooltip.className='focus-tooltip';
  tooltip.setAttribute('role','tooltip');tooltip.setAttribute('popover','manual');tooltip.hidden=true;
  document.body.append(tooltip);
  let target=null, previousDescription=null, dismissed=null, hiding=null;
  const stopHiding=()=>{clearTimeout(hiding);hiding=null;};
  function position() {
    if(!target?.isConnected||tooltip.hidden)return;
    const width=Math.min(innerWidth,document.documentElement.getBoundingClientRect().width),margin=8,gap=9;
    tooltip.style.maxWidth=`${Math.min(260,width-margin*2)}px`;
    const rect=target.getBoundingClientRect(),box=tooltip.getBoundingClientRect();
    const bottom=innerHeight-rect.bottom-margin,top=rect.top-margin;
    const below=bottom>=box.height+gap||bottom>=top;
    const left=Math.max(margin,Math.min(width-box.width-margin,rect.left+rect.width/2-box.width/2));
    tooltip.dataset.placement=below?'bottom':'top';
    tooltip.style.left=`${Math.round(left)}px`;
    tooltip.style.top=`${Math.round(Math.max(margin,below?rect.bottom+gap:rect.top-box.height-gap))}px`;
    tooltip.style.setProperty('--tooltip-arrow-x',`${Math.max(10,Math.min(box.width-10,rect.left+rect.width/2-left))}px`);
  }
  function hide() {
    stopHiding();
    if(target) {
      if(previousDescription===null)target.removeAttribute('aria-describedby');
      else target.setAttribute('aria-describedby',previousDescription);
    }
    target=null;previousDescription=null;
    if(tooltip.matches(':popover-open'))tooltip.hidePopover();
    tooltip.hidden=true;
  }
  function show(button) {
    stopHiding();
    if(button===dismissed||button.disabled||button.getAttribute('aria-expanded')==='true'||!button.dataset.tooltip)return;
    if(target!==button) {
      hide();target=button;previousDescription=button.getAttribute('aria-describedby');
      const ids=new Set((previousDescription||'').split(/\s+/).filter(Boolean));ids.add(tooltip.id);
      button.setAttribute('aria-describedby',[...ids].join(' '));
    }
    tooltip.textContent=button.dataset.tooltip;tooltip.hidden=false;
    if(!tooltip.matches(':popover-open'))tooltip.showPopover();
    position(); // No delay, animation or system title tooltip.
  }
  const buttonFrom=node=>node instanceof Element?node.closest('.top-controls [data-tooltip]'):null;
  document.addEventListener('pointerover',event=>{
    if(event.pointerType==='touch')return;
    if(tooltip.contains(event.target)){stopHiding();return;}
    const button=buttonFrom(event.target);
    if(button && !(event.relatedTarget instanceof Node && button.contains(event.relatedTarget)))show(button);
  });
  document.addEventListener('pointerout',event=>{
    const button=buttonFrom(event.target);
    if(button && button===dismissed && !(event.relatedTarget instanceof Node && button.contains(event.relatedTarget)))dismissed=null;
    if(!target)return;
    if(event.relatedTarget instanceof Node && (target.contains(event.relatedTarget)||tooltip.contains(event.relatedTarget)))return;
    if(target.contains(event.target)||tooltip.contains(event.target)) {stopHiding();hiding=setTimeout(hide,100);}
  });
  document.addEventListener('focusin',event=>{const button=buttonFrom(event.target);if(button)show(button);});
  document.addEventListener('focusout',event=>{
    if(buttonFrom(event.target)===dismissed)dismissed=null;
    if(target?.contains(event.target))hide();
  });
  document.addEventListener('pointerdown',hide,true);
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    dismissed=target||buttonFrom(document.activeElement)||document.querySelector('.top-controls [aria-expanded="true"]');
    hide();
  });
  document.addEventListener('focus-appearance',()=>{if(target)show(target);});
  document.addEventListener('scroll',position,true);
  window.addEventListener('resize',position);
  window.addEventListener('blur',hide);
})();
