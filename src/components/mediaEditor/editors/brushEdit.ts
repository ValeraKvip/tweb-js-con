/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2024 kvip
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

import { LangPackKey } from "../../../lib/langPack";
import AppMediaEditor from "../../appMediaEditor";
import Row from "../../row";
import { BlurMask } from "../utils/blurMask";
import { ColorSelector } from "../utils/colorSelector";
import { MediaEditorRangeSelector } from "../utils/mediaEditorRangeSelector";
import { BrushTransforms } from "../utils/mediaUndoRedo";
import BaseEdit, { Layer, RenderItem } from "./baseEdit";


export default class BrushEdit extends BaseEdit {
  private ctx: CanvasRenderingContext2D;
  private drawing: boolean = false;
  private brushSize: number = 1;
  private drawMode: DrawModes = DrawModes.Pen;
  private arrowData: {
    lastX: number,
    lastY: number,
    currentX: number,
    currentY: number,
  } = { lastX: 0, lastY: 0, currentX: 0, currentY: 0 }
  private canvasHelper: HTMLCanvasElement;
  private colorSelector: ColorSelector;
  private drawsCount: number = 0;
  private blurMask: BlurMask;
  private brushCircle: HTMLDivElement;
  private ctxHelper: CanvasRenderingContext2D;
  private savedImageData: ImageData;
  blurLayer: Layer;

  constructor(appMediaEditor: AppMediaEditor) {
    super(appMediaEditor, document.createElement('canvas'));

    this.container = document.createElement('div');
    this.container.classList.add('brush-editor');
    this.brushCircle = document.createElement('div');
    this.brushCircle.classList.add('brush-circle');
    this.layer.container.append(this.brushCircle);

    this.ctx = this.layer.canvas.getContext('2d');

    this.canvasHelper = document.createElement('canvas') as HTMLCanvasElement;
    this.canvasHelper.style.pointerEvents = 'none';
    this.ctxHelper = this.canvasHelper.getContext('2d');
    this.layer.container.append(this.canvasHelper);

    this.drawing = false;

    //TODO move to onActive.
    this.layer.canvas.addEventListener('mouseover', this.onMouseOver.bind(this), false);
    this.layer.canvas.addEventListener('mousedown', this.startDrawing.bind(this), false);
    this.layer.canvas.addEventListener('mousemove', this.draw.bind(this), false);
    this.layer.canvas.addEventListener('mouseup', this.stopDrawing.bind(this), false);
    this.layer.canvas.addEventListener('mouseout', this.onMouseOut.bind(this), false);


    this.setupColorSelectors();
    this.setupLineSize();
    this.setupDrawModes();

    this.blurMask = new BlurMask(this.layer.canvas);
    this.blurLayer = new Layer(this.blurMask.canvas);
    this.blurLayer.container.style.pointerEvents = 'none';
    this.blurLayer.container.style.display = 'none';
    this.blurMask.resize(this.baseLayer.mainCanvas.width, this.baseLayer.mainCanvas.height)

    this.baseLayer.addLayer(this.blurLayer);
  }

  private async setupDrawModes() {
    const modes = Object.values(DrawModes).filter(key => isNaN(Number(key))) as string[];

    const parser = new DOMParser();
    const tasks = []

    var brushContainer = document.createElement('div');
    brushContainer.classList.add('brushes');
    this.container.append(brushContainer);

    const title = new Row({
      titleLangKey: `MediaEditor.Brush.Tool`,
      clickable: false,
    });
    title.container.classList.add('sidebar-name');
    brushContainer.append(title.container);

    for (var mode of modes) {
      tasks.push(fetch(`assets/img/media-editor/${mode}.svg`)
        .then((res) => res.text()));

    }

    const brushes = [];
    var results = await Promise.all(tasks);
    for (var [index, text] of results.entries()) {
      const svgDoc = parser.parseFromString(text, 'image/svg+xml');

      const svgElement = svgDoc.documentElement;
      const row = new Row({
        titleLangKey: `MediaEditor.Text.${modes[index]}` as LangPackKey,
        clickable: true,

      });

      const saveIndex = index;
      row.applyMediaElement(svgElement);
      row.container.onclick = () => {
        this.drawMode = saveIndex;
      }

      row.container.classList.add("brush");
      brushes.push(row.container);

      brushContainer.append(row.container);
    }

    this.createUniqueSelectionList(...brushes);
  }

  public onImageReady(image: HTMLImageElement): void {
    this.blurMask.resize(this.baseLayer.mainCanvas.width, this.baseLayer.mainCanvas.height)

  }

  public setBrushSize(size: number) {
    this.brushSize = size;
    document.documentElement.style.setProperty('--brush-size', size + 'px');
  }

  private startDrawing(e: MouseEvent) {
    if (!this.isTabActive()) {
      return;
    }

    this.savedImageData = this.ctx.getImageData(0, 0, this.layer.canvas.width, this.layer.canvas.height);

    const ctxHelper = this.ctxHelper;
    this.drawsCount = 0;
  
    //  this.blurMaskCtx.beginPath();


    this.drawing = true;
    this.ctx.beginPath();
    this.arrowData.lastX = e.clientX;
    this.arrowData.lastY = e.clientY;

    if (this.drawMode === DrawModes.Brush
      || this.drawMode === DrawModes.Neon
      || this.drawMode === DrawModes.Blur) {
      this.canvasHelper.width = this.layer.canvas.width;
      this.canvasHelper.height = this.layer.canvas.height;

      ctxHelper.moveTo(e.clientX, e.clientY);
      ctxHelper.beginPath();
      const { x, y } = this.getLocalXY(e);

      this.arrowData.currentX = x;
      this.arrowData.currentY = y;
    }

    if (this.drawMode === DrawModes.Neon) {

      ctxHelper.shadowBlur = this.brushSize * 1.2;
      ctxHelper.strokeStyle = 'white';
      ctxHelper.lineWidth = this.brushSize;
      const { r, g, b } = this.colorSelector.rgb;
      ctxHelper.shadowColor = `rgba(${r}, ${g}, ${b}, ${.8})`;
      ctxHelper.shadowOffsetX = 0;
      ctxHelper.shadowOffsetY = 0;
      ctxHelper.globalAlpha = 1;
      ctxHelper.lineCap = 'round';
    }
    else if (this.drawMode === DrawModes.Brush) {
      ctxHelper.shadowBlur = 0;
      ctxHelper.strokeStyle = this.colorSelector.hex;
      ctxHelper.lineWidth = this.brushSize;
      ctxHelper.globalAlpha = .5;
      ctxHelper.lineCap = 'round';


    }
    else if (this.drawMode === DrawModes.Pen) {
      this.ctx.lineWidth = this.brushSize;
      this.ctx.lineCap = 'round';
      this.ctx.strokeStyle = this.colorSelector.hex;
    }
    else if (this.drawMode === DrawModes.Arrow) {
      this.ctx.lineWidth = this.brushSize;
      this.ctx.lineCap = 'round';
      this.ctx.strokeStyle = this.colorSelector.hex;
    }
    else if (this.drawMode === DrawModes.Eraser) {
      this.ctx.lineWidth = this.brushSize;
      this.ctx.lineCap = 'round';
      this.ctx.globalCompositeOperation = 'destination-out';
    }else if(this.drawMode === DrawModes.Blur){
      this.blurLayer.container.style.display = ''
      this.blurMask.updateBase(this.baseLayer.mainCanvas);
      this.blurMask.resize(this.baseLayer.mainCanvas.width, this.baseLayer.mainCanvas.height)
    }

    this.draw(e);
  }


  private draw(e: MouseEvent) {
    this.brushCircle.style.left = e.clientX + 'px';
    this.brushCircle.style.top = e.clientY + 'px';

    if (!this.drawing) {
      return;
    }

    e.preventDefault();
    this.drawsCount++;

    const ctxHelper = this.ctxHelper
    const ctx = this.ctx;

    const { x, y } = this.getLocalXY(e);

    if ((this.drawMode === DrawModes.Pen)) {
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.moveTo(x, y);
    }

    if ((this.drawMode === DrawModes.Arrow)) {
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.moveTo(x, y);
    }
    if (this.drawMode === DrawModes.Neon) {
      ctxHelper.clearRect(0, 0, this.canvasHelper.width, this.canvasHelper.height)
      ctxHelper.bezierCurveTo(this.arrowData.currentX, this.arrowData.currentY, x, y, x, y);
      ctxHelper.moveTo(x, y);
      ctxHelper.stroke();

    }
    else if (this.drawMode === DrawModes.Brush) {
      ctxHelper.clearRect(0, 0, this.canvasHelper.width, this.canvasHelper.height)
      ctxHelper.bezierCurveTo(this.arrowData.currentX, this.arrowData.currentY, x, y, x, y);
      ctxHelper.moveTo(x, y);
      ctxHelper.stroke();
    }
    else if (this.drawMode === DrawModes.Blur) {
     // ctxHelper.clearRect(0, 0, this.canvasHelper.width, this.canvasHelper.height)
     ctxHelper.beginPath();
      ctxHelper.lineWidth = this.brushSize;
      ctxHelper.lineCap = 'round';
      ctxHelper.strokeStyle = 'black';
      ctxHelper.lineTo(x, y);
      ctxHelper.stroke();
      ctxHelper.moveTo(x, y);
      this.blurMask.updateMask(this.canvasHelper);
      this.blurMask.darw();
    }
    else if (this.drawMode === DrawModes.Eraser) {
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.moveTo(x, y);
    }

    if (this.drawsCount % 10 == 0) {
      this.arrowData.lastX = this.arrowData.currentX;
      this.arrowData.lastY = this.arrowData.currentY;
    }

    this.arrowData.currentX = x;
    this.arrowData.currentY = y
  }


  private stopDrawing(e: MouseEvent) {
    if (!this.drawing) {
      return;
    }
    this.drawing = false;
    const ctxHelper = this.canvasHelper.getContext('2d');

    if (this.drawMode == DrawModes.Arrow) {
      this.drawArrow(this.arrowData.lastX, this.arrowData.lastY, this.arrowData.currentX, this.arrowData.currentY);
    }
    else if (this.drawMode === DrawModes.Brush || this.drawMode === DrawModes.Neon) {
     
      ctxHelper.shadowBlur = 0;
      this.ctx.drawImage(this.canvasHelper, 0, 0, this.canvasHelper.width, this.canvasHelper.height);
      ctxHelper.clearRect(0, 0, this.canvasHelper.width, this.canvasHelper.height)
    } else if (this.drawMode === DrawModes.Eraser) {
      this.ctx.globalCompositeOperation = 'source-over';
    }
    else if(this.drawMode === DrawModes.Blur){        
      this.blurMask.updateMask(this.canvasHelper);
      this.blurMask.darw();
  
      this.ctx.drawImage( this.blurLayer.canvas, 0, 0,this.blurLayer.canvas.width, this.blurLayer.canvas.height);     
      this.blurLayer.container.style.display = 'none'   
      ctxHelper.clearRect(0, 0, this.canvasHelper.width, this.canvasHelper.height);
    }

    this.ctx.beginPath();

    this.do(async (transforms) => {
      const _t = transforms as BrushTransforms;
      if (_t?.imageTransforms) {
        this.ctx.putImageData(_t.imageTransforms, 0, 0);
      }
      const initialImageData = this.savedImageData;
      const currentImageData = this.ctx.getImageData(0, 0, this.layer.canvas.width, this.layer.canvas.height);
      //undo
      return async () => {
        if (initialImageData) {
          this.ctx.putImageData(initialImageData, 0, 0);
        }

        return () => {
          //redo
          return {
            imageTransforms: currentImageData
          } as BrushTransforms
        }
      }
    })
  }


  private drawArrow(fromX: number, fromY: number, toX: number, toY: number) {
    if (this.drawsCount < 15) {
      return;
    }
    const ctx = this.ctx;
    const headLength = this.brushSize * 5;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  }

  private onMouseOver(e: MouseEvent) {
    this.brushCircle.style.display = '';
  }

  private onMouseOut(e: MouseEvent) {

    this.brushCircle.style.display = 'none';
    this.stopDrawing(e);
  }

  private getLocalXY(e: MouseEvent) {
    const x = e.clientX - this.layer.canvas.offsetLeft + this.layer.canvas.width / 2;
    const y = e.clientY - this.layer.canvas.offsetTop + this.layer.canvas.height / 2;
    return { x, y };
  }

  private setupLineSize() {
    const range = new MediaEditorRangeSelector('MediaEditor.Size', 1, 1, 1, 200);

    range.onChange = (value) => {
      this.setBrushSize(value);
    }
    this.setBrushSize(1);
    this.container.append(range.container);
  }



  private setupColorSelectors() {
    this.colorSelector = new ColorSelector();
    this.colorSelector.onUpdateColor = (color) => {
      document.documentElement.style.setProperty('--brush-color', color);
    }

    this.container.append(this.colorSelector.container);
  }

  public requestRenderQueue(): RenderItem[] {
    return [{
      priority: 0,
      render: (canvas, left, top, w, h) => {
        canvas.drawImage(this.layer.canvas, 0, 0, w, h);
      }
    }]
  }


  public remove(): void {
    this.layer.canvas.removeEventListener('mouseover', this.onMouseOut.bind(this), false);
    this.layer.canvas.removeEventListener('mousedown', this.startDrawing.bind(this), false);
    this.layer.canvas.removeEventListener('mousemove', this.draw.bind(this), false);
    this.layer.canvas.removeEventListener('mouseup', this.stopDrawing.bind(this), false);
    this.layer.canvas.removeEventListener('mouseout', this.onMouseOut.bind(this), false);
    this.brushCircle?.remove();
    this.arrowData = null;
    this.colorSelector?.container?.remove();
    this.canvasHelper?.remove();

    //TODO all others.
  }
}

enum DrawModes {
  Pen,
  Arrow,
  Brush,
  Neon,
  Blur,
  Eraser
}