/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2024 kvip
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */


export class TextCanvas {
    public container: HTMLElement;
    public canvas: HTMLCanvasElement;
    private params: CanvasTextParams;


    constructor() {
        this.container = document.createElement('div');
        this.container.classList.add('text-canvas');
        this.canvas = document.createElement('canvas');

        this.params = {
            cornerRadius: 20,
            paddingVertical: 10,
            paddingHorizontal: 15,
            fontSize: 14,
            fontFamily: "Roboto",
            color: '#ffffff',
            align: LEFT_ALIGN,
            borderStyle: -1,
            text: [],
            canvasHeight: 200,
            canvasWidth: 250,
            lineHeight: 24
        }

        this.canvas.width = this.params.canvasWidth;
        this.canvas.height = this.params.canvasHeight;
        this.container.appendChild(this.canvas);
    }

    public getTextParams(): CanvasTextParams {
        return this.params;
    }

    public draw(params?: Partial<CanvasTextParams>) {     
        this.params = { ...this.params, ...params };
        this.canvas.width = this.params.canvasWidth;
        this.canvas.height = this.params.lineHeight * this.params.text.length;
        this.drawText()
    }

    private getLeft(align: number, width: number, padding: number) {
        if (align == LEFT_ALIGN) {
            return padding
        } else if (align == CENTER_ALIGN) {
            return this.canvas.width / 2 - width / 2;
        } else {
            return this.canvas.width - width - padding;
        }
    }


    private drawText() {

        const ctx = this.canvas.getContext('2d');

        const textLines = this.params.text
        const { fontSize,
            lineHeight,
            cornerRadius,

            paddingHorizontal,
            canvasWidth,
            canvasHeight,
            color,
            align,
            borderStyle } = this.params;

       

        const radius = lineHeight / 2;
        const radius2 = align == CENTER_ALIGN? radius*4: radius *3;
        const paddingVertical = (lineHeight - fontSize) / 2

        const totalHeight = textLines.length * lineHeight;
       
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        ctx.font = `${fontSize}px ${this.params.fontFamily}`;
        ctx.textBaseline = "top";

        if (borderStyle === FRAME_WHITE) {

            ctx.beginPath();

            const measures = [];
            for (let line of textLines) {
                const m = ctx.measureText(line).width;
                measures.push(m < radius?radius:m);
            }

            const combineLines = [];
            let currentCombine = 0;
            combineLines[0] = {
                h: 1,
                w: measures[0]
            }
            for (let i = 0; i < measures.length - 1; i++) {
                const current = measures[i];
                const next = measures[i + 1];
                const dist = Math.abs(next - current)
                if (dist < radius2) {
                    if (combineLines[currentCombine].w < next) {
                        combineLines[currentCombine].w = next;
                    }
                    combineLines[currentCombine].h++;
                } else {
                    currentCombine++;
                    combineLines[currentCombine] = {
                        h: 1,
                        w: next
                    }
                }
            }

            
            let totalLines = 0;
            for (let line = 0; line < combineLines.length; line++) {
                const measureText = combineLines[line].w

                const left = this.getLeft(align, measureText, paddingHorizontal)
                const bottom = totalLines * lineHeight;
                let top = bottom + lineHeight * combineLines[line].h;
                let width = measureText;
                totalLines += combineLines[line].h;

                const right = left + width;

                if (line == 0) {
                    ctx.moveTo(left, bottom)
                    ctx.lineTo(right, bottom)
                    ctx.arcTo(right + paddingHorizontal, bottom, right + paddingHorizontal, canvasHeight, radius)

                    if (align == RIGHT_ALIGN) {

                        ctx.arcTo(right + paddingHorizontal, bottom + totalHeight, right, bottom + totalHeight, radius)
                        break;
                    }
                }

                ctx.arcTo(right + paddingHorizontal, bottom, right + paddingHorizontal, bottom + paddingVertical, radius);

                const lineNext = line + 1;
                if (lineNext == combineLines.length) {
                    ctx.arcTo(right + paddingHorizontal, totalHeight, 0, totalHeight, radius)
                } else {

                    const nextMeasurement = combineLines[lineNext].w

                    if (nextMeasurement < width) {
                        ctx.arcTo(right + paddingHorizontal, top, right, top, radius)
                    }
                    else if (nextMeasurement > width) {
                        ctx.arcTo(right + paddingHorizontal, top, canvasWidth, top, radius)
                    }
                }
            }

            //left side               
            if (align == LEFT_ALIGN) {
                ctx.arcTo(0, totalHeight, 0, totalHeight - paddingVertical, radius)
                ctx.arcTo(0, 0, +paddingVertical, 0, radius)
            } else {
               
               totalLines = 0;
                for (let line = combineLines.length - 1; line >= 0; --line) {


                    const width = combineLines[line].w;
                   
                    const left = this.getLeft(align, width, paddingHorizontal)
                    let bottom = totalHeight - (totalLines + combineLines[line].h) * lineHeight;
                    
                    let top = bottom + lineHeight * combineLines[line].h;
                    totalLines += combineLines[line].h
                
                    ctx.arcTo(left - paddingHorizontal, top, left - paddingHorizontal, bottom, radius)

                    if (line == 0) {
                        ctx.arcTo(left - paddingHorizontal, bottom, canvasWidth, bottom, radius)
                    }
                    else {
                        const nextMeasurement = combineLines[line - 1].w
                        if (nextMeasurement < width) {
                            ctx.arcTo(left - paddingHorizontal, bottom, canvasWidth, bottom, radius)
                        }
                        else if (width < nextMeasurement) {
                            ctx.arcTo(left - paddingHorizontal, bottom, 0, bottom, radius)
                        }
                    }
                }
            }

            ctx.fillStyle = color;
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = color == '#ffffff' ? 'black' : 'white';

            for (let line = 0; line < textLines.length; line++) {
                const width = ctx.measureText(textLines[line]).width;
                const left = this.getLeft(align, width, paddingHorizontal)
                ctx.fillText(textLines[line], left, line * lineHeight + paddingVertical);
            }

        }
        else {
            ctx.fillStyle = color;
            for (let line = 0; line < textLines.length; line++) {
                const width = ctx.measureText(textLines[line]).width;
                const left = this.getLeft(align, width, paddingHorizontal)

                if (borderStyle === FRAME_BLACK) {
                    ctx.fillStyle = '#ffffff';
                    ctx.strokeStyle = color == '#ffffff' ? 'black' : color;
                    ctx.fillText(textLines[line], left, line * lineHeight + paddingVertical);
                    ctx.strokeText(textLines[line], left, line * lineHeight + paddingVertical);
                } else {
                    ctx.fillText(textLines[line], left, line * lineHeight + paddingVertical);
                }
            }
        }
    }

    public remove() {
        this.container.remove();
        this.canvas.remove();
    }
}

export const LEFT_ALIGN = -1;
export const CENTER_ALIGN = 0;
export const RIGHT_ALIGN = 1;
export type TextAlignment = typeof LEFT_ALIGN | typeof CENTER_ALIGN | typeof RIGHT_ALIGN;

export const FRAME_BLACK = -1;
export const FRAME_WHITE = 0;
export const FRAME_NONE = 1;
export type TextFrameStyle = typeof FRAME_BLACK | typeof FRAME_WHITE | typeof FRAME_NONE;


export interface CanvasTextParams {
    canvasWidth: number;
    canvasHeight: number;
    cornerRadius: number;
    paddingVertical: number;
    paddingHorizontal: number;
    fontSize: number;
    fontFamily: string;
    color: string;
    align: TextAlignment;
    borderStyle: TextFrameStyle;
    text: string[];
    lineHeight: number;
}