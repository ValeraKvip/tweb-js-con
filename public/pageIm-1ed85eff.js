import{a as o,e as t,g as r,_ as a,l as s}from"./index-ab022de0.js";import{P as l}from"./page-1b41913e.js";const n=()=>(o.managers.appStateManager.pushToState("authState",{_:"authStateSignedIn"}),t.requestedServerLanguage||t.getCacheLangPack().then(e=>{e.local&&t.getLangPack(e.lang_code)}),i.pageEl.style.display="",r(),Promise.all([a(()=>import("./appDialogsManager-a69426f1.js"),["./appDialogsManager-a69426f1.js","./avatar-36d18e96.js","./button-524a6d80.js","./index-ab022de0.js","./index-75cbdc15.css","./page-1b41913e.js","./wrapEmojiText-d8c0235b.js","./scrollable-a8b7e8a6.js","./putPreloader-43a37b52.js","./htmlToSpan-641eb4da.js","./countryInputField-1a8ddaf9.js","./textToSvgURL-c6ebb454.js","./codeInputField-bb865656.js","./appDialogsManager-e8e53c11.css"],import.meta.url),s(),"requestVideoFrameCallback"in HTMLVideoElement.prototype?Promise.resolve():a(()=>import("./requestVideoFrameCallbackPolyfill-d3040205.js"),[],import.meta.url)]).then(([e])=>{e.default.start(),setTimeout(()=>{document.getElementById("auth-pages").remove()},1e3)})),i=new l("page-chats",!1,n);export{i as default};
//# sourceMappingURL=pageIm-1ed85eff.js.map