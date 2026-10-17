(() => {
  const defaults = {code:'KeyE', altKey:true, shiftKey:true, ctrlKey:false, metaKey:false};
  function valid(s) {
    return s && /^(Key[A-Z]|Digit[0-9])$/.test(s.code) && (s.ctrlKey || s.metaKey || s.altKey) && ['altKey','shiftKey','ctrlKey','metaKey'].every(k=>typeof s[k]==='boolean');
  }
  function label(s) {
    return [s.ctrlKey && 'Ctrl',s.metaKey && 'Command',s.altKey && 'Alt',s.shiftKey && 'Shift',s.code.replace(/^(Key|Digit)/,'')].filter(Boolean).join(' + ');
  }
  function matches(e,s) {
    return !e.repeat && !e.isComposing && e.code===s.code && ['altKey','shiftKey','ctrlKey','metaKey'].every(k=>e[k]===s[k]);
  }
  globalThis.ElementInspectorSettings={defaults,valid,label,matches};
})();
