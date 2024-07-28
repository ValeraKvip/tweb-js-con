/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2024 kvip
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

import InputField from "../../inputField";
import { Color, ColorHSV, ColorRGB, getHueCoordinates, getSaturationCoordinates, hexToRgb, rgbToHsv, } from "../utils/utils";

export class ColorSelector {

    public container: HTMLElement;
    public onUpdateColor: (color: string) => void;
    public selectColor: (color: string) => void;

    private onUpdateColorInner: ((color: string, initiator: any) => void)[] = [];
    private currentColor: Color;

    private readonly predefinedColors: string[] = ['#ffffff', '#fe4438', '#ff8901', '#ffd60a', '#33c759', '#62e5e0', '#0a84ff', '#bd5cf3'];
    private isModeHSV: boolean = false;
    private rectContainer: HTMLDivElement;
    colorsContainer: any;
    colorLineWrapper: HTMLDivElement;


    public get hex(): string {
        return this.currentColor.hex;
    }

    public get rgb(): ColorRGB {
        return this.currentColor.rgb;
    }

    private get selectedColorIndex() {
        const index = this.predefinedColors.indexOf(this.currentColor.hex);
        return index >= 0 ? index : 0;
    }

    constructor() {
        this.container = document.createElement('div');
        this.currentColor = new Color('#fff');
        this.colorsContainer = document.createElement('div');
        this.colorsContainer.classList.add('color-selectors');
        const colorSelectors: HTMLElement[] = [];

        for (var color of this.predefinedColors) {
            const colorDiv = document.createElement('div');
            colorDiv.classList.add('color-selector', `color-selector-${this.getClassForColor(color)}`);


            this.colorsContainer.append(colorDiv);
            colorSelectors.push(colorDiv);

            colorDiv.onclick = () => {
                colorSelectors[this.selectedColorIndex].classList.remove('selected')
                colorDiv.classList.add('selected');
                const color = (this.predefinedColors[colorSelectors.indexOf(colorDiv)]);
                this.updateColorInner(this.currentColor.parseColor(color).hsv)
            }
        }

        colorSelectors[0].classList.add('selected')

        //Color mode switch
        const modeSwitch = document.createElement('div');
        modeSwitch.classList.add('color-selector', `color-selector-picker`);


        this.colorsContainer.append(modeSwitch);
        this.container.append(this.colorsContainer);

        this.selectColor = (color) => {
          //  if (this.isModeHSV) {
                this.currentColor.update(this.currentColor.parseColor(color).hsv);
          //  } else {
          if(!this.isModeHSV){
                for (let selector of colorSelectors) {
                    selector.classList.remove('selected');
                }
                colorSelectors[this.selectedColorIndex].classList.add('selected')
            }
        }

        this.setupColorLine();

        this.rectContainer = document.createElement('div');
        this.rectContainer.classList.add('rect-wrapper');
        this.container.append(this.rectContainer);

        this.setupColorRect();
        this.setupInputs();

        const onSwitchModeChanged = () => {
            if (this.isModeHSV) {
                this.rectContainer.style.display = 'flex';

                for (var selector of colorSelectors) {
                    selector.classList.add('color-selector-to-gradient');
                }
                const f = colorSelectors[0];

                const switchToGradient = () => {
                    f.removeEventListener('animationend', switchToGradient);

                    for (var selector of colorSelectors) {
                        selector.style.display = 'none';
                    }
                    this.colorLineWrapper.style.display = ''
                }
                f.addEventListener('animationend', switchToGradient);

                this.updateColorInner(this.currentColor.hsv);

            } else {
                this.rectContainer.style.display = 'none';
                this.colorLineWrapper.style.display = 'none'
                for (var selector of colorSelectors) {
                    selector.classList.remove('color-selector-to-gradient');
                    selector.style.display = '';
                }

            }
        }

        onSwitchModeChanged();

        modeSwitch.onclick = () => {
            this.isModeHSV = !this.isModeHSV;

            if (this.isModeHSV) {
                colorSelectors[this.selectedColorIndex].classList.remove('selected')
                modeSwitch.classList.add('selected');
            } else {

                colorSelectors[this.selectedColorIndex].classList.add('selected')
                modeSwitch.classList.remove('selected');
            }

            onSwitchModeChanged();
        }
    }


    private updateColorInner(color: ColorHSV, initiator?: any) {

        this.currentColor.update(color);
        for (let update of this.onUpdateColorInner) {
            update?.(this.currentColor.hex, initiator);
        }

        this.onUpdateColor?.(this.currentColor.hex)
    }

    public recalculateColor(color: string) {

    }

    private setupColorLine() {

        this.colorLineWrapper = document.createElement('div');
        this.colorLineWrapper.classList.add('color-line-wrapper');
        const colorLine = document.createElement('div');
        colorLine.classList.add('color-line');

        const handle = document.createElement('div');
        handle.classList.add('handle');
        this.colorLineWrapper.append(colorLine, handle)

        this.colorsContainer.prepend(this.colorLineWrapper);



        this.onUpdateColorInner.push((color, initiator) => {

            if (initiator !== colorLine) {
                const handleSize = handle.getBoundingClientRect().width / 2;
                const percent = getHueCoordinates(this.currentColor);

                const { width, x } = colorLine.getBoundingClientRect();
               
                var pos = width / 100 * percent + x;

                if (pos < x) {
                    pos = x + handleSize;
                } else if (pos > x + width - handleSize) {
                    pos = x + width - handleSize;
                }

                handle.style.left = (pos - x - handleSize) + 'px';
            }
        })

        colorLine.addEventListener('mousedown', (event: MouseEvent) => {
            event.preventDefault();
            const handleSize = handle.getBoundingClientRect().width / 2;

            const moveHandle = (event: MouseEvent) => {
                const { x, width, left } = colorLine.getBoundingClientRect();

                let coordX = event.clientX;
                var pos = event.clientX;
                if (pos < x) {
                    pos = x + handleSize;
                    coordX = x;
                } else if (pos > x + width - handleSize) {
                    pos = x + width - handleSize;
                    coordX = x + width;
                }

                handle.style.left = (pos - x - handleSize) + 'px';

                //get color                
                coordX -= left;
                const h = Math.round((coordX / width) * 360);

                const { s, v } = this.currentColor?.hsv;
                const hsv = { h, s, v };

                this.updateColorInner((hsv), colorLine);
            }

            moveHandle(event);

            const onMouseMove = (event: MouseEvent) => {
                moveHandle(event);
            }

            const onMouseUp = (event: MouseEvent) => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                moveHandle(event);
            }

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

    }

    private setupColorRect() {
        const colorRect = document.createElement('div');
        colorRect.classList.add('color-rect');
        this.rectContainer.append(colorRect);


        this.onUpdateColorInner.push((color, initiator) => {
            const hsl = `hsl(${this.currentColor.hsv.h}, 100%, 50%)`
            colorRect.style.backgroundImage = `
            linear-gradient(transparent, black),
            linear-gradient(to right, white, transparent),
            linear-gradient(to right, transparent, ${hsl})
        `;

            colorRect.style.backgroundColor = hsl;

            if (initiator !== colorRect) {
                const handleSize = handle.getBoundingClientRect().width;
                const { width, height } = colorRect.getBoundingClientRect();
                const [left, top] = getSaturationCoordinates(this.currentColor);
                handle.style.left = (left / width * (width - handleSize)) + '%';
                handle.style.top = (top / height * (height - handleSize) + handleSize / 2) + '%';
            }
        })


        const handle = document.createElement('div');
        handle.classList.add('handle');
        colorRect.append(handle)

        colorRect.addEventListener('mousedown', (event: MouseEvent) => {
            event.preventDefault();

            const handleSize = handle.getBoundingClientRect().width;

            const moveHandle = (event: MouseEvent) => {
                const { x, y, width, height, left, top } = colorRect.getBoundingClientRect();

                let xCord = event.clientX;
                let yCord = event.clientY;
                let posX = event.clientX;
                if (posX < left) {
                    posX = left;
                    xCord = left;
                } else if (posX > left + width) {
                    posX = left + width - handleSize;
                    xCord = left + width;
                }

                let posY = event.clientY;
                if (posY < top) {
                    yCord = top;
                    posY = top + handleSize / 2;
                } else if (posY > top + height) {
                    posY = top + height - handleSize / 2;
                    yCord = top + height;
                }

                handle.style.left = (posX - left) + 'px';
                handle.style.top = (posY - top) + 'px';

                //get color
                xCord = (xCord - left) / width;
                yCord = (yCord - top) / height;
                const s = (xCord) * 100;
                const v = 100 - (yCord) * 100;
                const { h } = this.currentColor?.hsv;
                this.updateColorInner(({ h, s, v }), colorRect);
            }

            moveHandle(event);

            const onMouseMove = (event: MouseEvent) => {
                moveHandle(event);
            }

            const onMouseUp = (event: MouseEvent) => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                moveHandle(event);
            }

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    private setupInputs() {

        const inputsWrapper = document.createElement('div');
        inputsWrapper.classList.add('inputs');
        this.rectContainer.append(inputsWrapper);

        //HEX
        const hexInputField = new InputField({
            labelText: 'HEX',
            onRawInput: (v) => {                             
                if (v !== hexInputField.value) {
                    const hex = this.tryParseHEX(v);
                    if (hex) {
                        this.updateColorInner(rgbToHsv(hexToRgb(hex)), hexInputField)
                    }
                }                
            }
        });


        hexInputField.input.onblur = () => {
            const hex = this.tryParseHEX(hexInputField.value);
            if (hex) {
                hexInputField.value = hex;
            } else {
                hexInputField.value = this.currentColor.hex;
            }
        }


        //RGB
        const rgbInputField = new InputField({
            labelText: 'RGB',
            onRawInput: (v) => {
               
                if (v !== rgbInputField.value) {
                    const rgb = this.tryParseRGB(v);                 
                    if (rgb) {
                        this.updateColorInner(rgbToHsv(rgb), rgbInputField)
                    }
                }
            }

        });

        rgbInputField.input.onblur = () => {
            const rgb = this.tryParseRGB(rgbInputField.value);
            if (rgb) {
                rgbInputField.value = this.formatRGB(rgb);
            } else {
                rgbInputField.value = this.formatRGB(this.currentColor.rgb);
            }
        }


        this.onUpdateColorInner.push((color) => {        
            rgbInputField.value = this.formatRGB(this.currentColor.rgb);          
            hexInputField.value = this.currentColor.hex;          
        })

        inputsWrapper.append(hexInputField.container, rgbInputField.container);
    }

    private formatRGB({ r, g, b }: { r: number, g: number, b: number }) {
        return `${r}, ${g}, ${b}`
    }
    private tryParseRGB(input: string) {
        const parts = input.split(',').map(part => parseInt(part.trim(), 10));

        if (parts.length !== 3 || parts.some(part => isNaN(part) || part < 0 || part > 255)) {
            return null;
        }

        const [r, g, b] = parts;

        return { r, g, b };
    }

    private tryParseHEX(input: string) {

        const match = input.match(/^#?([a-fA-F0-9]{3}|[a-fA-F0-9]{6}|[a-fA-F0-9]{1,})$/);
        if (!match) {
            return null;
        }

        let hexValue = match[1];

        if (hexValue.length === 3) {
            hexValue = hexValue.split('').map(char => char + char).join('');
        }

        if (hexValue.length % 2 !== 0) {
            hexValue = hexValue + hexValue[hexValue.length - 1];
        }

        return `#${hexValue}`;

    }



    private getClassForColor(color: string) {
        switch (color.toLowerCase()) {
            case this.predefinedColors[0]:
                return 'white';
            case this.predefinedColors[1]:
                return 'red';
            case this.predefinedColors[2]:
                return 'orange';
            case this.predefinedColors[3]:
                return 'yellow';
            case this.predefinedColors[4]:
                return 'green';
            case this.predefinedColors[5]:
                return 'cyan';
            case this.predefinedColors[6]:
                return 'blue';
            case this.predefinedColors[7]:
                return 'violet';

            default: {
                return '';
            }
        }
    }
}
