/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2024 kvip
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

import findUpTag from "../../../helpers/dom/findUpTag";
import rootScope from "../../../lib/rootScope";
import { EmoticonsDropdown } from "../../emoticonsDropdown";
import StickersTab from "../../emoticonsDropdown/tabs/stickers";
import wrapSticker from "../../wrappers/sticker";
import BaseEdit, { RenderItem } from "./baseEdit";
import EditableFrame from "../utils/editableFrame";
import RLottiePlayer from "../../../lib/rlottie/rlottiePlayer";
import { StickerUndoRedoTransforms } from "../utils/mediaUndoRedo";
import getStickerEffectThumb from "../../../lib/appManagers/utils/stickers/getStickerEffectThumb";
import PopupPremium from "../../popups/premium";
import AppMediaEditor from "../../appMediaEditor";



export default class StickerEdit extends BaseEdit {
  private emoticonsDropdown: EmoticonsDropdown;
  private currentSticker: EditableFrame;

  constructor(appMediaEditor:AppMediaEditor) {
    super(appMediaEditor);
    this.container = document.createElement('div');
    this.container.classList.add('stickers-editor');

  

    requestAnimationFrame(() => {
      const stickerTab = new StickersTab(rootScope.managers);
      stickerTab.tabId = 0;
      stickerTab.allowCategoryClick = false;

  //    const lazyLoadQueue = new LazyLoadQueue()


      const emoticonsDropdown = this.emoticonsDropdown = new EmoticonsDropdown({
        tabsToRender: [stickerTab],
        customParentElement: this.container,
        keepOpen: true
      })

     // emoticonsDropdown.dispatchEvent('open');

     this.emoticonsDropdown.init();
      emoticonsDropdown.onMediaClick = async (e) => {       
        const target = findUpTag(e.target as HTMLElement, 'DIV');
        if (!target) {
          return false;
        }

        const docId = target.dataset.docId;
        if (!docId) return false;

        const doc = await rootScope.managers.appDocsManager.getDoc(docId);
        if (doc.sticker && getStickerEffectThumb(doc) && !rootScope.premium) {
          //TODO when clicked "buy" - open bot or ask for save changes?
          PopupPremium.show({ feature: 'premium_stickers' });
          return false;
        }



        this.do(async (transforms?: StickerUndoRedoTransforms) => {

          let sticker = document.createElement('div');
          sticker.classList.add('editable-sticker');

          const onSelect = () => {
            if (this.currentSticker != frame) {
              this.currentSticker?.deselect();
              this.currentSticker = frame;
              this.currentSticker.select();
            }
          }

          let frame = new EditableFrame({
            canvas: this.baseLayer.mainCanvas,
            controlledElement: sticker,
            keepRatio: true,
            onSelect: onSelect
          });
          


          frame.container.style.left = 50 + '%';
          frame.container.style.top = 50 + '%';

          frame.container.style.width = 72 + 'px';
          frame.container.style.height = 72 + 'px';
          if (transforms?.frameTransforms) {
            frame.transforms = transforms.frameTransforms;
          }

          this.layer.container.append(frame.container);
          frame.select();



          const stickerWrap = await wrapSticker({
            doc,
            div: frame.container,          
            play: true,
            loop: true,
            width: 256,
            height: 256,
            useCache: true,
                      
          });
      
          frame.onDestroy = () => {
            stickerWrap.render?.then((player) => {            
              if (player instanceof RLottiePlayer) {
                player.remove();

              }

            })
          }



          //undo
          return async () => {          
            const frameTransforms = frame?.transforms;           
            frame?.remove();
            sticker?.remove();
            frame = null;
            sticker = null;

            //redo
            return () => {
              return {
                frameTransforms
              }
            }
          }

        });

        return false;
      };

    })
  }

  public onActive(active: boolean): void {
    super.onActive(active);
   
    
    this.emoticonsDropdown.toggle(active);
      if(active){ 
        //TODO cheater`s solution - animations either do not start or run very slowly until you click on the sticker`s tab.
        this.container.querySelector('.emoticons-menu').querySelector('button').click();
        
      }
    

    if (!active) {
      this.currentSticker?.deselect();
    }
  }

  
  public requestRenderQueue(): RenderItem[] {
    //TODO GIFs
    const editableFrames = Array.from(this.layer.container.querySelectorAll<HTMLElement>('.editable-frame'));
    return editableFrames.map(frame => {
      return {
        priority: parseInt(frame.style.zIndex),
        render: (ctx, left, top, w, h) => {
               //TODO what a shame... final testing - have no time.
               const canvasOrImage = frame.querySelector('canvas,img') as HTMLCanvasElement|HTMLImageElement;
               const matches = frame.style.transform.match(/rotate\(([^)]+)deg\)/);
             
               if (matches) {
                 frame.style.transform= '';
               
                 const { x, y, width, height } = canvasOrImage.getBoundingClientRect();
                
                 ctx.save()
                 ctx.translate(x - left + width / 2, y - top + height / 2)
                 ctx.rotate(parseFloat(matches[1]) * Math.PI / 180);
                 ctx.drawImage(canvasOrImage,  - width / 2, -height / 2, width, height);
                 ctx.restore();
               }          
               frame.style.display = 'none'; 
        }
      } as RenderItem;
    });
  }
}