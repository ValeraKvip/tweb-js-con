(this.webpackJsonp=this.webpackJsonp||[]).push([[21],{34:function(e,n,t){"use strict";t.r(n);var a=t(7),o=t(14),u=t(8),c=t(29),i=function(e,n,t,a){return new(t||(t=Promise))((function(o,u){function c(e){try{l(a.next(e))}catch(e){u(e)}}function i(e){try{l(a.throw(e))}catch(e){u(e)}}function l(e){var n;e.done?o(e.value):(n=e.value,n instanceof t?n:new t((function(e){e(n)}))).then(c,i)}l((a=a.apply(e,n||[])).next())}))};const l=new c.a("page-chats",!1,()=>(o.default.pushToState("authState",{_:"authStateSignedIn"}),Promise.resolve().then(t.bind(null,9)).then(e=>{e.default.broadcast("im_mount")}),u.default.requestedServerLanguage||u.default.getCacheLangPack().then(e=>{e.local&&u.default.getLangPack(e.lang_code)}),Object(a.c)(),new Promise(e=>{window.requestAnimationFrame(()=>{Promise.all([t.e(3),t.e(9)]).then(t.bind(null,68)).finally(()=>i(void 0,void 0,void 0,(function*(){e();const n=yield t.e(15).then(t.bind(null,44));Array.from(document.getElementsByClassName("btn-menu-toggle")).forEach(e=>{n.ButtonMenuToggleHandler(e)})})))})})));n.default=l}}]);