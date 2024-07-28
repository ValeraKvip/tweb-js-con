/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2024 kvip
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

import PopupElement from '.';
import { i18n, _i18n } from '../../lib/langPack';
import PopupPremium from './premium';


export default class PopupAddAccountPremium extends PopupElement {
    constructor() {
        const btn = document.createElement('button');
      
        super('add-account-premium', {
            title: 'Premium.Boarding.LimitReached',
            closable: true,
            overlayClosable: true,
            body: true,
            scrollable: true,
            buttons: [
                {
                    langKey:'IncreaseLimit',
                    element:btn,
                    callback:()=>{
                        PopupPremium.show();
                    }
                },
                {
                    langKey:'Cancel',
                    isCancel: true,
                },
            ]
        });


        const progressBlock = document.createElement('div');
        progressBlock.classList.add('progress');

        const hintWrapper = document.createElement('div');
        hintWrapper.classList.add('hint-wrapper');
        const hint = document.createElement('div');
        hint.classList.add('hint');
        hint.innerHTML = (hintSVG);
        hintWrapper.append(hint);

        const progressWrapper = document.createElement('div');
        progressWrapper.classList.add('progress-wrapper');
        const progressFree = document.createElement('div');
        progressFree.classList.add('progress-free');
        progressFree.textContent = 'Free'

        const progressPremium = document.createElement('div');
        progressPremium.classList.add('progress-premium');
        progressPremium.textContent = 'Premium';

        progressWrapper.append(progressFree, progressPremium)

        progressBlock.append(hintWrapper, progressWrapper);

        const desc = document.createElement('p');
        desc.append(i18n('Premium.Boarding.Desc'));


        this.body.append(progressBlock, desc)

    }
}


const hintSVG = `
<svg width="58" height="41" viewBox="0 0 58 41" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M16.5 0C7.66344 0 0.5 7.16344 0.5 16C0.5 24.8366 7.66344 32 16.5 32H18.0146C19.6059 32 21.132 32.6321 22.2572 33.7574L28.0857 39.5858C28.8667 40.3668 30.133 40.3668 30.9141 39.5858L36.7425 33.7574C37.8677 32.6321 39.3939 32 40.9852 32H41.5C50.3366 32 57.5 24.8366 57.5 16C57.5 7.16344 50.3366 0 41.5 0H16.5Z" fill="#D9D9D9"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M16.5 0C7.66344 0 0.5 7.16344 0.5 16C0.5 24.8366 7.66344 32 16.5 32H18.0146C19.6059 32 21.132 32.6321 22.2572 33.7574L28.0857 39.5858C28.8667 40.3668 30.133 40.3668 30.9141 39.5858L36.7425 33.7574C37.8677 32.6321 39.3939 32 40.9852 32H41.5C50.3366 32 57.5 24.8366 57.5 16C57.5 7.16344 50.3366 0 41.5 0H16.5Z" fill="url(#paint0_linear_1_1520)"/>
<circle cx="22" cy="11" r="4" fill="white"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M16.6133 24C15.17 24 14 22.83 14 21.3867C14 20.8048 14.1424 20.2266 14.5311 19.7935C15.4487 18.7711 17.6641 17 22 17C26.3359 17 28.5513 18.7711 29.4689 19.7935C29.8576 20.2266 30 20.8048 30 21.3867C30 22.83 28.83 24 27.3867 24H16.6133Z" fill="white"/>
<defs>
<linearGradient id="paint0_linear_1_1520" x1="-4.90517" y1="40" x2="151.205" y2="-26.0281" gradientUnits="userSpaceOnUse">
<stop stop-color="#6C93FF"/>
<stop offset="0.489583" stop-color="#976FFF"/>
<stop offset="1" stop-color="#DF69D1"/>
</linearGradient>
</defs>
</svg>
`