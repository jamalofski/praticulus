/* #3797/#3861: an extension-injected define()/module captures vendored UMD libs before they reach
   window. Clearing those bindings fails silently when the extension made them non-writable or getter-only,
   so when define survives we strip its .amd marker to force the UMD wrapper down its global branch.
   Paired with umd-unguard.js, which restores the bindings once the vendored libs are loaded. */
(function(){var w=window,s={d:w.define,m:w.module,e:w.exports},o=null;
try{w.define=w.module=w.exports=undefined;}catch(e){}
if(typeof w.define==='function'&&w.define.amd){o=w.define;s.amd=o.amd;try{o.amd=undefined;if(o.amd)delete o.amd;}catch(e){}}
w.__ug=function(){try{w.define=s.d;}catch(e){}try{w.module=s.m;}catch(e){}try{w.exports=s.e;}catch(e){}if(o){try{o.amd=s.amd;}catch(e){}}};})();
