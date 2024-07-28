/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2024 kvip
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */


import AppMediaEditor from "../../appMediaEditor";
import BaseImageCanvas from "../canvas/baseImageCanvas";
import { DoCallStack } from "../utils/mediaUndoRedo";


export default class BaseEdit {
    public container: HTMLElement;
    public layer: Layer;
    protected appMediaEditor:AppMediaEditor;
    protected canvasInitialBounding:DOMRect

    constructor(appMediaEditor:AppMediaEditor, canvas?: HTMLCanvasElement) {
        this.appMediaEditor = appMediaEditor;
        this.layer = new Layer(canvas);

        this.baseLayer.addLayer(this.layer);

        this.canvasInitialBounding = this.baseLayer.mainCanvas.getBoundingClientRect();
        window.addEventListener('resize', this.onResize.bind(this));
    }


    protected get baseLayer(): BaseImageCanvas {
        return this.appMediaEditor.getBaseImageCanvas();
    }

    protected onResize(){
     
    }

    protected async do(pDo: DoCallStack) {
        this.appMediaEditor.undoRedo.addAction(pDo);
    }


    public onImageReady(image: HTMLImageElement) {

    }

    public requestRenderQueue(): RenderItem[] {
        return [];
    }

    protected selectThisTab() {
        this.appMediaEditor.selectTab(this);
    }

   
    public checkCanvasClick(e: MouseEvent): boolean {
        const { x, y, width, height } = this.baseLayer.mainCanvas.getBoundingClientRect();
        return e.clientX >= x && e.clientX <= x + width && e.clientY >= y && e.clientY <= y + height;
    }

    protected getBasicCanvas(): BaseImageCanvas {
        return this.appMediaEditor.getBaseImageCanvas();
    }

    public isTabActive(): boolean {      
        return this.appMediaEditor.getCurrentTab() == this;
    }

    public onActive(active: boolean) {
        if (!active) {
            this.layer.container.classList.remove('layer-active');
            this.container.classList.add('hidden');
        } else {
            this.layer.container.classList.add('layer-active');
            this.container.classList.remove('hidden');
        }
    }

    protected createUniqueSelectionList(...buttons: HTMLElement[]) {
        for (let btn of buttons) {
            const saveOnClick = btn.onclick;
            btn.onclick = (e) => {
                for (let btnInner of buttons) {
                    btnInner.classList.remove('selected');
                }
                btn.classList.add('selected');
                saveOnClick?.call(btn, e);
            }
        }

        buttons[0].onclick(null);
    }


    public remove(){
        window.removeEventListener('resize', this.onResize.bind(this));
        this.container.remove();
        this.layer?.canvas?.remove();
        this.layer.container.remove();
        this.appMediaEditor = null;
    }
}


export class Layer {
    public container: HTMLElement;
    public canvas?: HTMLCanvasElement;

    constructor(canvas?: HTMLCanvasElement) {
        this.container = document.createElement('div');
        this.container.classList.add("layer");
        this.canvas = canvas;
        if (canvas) {
            this.container.append(canvas);
        }
    }
}

export interface RenderItem {
    priority: number;
    render: (canvas: CanvasRenderingContext2D, left: number, top: number, width: number, height: number) => void;
}