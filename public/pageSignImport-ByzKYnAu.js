const __vite__fileDeps=["./pageIm-DZR-1l5H.js","./index-Bdwb7q-j.js","./index-D5levbja.css","./page-Dk7fAP8W.js","./pagePassword-BxwuoxYl.js","./putPreloader-DETSqREf.js","./button-CTe6gQUE.js","./htmlToSpan-D0CBlJnA.js","./wrapEmojiText-Ba-5AiWZ.js","./loginPage-j1ub1Vlj.js","./pageSignIn-8rpAJ9rV.js","./countryInputField-BMWUO6Aw.js","./scrollable-Cy8voV74.js","./pageSignQR-DWo8b2Hr.js","./textToSvgURL-Cnw_Q8Rw.js"],__vite__mapDeps=i=>i.map(i=>__vite__fileDeps[i]);
import{a as o,A as s,_ as r,S as m}from"./index-Bdwb7q-j.js";import{p as h}from"./putPreloader-DETSqREf.js";import{P as d}from"./page-Dk7fAP8W.js";let i;const g=async()=>{const{dcId:e,token:u,tgAddr:n}=i;let a;try{o.managers.apiManager.setBaseDcId(e);const t=await o.managers.apiManager.invokeApi("auth.importWebTokenAuthorization",{api_id:s.id,api_hash:s.hash,web_auth_token:u},{dcId:e,ignoreErrors:!0});t._==="auth.authorization"&&(await o.managers.apiManager.setUser(t.user),a=r(()=>import("./pageIm-DZR-1l5H.js"),__vite__mapDeps([0,1,2,3]),import.meta.url))}catch(t){switch(t.type){case"SESSION_PASSWORD_NEEDED":{t.handled=!0,a=r(()=>import("./pagePassword-BxwuoxYl.js"),__vite__mapDeps([4,1,2,5,3,6,7,8,9]),import.meta.url);break}default:{console.error("authorization import error:",t);const p=m.authState._;p==="authStateSignIn"?a=r(()=>import("./pageSignIn-8rpAJ9rV.js"),__vite__mapDeps([10,1,2,5,3,11,6,8,12,13,14]),import.meta.url):p==="authStateSignQr"&&(a=r(()=>import("./pageSignQR-DWo8b2Hr.js").then(_=>_.a),__vite__mapDeps([13,1,2,3,6,5,14]),import.meta.url));break}}}location.hash=n?.trim()?"#?tgaddr="+encodeURIComponent(n):"",a&&a.then(t=>t.default.mount())},l=new d("page-signImport",!0,()=>{h(l.pageEl.firstElementChild,!0),g()},e=>{i=e,o.managers.appStateManager.pushToState("authState",{_:"authStateSignImport",data:i})});export{l as default};
//# sourceMappingURL=pageSignImport-ByzKYnAu.js.map