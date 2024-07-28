/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2024 kvip
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

import type { MyDocument } from '../lib/appManagers/appDocsManager';
import MEDIA_MIME_TYPES_SUPPORTED from '../environment/mediaMimeTypesSupport';
import { MyPhoto } from '../lib/appManagers/appPhotosManager';
import { MEDIA_VIEWER_CLASSNAME } from './appMediaViewerBase';
import { ScrollableX } from './scrollable';
import { MAX_FILE_SAVE_SIZE, SERVER_IMAGE_MIME_TYPES } from '../lib/mtproto/mtproto_config';
import apiManagerProxy from '../lib/mtproto/mtprotoworker';
import { renderImageFromUrlPromise } from '../helpers/dom/renderImageFromUrl';
import { makeMediaSize } from '../helpers/mediaSize';
import scaleMediaElement from '../helpers/canvas/scaleMediaElement';
import ButtonIcon from './buttonIcon';
import { i18n } from '../lib/langPack';
import ripple from './ripple';
import Icon from './icon';
import TextEdit from './mediaEditor/editors/textEdit';
import BaseImageCanvas from './mediaEditor/canvas/baseImageCanvas';
import BrushEdit from './mediaEditor/editors/brushEdit';
import StickerEdit from './mediaEditor/editors/stickersEdit';
import CropEdit from './mediaEditor/editors/cropEdit';
import BaseEdit, { Layer } from './mediaEditor/editors/baseEdit';
import EnhanceEdit from './mediaEditor/editors/enhanceEdit';
import { MediaUndoRedo } from './mediaEditor/utils/mediaUndoRedo';
import ButtonCorner from './buttonCorner';
import { attachClickEvent } from '../helpers/dom/clickEvent';



export default class AppMediaEditor {

    public undoRedo: MediaUndoRedo;
    protected wholeDiv: HTMLElement;
    protected overlaysDiv: HTMLElement;

    protected overlayActive: boolean;

    protected imageDiv: HTMLElement;
    protected mainDiv: HTMLElement;
   
    private tabsMenu: HTMLElement;
    private canvasEdit: BaseImageCanvas;

    private prevWindowsWidth = window.innerWidth;
    private prevWindowsHeight = window.innerHeight
    private currentWindowsWidth = window.innerWidth;
    private currentWindowsHeight = window.innerHeight

    private sidebar: HTMLDivElement;
    private mediaTabs: {
        name: string,
        icon: Icon,
        tab?: HTMLElement,
        editor?: BaseEdit
    }[];
    currentTab: BaseEdit;
    onEditFinished: (dataUrl: string, file: File) => void;
    originalFile: File;

    
    constructor() {
       
        this.undoRedo = new MediaUndoRedo();
        this.prevWindowsWidth = window.innerWidth;
        this.prevWindowsHeight = window.innerHeight
        this.currentWindowsWidth = window.innerWidth;
        this.currentWindowsHeight = window.innerHeight

        window.addEventListener('resize', () => {
            this.prevWindowsWidth = this.currentWindowsWidth
            this.prevWindowsHeight = this.currentWindowsHeight
            this.currentWindowsWidth = window.innerWidth;
            this.currentWindowsHeight = window.innerHeight
        });

        this.canvasEdit = new BaseImageCanvas();
        this.wholeDiv = document.createElement('div');
        this.wholeDiv.classList.add(MEDIA_VIEWER_CLASSNAME + '-whole', "media-editor");

        this.overlaysDiv = document.createElement('div');
        this.overlaysDiv.classList.add('overlays');
        this.overlayActive = false;

        const content = document.createElement('div');
        content.classList.add('content');

        this.mainDiv = document.createElement('div');
        this.mainDiv.classList.add("media-editor-image");
        content.append(this.mainDiv);

        //SIDEBAR
        this.sidebar = document.createElement('div');
        this.sidebar.classList.add("media-editor-sidebar");
        content.append(this.sidebar);

        this.setupSidebar();

        this.overlaysDiv.append(content);
        this.wholeDiv.append(this.overlaysDiv);


        this.mainDiv.append(this.canvasEdit.container);

        document.body.append(this.wholeDiv);

    }

    public selectTab(editor:BaseEdit){    
        for(let tab of this.mediaTabs){
            if(tab.editor == editor){
                tab.tab.click();
                break;
            }
        }       
    }

    public getPrevWindowsSize() {
        return { with: this.prevWindowsWidth, height: this.prevWindowsHeight }
    }

    public getCurrentTab(): BaseEdit {
        return this.currentTab;
    }

    public getCanvas(): HTMLCanvasElement {
        return this.canvasEdit.getCanvas();
    }

    public getOriginalImage(): HTMLImageElement {
        return this.canvasEdit.getOriginalImage();
    }

    public getBaseImageCanvas(): BaseImageCanvas {
        return this.canvasEdit;
    }
   

    private setupSidebar() {
        this.mediaTabs = [{
            name: 'a',
            icon: 'enhance',
            editor: (new EnhanceEdit(this))
        },
        {
            name: 'b',
            icon: 'crop',
            editor: new CropEdit(this)
        },
        {
            name: 'c',
            icon: 'textedit',
            editor: (new TextEdit(this))
        },
        {
            name: 'd',
            icon: 'brush',
            editor: (new BrushEdit(this))

        },
        {
            name: 'e',
            icon: 'smile',
            editor: (new StickerEdit(this))
        }];


        // * Header
        const header = document.createElement('div');
        header.classList.add('sidebar-header');

        const closeBtn = ButtonIcon('close', { noRipple: true });
        closeBtn.onclick = () => {
            //TODO POpuop ask for keep changes.
            this.toggleWholeActive(false);
            this.remove();
        }
        const title = document.createElement('div');
        title.classList.add('sidebar-header__title');
        title.replaceChildren(i18n('Edit'));
        header.append(closeBtn, title);

        const divUndoRedo = document.createElement('div');
        divUndoRedo.classList.add('undo-redo');
        const undoBtn = ButtonIcon('undo', { noRipple: true });
        undoBtn.onclick = () => {
            this.undoRedo.undo();
        }
        const redoBtn = ButtonIcon('redo', { noRipple: true });
        redoBtn.onclick = () => {
            this.undoRedo.redo();
        }
        undoBtn.setAttribute('disabled', 'true')
        redoBtn.setAttribute('disabled', 'true')

        this.undoRedo.onHistoryChanged = (undoCount: number, redoCount: number) => {
            undoCount === 0 ? undoBtn.setAttribute('disabled', 'true') : undoBtn.removeAttribute('disabled');
            redoCount === 0 ? redoBtn.setAttribute('disabled', 'true') : redoBtn.removeAttribute('disabled');
            doneBtn.style.display = '';
        }

        divUndoRedo.append(undoBtn, redoBtn);
        header.append(divUndoRedo);
        this.sidebar.append(header);

        const doneBtn = ButtonCorner({ icon: 'check', className: 'is-visible' });
        doneBtn.style.display = 'none';
        this.sidebar.append(doneBtn);
        attachClickEvent(doneBtn, () => {
         //   this.toggleWholeActive(false);
            this.compileNewImage();
        })



        //TABS HEADER
        const navScrollableContainer = document.createElement('div');
        navScrollableContainer.classList.add('search-super-tabs-scrollable', 'menu-horizontal-scrollable', 'sticky');

        const navScrollable = new ScrollableX(navScrollableContainer);
        navScrollable.container.classList.add('search-super-nav-scrollable');

        const nav = document.createElement('nav');
        nav.classList.add('search-super-tabs', 'menu-horizontal-div');
        this.tabsMenu = nav;

        navScrollable.container.append(nav);

        for (const mediaTab of this.mediaTabs) {
            const menuTab = document.createElement('div');
            menuTab.classList.add('menu-horizontal-div-item');
            const span = document.createElement('span');
            span.classList.add('menu-horizontal-div-item-span');
            const i = document.createElement('i');

            span.append(Icon(mediaTab.icon));
            span.append(i);

            menuTab.append(span);
            ripple(menuTab);
            nav.append(menuTab);            
            mediaTab.tab = menuTab;
        }

        this.sidebar.append(navScrollableContainer);



        //TABS CONTAINER
        const tabsContainer = document.createElement('div');
        tabsContainer.classList.add('search-super-tabs-container', 'tabs-container')

        for (const mediaTab of this.mediaTabs) {
            const container = document.createElement('div');
            tabsContainer.append(mediaTab.editor.container);
        }

        this.sidebar.append(tabsContainer);


        for (const mediaTab of this.mediaTabs) {
            mediaTab.editor.container.classList.add('hidden', 'editor-tab-container');

            mediaTab.tab.onclick = () => {
                for (const t of this.mediaTabs) {                    
                    if (t.editor.isTabActive()) {
                        t.editor.onActive(false);
                        t.tab.classList.remove('active')
                    }
                }
              
                mediaTab.tab.classList.add('active')
                mediaTab.editor.onActive(true);
                this.currentTab = mediaTab.editor;
            }
        }

        const selectedTabOnInit = 0;//TODO remove        
        this.mediaTabs[selectedTabOnInit].tab.classList.add('active')
        this.currentTab = this.mediaTabs[selectedTabOnInit].editor;
        this.currentTab.onActive(true);
    }

    private compileNewImage() {
        const mergeCanvas = this.canvasEdit.mainCanvas;      
        const renderQueue = [];

        for (let tab of this.mediaTabs) {           
            renderQueue.push(...tab.editor.requestRenderQueue());
        }

        renderQueue.sort((a, b) => a.priority - b.priority);

        const mergedCtx = mergeCanvas.getContext('2d');
        const { x, y, width, height } = mergeCanvas.getBoundingClientRect();
        renderQueue.forEach(item => {
            item.render(mergedCtx, x, y, width, height);
        })

        mergeCanvas.toBlob((blob) => {            
            const file = new File([blob], this.originalFile.name, { type: this.originalFile.type });
    
            this.onEditFinished?.(mergeCanvas.toDataURL(), file);
            this.toggleWholeActive(false);
            this.remove();
        });    
    }

    public async openMedia(file: File, onEditFinished?: (dataUrl: string, file: File) => void) {
        this.originalFile = file;
        this.onEditFinished = onEditFinished;
        this.toggleWholeActive(true);


        this.canvasEdit.setImageUrl(file ? await apiManagerProxy.invoke('createObjectURL', file) : '', (image) => {
            for (let tab of this.mediaTabs) {
                tab.editor.onImageReady(image);
            }
        });           
    }

    private modifyMimeTypeForTelegram(mimeType: MTMimeType): MTMimeType {
        return SERVER_IMAGE_MIME_TYPES.has(mimeType) ? 'image/jpeg' : mimeType;
    }

    // private async scaleImageForTelegram(image: HTMLImageElement, mimeType: MTMimeType, convertIncompatible?: boolean) {
    //     const PHOTO_SIDE_LIMIT = 2560;
    //     let url = image.src, scaledBlob: Blob;
    //     if (
    //         mimeType !== 'image/gif' &&
    //         (Math.max(image.naturalWidth, image.naturalHeight) > PHOTO_SIDE_LIMIT || (convertIncompatible && !SERVER_IMAGE_MIME_TYPES.has(mimeType)))
    //     ) {
    //         const { blob } = await scaleMediaElement({
    //             media: image,
    //             boxSize: makeMediaSize(PHOTO_SIDE_LIMIT, PHOTO_SIDE_LIMIT),
    //             mediaSize: makeMediaSize(image.naturalWidth, image.naturalHeight),
    //             mimeType: this.modifyMimeTypeForTelegram(mimeType) as any
    //         });

    //         scaledBlob = blob;
    //         URL.revokeObjectURL(url);
    //         url = await apiManagerProxy.invoke('createObjectURL', blob);
    //         await renderImageFromUrlPromise(image, url);
    //     }

    //     return scaledBlob && { url, blob: scaledBlob };
    // }


    protected toggleWholeActive(active: boolean) {
        if (active) {
            this.wholeDiv.classList.add('active');
        } else {
            this.wholeDiv.classList.add('backwards');
            setTimeout(() => {
                this.wholeDiv.classList.remove('active');
            }, 0);
        }
    }

    public static isMediaCompatibleForDocumentViewer(media: MyPhoto | MyDocument) {
        return (media._ === 'photo' || MEDIA_MIME_TYPES_SUPPORTED.has(media.mime_type) && media.size <= MAX_FILE_SAVE_SIZE);
    }

    public remove(){
        this.undoRedo?.remove();
        this.wholeDiv?.remove();

        this.overlaysDiv?.remove();
        for(let tab of this.mediaTabs){
            tab.tab?.remove();
            tab.editor?.remove();
        }
        this.imageDiv?.remove();
        this.mainDiv?.remove();
        this.wholeDiv?.remove();
        this.wholeDiv?.remove();
        this.tabsMenu?.remove();
        this.canvasEdit?.remove();
        this.currentTab = null;
        this.onEditFinished = null;
        this.originalFile = null;

    }
}
