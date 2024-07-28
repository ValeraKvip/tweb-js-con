/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2024 kvip
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

export type TransformOrigin = 'center' | 'individual';

export default class EditableFrame {
    private static zIndex: number = 0;
    public onUpdate?: ((x: number, y: number, width: number, height: number) => void);
    public onDestroy: (() => void) | null = null;

    public container: HTMLElement;
    private canvas: HTMLCanvasElement//TODO what?
    private draggables: any[];

    private controlledElement?: HTMLElement;

    private transformOrigin: TransformOrigin = 'center';
    private keepRatio: boolean = true;
    private allowCrossCanvasBorder: boolean = true;
    private allowDeleteOutside?: boolean = true;
    private allowRotation: boolean = true;
    private minSize: number = 25;
    private onSelect?: () => void;
    private onDeselect?: () => void;
    private onFocus?: (e: MouseEvent) => void;
    private _transforms: FrameTransform;
    private currentZIndex: number;

    public get zIndex(){
        return this.currentZIndex;
    }


    public set transforms(t: FrameTransform) {        
        this._transforms = t;

        if (!this.allowRotation) {
            this._transforms.rotation = 0;
        } else {
            this._transforms.rotation = this._transforms.rotation ?? 0;
        }


        const { x, y, width, height, rotation } = this._transforms;
        this.container.style.left = `${x}px`;
        this.container.style.top = `${y}px`;

        this.container.style.width = `${width}px`;
        this.container.style.height = `${height}px`;

        this.container.style.transform = `rotate(${rotation}deg)`;
        this.container.style.transformOrigin = 'center center';

        
        this.onUpdate?.(x, y, width, height);
    }

    public get transforms(): FrameTransform {
        return this._transforms;
    }


    constructor({ canvas, controlledElement, keepRatio, allowCrossCanvasBorder, allowDeleteOutside, minSize,
        allowRotation, transformOrigin, onSelect, onDeselect, onUpdate, onFocus }: {

            canvas: HTMLCanvasElement,
            controlledElement?: HTMLElement,
            keepRatio?: boolean
            allowCrossCanvasBorder?: boolean,
            allowDeleteOutside?: boolean,
            minSize?: number,
            allowRotation?: boolean,
            transformOrigin?: TransformOrigin,
            onSelect?: () => void;
            onDeselect?: () => void;
            onUpdate?: ((x: number, y: number, width: number, height: number) => void),
            onFocus?: (e: MouseEvent) => void
        }) {

        this.canvas = canvas;
        this.keepRatio = keepRatio ?? this.keepRatio;
        this.allowCrossCanvasBorder = allowCrossCanvasBorder ?? this.allowCrossCanvasBorder;
        this.allowDeleteOutside = allowDeleteOutside ?? this.allowDeleteOutside;
        this.transformOrigin = transformOrigin ?? this.transformOrigin;
        this.minSize = minSize ?? this.minSize;
        this.controlledElement = controlledElement
        this.container = document.createElement('div');
        this.container.classList.add('editable-frame');
        this.allowRotation = allowRotation ?? this.allowRotation;

        if (this.controlledElement) {
            this.container.append(this.controlledElement)
        }


        this.onSelect = onSelect;
        this.onDeselect = onDeselect;
        this.onUpdate = onUpdate;
        this.onFocus = onFocus;

        this.setupDraggables();
        this.setupFrameEvents()
        this.deselect();

        requestAnimationFrame(() => {           
            if (!this.transforms) {
                const { x, y, width, height } = this.container.getBoundingClientRect();
                this.transforms = { x, y, width, height, rotation: 0 };
            }
        })    
    }

    public getControlledElement(): HTMLElement {
        return this.controlledElement;
    }


    public select() {
        this.onSelect?.();
        this.container.style.borderWidth = ''
        this.currentZIndex = EditableFrame.zIndex++;
        this.container.style.zIndex = String( this.currentZIndex );
        for (let draggable of this.draggables) {
            draggable.style.display = '';
        }
    }

    //outer call
    public deselect() {
        this.onDeselect?.();
        this.container.style.borderWidth = '0'
        for (let draggable of this.draggables) {
            draggable.style.display = 'none';
        }
    }

    public setKeepRatio(keep:boolean){
        this.keepRatio = keep;
    }

    private setupDraggables() {
        //DRAGGABLE
        this.draggables = [];

        for (let i = 0; i < 4; ++i) {
            const draggable = document.createElement('div');
            draggable.classList.add('draggable');
            this.container.append(draggable);
            this.draggables.push(draggable);

            draggable.addEventListener('mousedown', this.onMouseDown.bind(this));

            draggable.ondragstart = () => false;
        }
        this.draggables[0].style.left = -8 + 'px';
        this.draggables[0].style.top = -8 + 'px';

        this.draggables[1].style.right = -8 + 'px';
        this.draggables[1].style.top = -8 + 'px';


        this.draggables[2].style.right = -8 + 'px';
        this.draggables[2].style.bottom = -8 + 'px';


        this.draggables[3].style.left = -8 + 'px';
        this.draggables[3].style.bottom = -8 + 'px';
    }



    private setupFrameEvents() {

        this.container.addEventListener('mousedown', (event: MouseEvent) => {           
            this.select();
            const downEvent = event;
            event.preventDefault();
            event.stopPropagation();

            this.container.style.borderWidth = ''
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
            let hasMoved = false;
            let prevX = 0, prevY = 0, currentX = 0, currentY = 0;
            const rect = this.container.getBoundingClientRect();
            const shiftX = event.clientX - rect.x;
            const shiftY = event.clientY - rect.y;

            const onMouseMove = (event: MouseEvent) => {
                hasMoved = true;
                prevX = currentX;
                prevY = currentY
                currentX = event.clientX;
                currentY = event.clientY;

                const x = event.clientX - shiftX;
                const y = event.clientY - shiftY;

                this.transforms = { ...this.transforms, ... { x, y } };
            }

            const onMouseUp = (event: MouseEvent) => {

                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
             
                this.container.style.display = 'block';
               
                if (!hasMoved) {
                    this.onFocus?.(downEvent);

                    return;
                }



                let out = {
                    x: 0, y: 0, width: 0, height: 0
                }
                this.container.style.display = 'block';
                if (this.isEditableInsideCanvas()) {
                  

                } else if (this.isEditableCrossedCanvas(out)) {                   
                    if (!this.allowCrossCanvasBorder) {
                        this.container.style.left = parseInt(this.container.style.left) + out.x + 'px';
                        this.container.style.top = parseInt(this.container.style.top) + out.y + 'px';
                    }

                } else {
                    if (this.allowDeleteOutside) {
                        this.animateRemove({
                            x: (currentX - prevX) * 0.4,
                            y: (currentY - prevY) * 0.1 - 15
                        });
                    } else {
                        this.container.style.left = parseInt(this.container.style.left) + out.x + 'px';
                        this.container.style.top = parseInt(this.container.style.top) + out.y + 'px';
                    }


                }
            }

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    //set initial position
    public setRect(x: number, y: number, width: number, height: number) {
        x -= this.draggables[0].offsetWidth / 2;
        y -= this.draggables[0].offsetHeight / 2;
        this.draggables[0].style.left = x + 'px';
        this.draggables[0].style.top = y + 'px';

        this.draggables[1].style.left = (x + width) + 'px';
        this.draggables[1].style.top = y + 'px';

        this.draggables[2].style.left = (x + width) + 'px';
        this.draggables[2].style.top = (y + height) + 'px';

        this.draggables[3].style.left = x + 'px';
        this.draggables[3].style.top = (y + height) + 'px';
    }



    private getRotationAngle(el: HTMLElement) {
        const st = window.getComputedStyle(el, null);
        let tr = st.getPropertyValue("transform");

        if (!tr || tr === 'none') {
            tr = "matrix(1, 0, 0, 1, 0, 0)";
        }
        let values = tr.split('(')[1].split(')')[0].split(',');
        let a = parseFloat(values[0]);
        let b = parseFloat(values[1]);
        let angle = Math.round(Math.atan2(b, a) * (180 / Math.PI));
        return angle;
    }

    private onMouseDown(event: MouseEvent) {

        event.preventDefault();
        event.stopPropagation();

        const target = event.target;
        const initialRect = this.container.getBoundingClientRect();
        const startClickX = event.clientX;
        const startClickY = event.clientY;
        const startCenterX = initialRect.left + initialRect.width / 2;
        const startCenterY = initialRect.top + initialRect.height / 2;

        const angleRad = Math.atan2(event.clientY - startCenterY, event.clientX - startCenterX);
        const angleDeg = angleRad * (180 / Math.PI);
        const startAngle = angleDeg - this.getRotationAngle(this.container)


        const onMouseMove = (event: MouseEvent) => {
            if (this.keepRatio) {
                const angleRad = Math.atan2(event.clientY - startCenterY, event.clientX - startCenterX);
                const rotation = angleRad * (180 / Math.PI) - startAngle;

                const startDistance = Math.sqrt((startCenterX - startClickX) ** 2 + (startCenterY - startClickY) ** 2);
                const distance = Math.sqrt((startCenterX - event.clientX) ** 2 + (startCenterY - event.clientY) ** 2);
                let scaleFactor = distance / startDistance
                scaleFactor = scaleFactor == 0 ? 1 : scaleFactor;


                let x = initialRect.left - (initialRect.width * scaleFactor - initialRect.width) / 2;
                let y = initialRect.top - (initialRect.height * scaleFactor - initialRect.height) / 2;
                let width = initialRect.width * scaleFactor;
                let height = initialRect.height * scaleFactor;



                if (this.transformOrigin == 'individual') {
                    const index = this.draggables.indexOf(target);
                    if (index == 0) {
                        x = initialRect.left - (width - initialRect.width);
                        y = initialRect.top - (height - initialRect.height);

                    }
                    if (index == 1) {
                        x = initialRect.left;
                        y = y + (initialRect.y + initialRect.height) - (y + height);
                    }
                    if (index == 2) {
                        x = initialRect.left;
                        y = initialRect.top;
                    }
                    if (index == 3) {

                        y = initialRect.y
                        x = x + (initialRect.x + initialRect.width) - (x + width);
                    }
                }



                if (!this.allowCrossCanvasBorder) {
                    const canvasRect = this.canvas.getBoundingClientRect();
                    if (width > canvasRect.width) {
                        x = canvasRect.x;
                        width = canvasRect.width;


                        height = (canvasRect.width / canvasRect.height) * canvasRect.width;

                    }

                    if (height > canvasRect.height) {
                        y = canvasRect.top;
                        height = canvasRect.height;
                        width = (canvasRect.height / canvasRect.width) * canvasRect.height;
                    }
                }
                this.transforms = { x, y, width, height, rotation };

            } else {
                const canvasRect = this.canvas.getBoundingClientRect();

                let x = 0;
                let y = 0;
                let width = 0;
                let height = 0;


                const index = this.draggables.indexOf(target);
                const minSize = this.minSize;
                if (index === 0) {
                    x = event.clientX;
                    y = event.clientY;

                    //avoid crosses     
                    if (x > initialRect.x + initialRect.width - minSize) {
                        x = initialRect.x + initialRect.width - minSize;
                    }

                    if (y > initialRect.y + initialRect.height - minSize) {
                        y = initialRect.y + initialRect.height - minSize;
                    }

                    //keep inside canvas
                    if (x < canvasRect.x) {
                        x = canvasRect.x;
                    }
                    if (y < canvasRect.y) {
                        y = canvasRect.y;
                    }

                    width = initialRect.width + (initialRect.x - x);
                    height = initialRect.height + (initialRect.y - y);

                } else if (index === 1) {
                    x = event.clientX;
                    y = event.clientY;

                    //avoid crosses
                    if (x < initialRect.x + minSize) {
                        x = initialRect.x + minSize;
                    }

                    if (y > initialRect.y + initialRect.height - minSize) {
                        y = initialRect.y + initialRect.height - minSize;
                    }

                    //keep inside canvas
                    if (x > canvasRect.x + canvasRect.width) {
                        x = canvasRect.x + canvasRect.width;
                    }
                    if (y < canvasRect.y) {
                        y = canvasRect.y;
                    }

                    width = x - initialRect.x;
                    height = initialRect.height + (initialRect.y - y);
                    x = initialRect.x;
                }
                else if (index === 2) {

                    x = event.clientX;
                    y = event.clientY;

                    //avoid crosses
                    if (x < initialRect.x + minSize) {
                        x = initialRect.x + minSize;
                    }

                    if (y < initialRect.y  + minSize) {
                        y = initialRect.y +  minSize;
                    }

                    //keep inside canvas
                    if (x > canvasRect.x + canvasRect.width) {
                        x = canvasRect.x + canvasRect.width;
                    }
                    if (y > canvasRect.y + canvasRect.height) {
                        y =canvasRect.y + canvasRect.height;
                    }

                    width = x - initialRect.x;
                    height = y - initialRect.y;
                    x = initialRect.x;
                    y = initialRect.y;

                } else {

                    x = event.clientX;
                    y = event.clientY;

                     //avoid crosses     
                     if (x > initialRect.x + initialRect.width - minSize) {
                        x = initialRect.x + initialRect.width - minSize;
                    }

                    if (y < initialRect.y + minSize) {
                        y = initialRect.y + minSize;
                    }

                    //keep inside canvas
                    if (x < canvasRect.x) {
                        x = canvasRect.x;
                    }
                    if (y > canvasRect.y + canvasRect.height ) {
                        y = canvasRect.y + canvasRect.height;
                    }

                    width = initialRect.width + (initialRect.x - x);
                    height = y - initialRect.y;
                    y = initialRect.y;
                }


                this.transforms = { x, y, width, height };
            }
        }

        const onMouseUp = (event: MouseEvent) => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }



    isEditableInsideCanvas() {
        const rect1 = this.canvas.getBoundingClientRect();
        const rect2 = this.container.getBoundingClientRect();

        return (
            rect1.top >= rect2.top &&
            rect1.left >= rect2.left &&
            rect1.bottom <= rect2.bottom &&
            rect1.right <= rect2.right
        );
    }

    isEditableCrossedCanvas(out: { x: number, y: number, width: number, height: number }) {
        const rect1 = this.canvas.getBoundingClientRect();
        const rect2 = this.container.getBoundingClientRect();
        out.x = out.y = 0;

        if (rect2.right > rect1.right) {
            out.x = rect1.right - rect2.right;
        } else if (rect2.left < rect1.left) {
            out.x = rect1.left - rect2.left;
        }


        if (rect2.bottom > rect1.bottom) {
            out.y = rect1.bottom - rect2.bottom;
        } else if (rect2.top < rect1.top) {
            out.y = rect1.top - rect2.top;
        }

        const { width, height } = this.calculateBestSize(rect1, rect2, this.keepRatio)
        out.width = width;
        out.height = height;

        return !(
            rect1.right < rect2.left ||
            rect1.left > rect2.right ||
            rect1.bottom < rect2.top ||
            rect1.top > rect2.bottom
        );
    }

    private calculateBestSize(rect1: DOMRect, rect2: DOMRect, keepRatio: boolean = false) {
        let width = rect2.width;
        let height = rect2.height;

        if (keepRatio) {
            const ratio = rect2.width / rect2.height;
           
            if (rect2.width > rect1.width) {
                width = rect1.width;
                height = width / ratio;
            }
            if (height > rect1.height) {
                height = rect1.height;
                width = height * ratio;
            }
        } else {            
            width = Math.min(rect2.width, rect1.width);
            height = Math.min(rect2.height, rect1.height);
        }

       
        return { width, height };
    }



    animateRemove(vector: { x: number, y: number }) {
        this.deselect();
        const div = this.container
        let posX = 0, posY = 0;
        let velX = vector.x, velY = -vector.y;
        const force = { x: 0, y: 0.1 };
        const rotationSpeed = 2;
        let rotation = 0;

        const animate = () => {
            velX += force.x;
            velY += force.y;

            posX += velX;
            posY += velY;

            rotation += rotationSpeed * (vector.x > 0 ? 1 : -1);

            div.style.transform = `translate(${posX}px, ${posY}px) rotate(${rotation}deg)`;

            if (posY < window.innerHeight) {
                requestAnimationFrame(animate);
            } else {               
                this.remove();
            }
        };

        animate();
    }


    public remove() {
        this.onDestroy?.();
        this.onUpdate = null;
        this.onDestroy = null;
        this.container.remove();
        this.draggables.forEach(drag => drag.remove());
        this.controlledElement?.remove();
        this.controlledElement = null;
        this.onSelect = null;
        this.onDeselect = null;
        this.onFocus = null;
    }
}


export interface FrameTransform {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
}