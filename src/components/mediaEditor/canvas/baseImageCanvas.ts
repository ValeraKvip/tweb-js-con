/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2024 kvip
 * 
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

import { Layer } from "../editors/baseEdit";
import { FilterSettings, ImageProcessor } from "../utils/imageProcessor";


export default class BaseImageCanvas {

    public container: HTMLElement;
    public mainCanvas: HTMLCanvasElement;
    public enhanceCanvas: HTMLCanvasElement;
    private layers: Layer[] = [];
    private image: HTMLImageElement;//TODO no sense to store it.
    private flip: number = 1;
    private imageLoaded: boolean;
    private imageProcessor: ImageProcessor;
    private settings: FilterSettings;
    private clipRect: ClipRect;
    private rotation: number;


    public get rotationAngle(): number {
        return this.rotation;
    }


    constructor() {
        this.container = document.createElement('div');       
        this.mainCanvas = document.createElement('canvas') as HTMLCanvasElement;
        this.mainCanvas.classList.add('main');
        this.enhanceCanvas = document.createElement('canvas') as HTMLCanvasElement;
        this.imageProcessor = new ImageProcessor(this.enhanceCanvas);
        this.container.classList.add('canvas-container');      

        this.container.append(this.mainCanvas)


        //TODO - window.addEventListener('resize', resizeCanvas);
    }

    public get isImageLoaded() {
        return this.imageLoaded;
    }
    public getCanvas(): HTMLCanvasElement {
        return this.mainCanvas;
    }

    public getOriginalImage(): HTMLImageElement {
        return this.image;
    }

    public setAspectRatio(w: number, h: number) {

        const canvasStyle = window.getComputedStyle(this.container);
        const canvasWidth = parseInt(canvasStyle.getPropertyValue('width'));
        const canvasHeight = parseInt(canvasStyle.getPropertyValue('height'));
        const frameAspect = w / h;
        const canvasAspect = canvasWidth / canvasHeight;

        let width, height, x, y;

        if (frameAspect > canvasAspect) {           
            width = canvasWidth;
            height = width / frameAspect;
        } else {           
            height = canvasHeight;
            width = height * frameAspect;
        }

        let newHeight = height;
        let newWidth = width

        for (var layer of this.layers) {
            if (layer.canvas) {
                const ctx = layer.canvas.getContext('2d');
                if (ctx) {
                    const imageData = ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
                    const currentWidth = layer.canvas.width;
                    const currentHeight = layer.canvas.height;

                    layer.canvas.width = newWidth;
                    layer.canvas.height = newHeight;
                    ctx.putImageData(imageData, 0, 0, 0, 0, currentWidth, currentHeight);
                }
            }
        }

        this.mainCanvas.width = newWidth;
        this.mainCanvas.height = newHeight;

        this.enhanceCanvas.width = newWidth;
        this.enhanceCanvas.height = newHeight;

        this.clipRect = {
            x: 0,
            y: 0,
            width: newWidth,
            height: newHeight
        };

    }

    public async restoreOriginalSize() {
        this.setAspectRatio(this.image.width, this.image.height);
        this.update();
    }

    public resizeCanvases() {

    }

    public updateEnhance(settings: FilterSettings) {
        this.settings = settings;
        this.update();
    }

    public async update() {
        this.imageProcessor.updateImage(this.settings);
        let { x, y, width, height } = this.clipRect;
        var ctx = this.mainCanvas.getContext('2d');
     
        //flip           
        ctx.save();
        ctx.translate(this.mainCanvas.width * (this.flip === 1 ? 0 : 1), 0);
        ctx.scale(this.flip, 1);

        //rotate
        if (this.rotation) {
            ctx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);          
        }
        ctx.translate(this.mainCanvas.width / 2, this.mainCanvas.height / 2); 
        ctx.rotate(this.rotation * Math.PI / 180); 


        ctx.drawImage(this.enhanceCanvas,
            x,
            y,
            width, height,
            -this.mainCanvas.width / 2, -this.mainCanvas.height / 2, this.mainCanvas.width, this.mainCanvas.height);

        ctx.restore();
    }


    public cropCanvas(newWidth: number, newHeight: number, clipRect: ClipRect) {
        clipRect.x = clipRect.x > 0 ? clipRect.x : 0;
        this.clipRect = clipRect;
      

        const { x, y, width, height } = this.clipRect;
        for (var layer of this.layers) {
            if (layer.canvas) {
                const ctx = layer.canvas.getContext('2d');
                if (ctx) {
                    const imageData = ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
                    const currentWidth = layer.canvas.width;
                    const currentHeight = layer.canvas.height;


                    layer.canvas.width = newWidth;
                    layer.canvas.height = newHeight;                   

                    ctx.putImageData(imageData, 0, 0, 0, 0, currentWidth, currentHeight);
                }
            }

        }

        this.mainCanvas.width = newWidth;
        this.mainCanvas.height = newHeight;

        this.update();
    }


    public addLayer(layer: Layer) {
        if (layer.canvas) {
            layer.canvas.width = this.mainCanvas.width;
            layer.canvas.height = this.mainCanvas.height;
        }

        this.container.append(layer.container);
        this.layers.push(layer);
    }

    public flipImage() {
        this.flip *= -1;      
        this.update();
    }
   

    public rotateImage(angle: number) {
        this.rotation = angle;
        this.update();       
    }

    public async setImageUrl(url: string, onImageLoaded: (image: HTMLImageElement) => void) {
       
        // if (!url) {
        //     url = "assets/img/camomile.jpg"//TODO for tests only. 
        // }

        const canvas = this.mainCanvas;
        const ctx = this.mainCanvas.getContext('2d');

        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            this.image = new Image();
            this.image.src = url;
            this.image.onload = () => {
                this.imageLoaded = true;                

                this.setAspectRatio(this.image.width, this.image.height);

                onImageLoaded(this.image);
                this.imageProcessor.setImage(this.image);
                this.update();
            }
        }
    }

    remove() {
        this.image?.remove();
        this.layers = null;
        this.enhanceCanvas?.remove();
        this.mainCanvas?.remove();
        this.container?.remove();
    }
}

interface ClipRect {
    x: number,
    y: number,
    width: number,
    height: number;
}