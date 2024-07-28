/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2024 kvip
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

import { LangPackKey } from "../../../lib/langPack";
import AppMediaEditor from "../../appMediaEditor";
import ButtonIcon from "../../buttonIcon";
import Row from "../../row";
import EditableFrame from "../utils/editableFrame";
import { CropTransforms } from "../utils/mediaUndoRedo";
import BaseEdit from "./baseEdit";


export default class CropEdit extends BaseEdit {
  private rotationContainer: HTMLDivElement;
  private frame: EditableFrame;
  private tilt: number;
  private tiltSave: number;
  private currentAngle: number;
  private currentAngleSave: number;
  private rotateAngle: (angle: number) => number;
  flip: boolean;
  flipSave: boolean;

  constructor(appMediaEditor: AppMediaEditor) {
    super(appMediaEditor);
    this.container = document.createElement('div');
    this.container.classList.add('media-editor-crop-edit')


    const title = new Row({
      titleLangKey: `MediaEditor.Crop.AspectRatio`,
      clickable: false,
    });
    title.container.classList.add('sidebar-name');
    this.container.append(title.container);

    const ratios = [];
    //FREE
    const rowFree = new Row({
      titleLangKey: `MediaEditor.Crop.Free`,
      clickable: true,
      icon: 'ARfree',
    });

    rowFree.container.onclick = () => {
      this.frame.setKeepRatio(false);
      if (this.baseLayer.isImageLoaded) {
        const image = this.baseLayer.getOriginalImage();
        this.resizeFrame(image.width, image.height, false)
      }

    }
    this.container.append(rowFree.container);
    ratios.push(rowFree.container);

    //ORIGINAL
    const rowOriginal = new Row({
      titleLangKey: `MediaEditor.Crop.Original`,
      clickable: true,
      icon: 'ARimageoriginal',
    });

    rowOriginal.container.onclick = () => {
      const image = this.baseLayer.getOriginalImage();
      this.resizeFrame(image.width, image.height);

    }
    this.container.append(rowOriginal.container);
    ratios.push(rowOriginal.container);


    //SQUARE
    const rowSquare = new Row({
      titleLangKey: `MediaEditor.Crop.Square`,
      clickable: true,
      icon: 'ARsquare',
    });

    rowSquare.container.onclick = () => {
      // this.enableFreeEdit(false);
      this.resizeFrame(1, 1);
    }
    this.container.append(rowSquare.container);
    ratios.push(rowSquare.container);

    //TWO-COLS
    const columns = document.createElement('div');
    columns.classList.add('two-cols');
    this.container.append(columns);

    const col1 = document.createElement('div');
    col1.classList.add('col');

    const col2 = document.createElement('div');
    col2.classList.add('col');

    columns.append(col1, col2);

    const toDraw = ['3x2', '4x3', '5x4', '7x6', '16x9'];

    for (let asp of toDraw) {
      const [w, h] = asp.split('x');
      //L
      const rowL = new Row({
        titleLangKey: `MediaEditor.Crop.${asp}` as LangPackKey,
        clickable: true,
        icon: `AR${asp}` as any,
      });

      rowL.container.onclick = () => {
        this.resizeFrame(Number(w), Number(h));
      }
      col1.append(rowL.container);
      ratios.push(rowL.container);

      //R    
      const rowR = new Row({
        titleLangKey: `MediaEditor.Crop.${h}x${w}` as LangPackKey,
        clickable: true,
        icon: `AR${asp}` as any,
        iconClasses: ['turn-icon']
      });

      rowR.container.onclick = () => {
        this.resizeFrame(Number(h), Number(w));
      }
      col2.append(rowR.container);
      ratios.push(rowR.container);
    }




    this.setupCropFrame();
    this.setupRotationUI();

    this.createUniqueSelectionList(...ratios);

  }

  private setupCropFrame() {
    const grid = document.createElement('div');
    grid.classList.add('grid');
    grid.append(
      document.createElement('i'), document.createElement('i'),
      document.createElement('i'), document.createElement('i')
    )

    this.frame = new EditableFrame({
      canvas: this.baseLayer.mainCanvas,
      controlledElement: grid,
      allowRotation: false,
      allowCrossCanvasBorder: false,
      allowDeleteOutside: false,
      keepRatio: false,
      transformOrigin: 'individual',
      onDeselect: () => {
        grid.style.display = 'none';
      },
      onSelect: () => {
        grid.style.display = '';
      }
    });
    this.frame.container.classList.add('no-border');

    this.layer.container.appendChild(this.frame.container);
  }

  private setupRotationUI() {


    //ROTATE-Mirror
    this.rotationContainer = document.createElement('div');
    this.rotationContainer.classList.add('rotate-mirror');
    this.rotationContainer.style.display = 'none';
    this.layer.container.append(this.rotationContainer);
    const tiltBtn = ButtonIcon('rotate')
    const mirrorBtn = ButtonIcon('mirror_image')
    const rotationWheel = document.createElement('div');
    rotationWheel.classList.add('rotate');

    const rotationWheelNumbers = document.createElement('div');
    rotationWheelNumbers.classList.add('numbers')
    rotationWheel.append(rotationWheelNumbers);
    for (let angle = -90; angle <= 90; angle += 15) {
      const span = document.createElement('span');
      span.innerText = String(angle) + '\u00B0';
      rotationWheelNumbers.append(span);    
    }

    const triangle = document.createElement('div');
    triangle.classList.add('triangle');

    triangle.innerHTML = triangleSvg;
    rotationWheel.append(triangle);


    const rotationWheelDots = document.createElement('div');
    rotationWheelDots.classList.add('dots')
    rotationWheel.append(rotationWheelDots);
    for (let dot = 0; dot < 99; dot += 1) {
      const dotDiv = document.createElement('span');
      rotationWheelDots.append(dotDiv);
    }

    this.rotationContainer.append(tiltBtn, rotationWheel, mirrorBtn)

    this.tilt = 0;
    this.tiltSave = 0;
    this.currentAngle = 0;
    this.currentAngleSave = 0;
    tiltBtn.onclick = () => {
      this.tiltSave = this.tilt;
      this.tilt += 180;
     
      this.commitToUndoRedo();
      this.tiltSave = this.tilt;
    }

    mirrorBtn.onclick = () => {
      this.flipSave = this.flip;
      this.flip = !this.flip;
      
      this.commitToUndoRedo();
      this.flipSave = this.flip;
    }


    this.rotateAngle = (angle: number) => {
      if( this.currentAngle === angle){
        return;
      }

      this.currentAngle = angle;
      this.baseLayer.rotateImage(this.tilt + angle);
      triangle.style.left = ((angle) / 180) * 100 + '%';
      return angle;
    }

    const rotateEvent = (e: MouseEvent) => {
      const { left, width } = rotationWheel.getBoundingClientRect();
      const angle = ((e.clientX - left) / width) * 180 - 90;
    
      return this.rotateAngle(angle);
    }
    let isMouseDown = false;


    rotationWheel.addEventListener('mousedown', (e) => {
      isMouseDown = true;
    
      this.currentAngleSave = this.currentAngle;
      rotateEvent(e);
    });
    rotationWheel.addEventListener('mousemove', (e) => {
      if (isMouseDown) {
        rotateEvent(e);
      }
    });

    rotationWheel.addEventListener('mouseup', (e) => {
      isMouseDown = false;
      const angle = rotateEvent(e);

      this.commitToUndoRedo()
    });
  }

  private commitToUndoRedo() {
    this.do(async (transform) => {
      let initialAngle = this.currentAngleSave;
      let initialTilt = this.tiltSave;
      let currentAngle = this.currentAngle;
      let currentTilt = this.tilt;
      let initialFlip = this.flipSave;
      let currentFlip = this.flip;

      if (transform) {
        const _t = transform as CropTransforms;
        initialAngle = _t.initialAngle;
        initialTilt = _t.initialTilt;
        currentTilt = _t.tilt;
        currentAngle = (_t.rotation);
        currentFlip = _t.flip;
        initialFlip = _t.initialFlip
      }

      if(currentFlip != initialFlip){
        this.getBasicCanvas().flipImage();       
      }
      else if(initialTilt != currentTilt){
        initialAngle = currentAngle
       this.rotateAngle(0);
        this.baseLayer.rotateImage(currentTilt);       
      }
      else{     
        this.rotateAngle(currentAngle)
      }

    
      //undo
      return async () => {
        if(currentFlip != initialFlip){
          this.getBasicCanvas().flipImage();
          this.flip = this.flipSave = currentFlip;
        }
        else if(initialTilt != currentTilt){     
          this.rotateAngle(0);    
          this.tilt = this.tiltSave = initialTilt;
          this.baseLayer.rotateImage(initialTilt);       
         this.rotateAngle(initialAngle);
        }
        else{        
          this.rotateAngle(initialAngle)
        }
       
        //redo
        return () => {
          return {
            rotation: currentAngle,
            tilt: currentTilt,
            initialTilt,
            initialAngle,
            flip:currentFlip,
            initialFlip

          } as CropTransforms
        }
      }
    })
  }

  public onImageReady(image: HTMLImageElement): void {
    this.resizeFrame(image.width, image.height, false);
  }

  public onActive(active: boolean): void {
    super.onActive(active);
    if (active) {
      requestAnimationFrame(() => {
        this.baseLayer.restoreOriginalSize()
        this.frame.select();
      })
      this.rotationContainer.style.display = '';

    } else {
      requestAnimationFrame(() => {
        this.applyCrop();
        this.frame.deselect();
      });
      this.rotationContainer.style.display = 'none';
    }
  }

  private applyCrop() {

    const frameRect = this.frame.container.getBoundingClientRect();
    const canvasRect = this.baseLayer.mainCanvas.getBoundingClientRect();

    const newCanvasRect = this.getRect(frameRect.width, frameRect.height, this.layer.container);

    this.baseLayer.cropCanvas(newCanvasRect.width, newCanvasRect.height,
      {
        x: frameRect.x - canvasRect.x,
        y: frameRect.y - canvasRect.y,
        width: frameRect.width,
        height: frameRect.height
      }
    );
  }




  enableFreeEdit(enable: boolean) {
    this.rotationContainer.style.display = enable ? 'flex' : 'none';

    if (enable) {
      const rotation = 0;
      let { x, y, width, height } = this.baseLayer.mainCanvas.getBoundingClientRect();     
      this.frame.transforms = { x, y, width, height, rotation };
      this.frame.select();
    } 
  }


  getRect(w: number, h: number, forObj: HTMLElement) {
    const canvasStyle = window.getComputedStyle(forObj);
    const canvasWidth = parseInt(canvasStyle.getPropertyValue('width'));
    const canvasHeight = parseInt(canvasStyle.getPropertyValue('height'));
    const canvasLeft = parseInt(canvasStyle.getPropertyValue('left'));
    const canvasTop = parseInt(canvasStyle.getPropertyValue('top'));


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

    x = canvasLeft - width / 2;
    y = canvasTop - height / 2;

    return { x, y, width, height };
  }



  resizeFrame(w: number, h: number, ratioMode: boolean = true) {
    if (!this.baseLayer.isImageLoaded) {
      return;
    }
    //TODO undo redo.
    this.frame.setKeepRatio(ratioMode);
    const { x, y, width, height } = this.getRect(w, h, this.baseLayer.mainCanvas);
    this.frame.transforms = { x, y, width, height };

  }
}


const triangleSvg = `<svg width="6" height="4" viewBox="0 0 6 4" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M2.29289 0.707106L0.28033 2.71967C-0.192143 3.19214 0.142482 4 0.81066 4H5.18934C5.85752 4 6.19214 3.19214 5.71967 2.71967L3.70711 0.707107C3.31658 0.316583 2.68342 0.316582 2.29289 0.707106Z" fill="white"/>
</svg>
`