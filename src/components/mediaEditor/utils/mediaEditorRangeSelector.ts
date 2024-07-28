/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2024 kvip
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

import { _i18n, LangPackKey } from "../../../lib/langPack";
import RangeSelector from "../../rangeSelector";

export class MediaEditorRangeSelector {
    public container: HTMLDivElement;
    public valueContainer: HTMLElement;
    private range: RangeSelector;
   private updateProgressLine?: (value: number) => void;

    public get value(): number {
        return this.range.value;
    }

    public onChange: (value: number) => void;
    public onEditFinished: (value: number) => void;
    public onEditStarted: (value: number) => void;

    constructor(
        name: LangPackKey,
        step: number,
        initialValue: number,
        minValue: number,
        maxValue: number,
        middleCentred = false,
        writeValue = true
    ) {

        this.container = document.createElement('div');
        this.container.classList.add('media-editor-range-selector');

        const details = document.createElement('div');
        details.classList.add('media-editor-range-selector-details');

        const nameDiv = document.createElement('div');
        nameDiv.classList.add('media-editor-range-selector-name');
        _i18n(nameDiv, name);

        const valueDiv = this.valueContainer = document.createElement('div');
        valueDiv.classList.add('media-editor-range-selector-value');

        if (writeValue) {
            valueDiv.innerHTML = '' + initialValue;
        }



        details.append(nameDiv, valueDiv);

        let progressLineMiddled: HTMLElement;
        this.updateProgressLine =  middleCentred
            ? (value: number) => {
                let width = Math.abs(maxValue / 2 * (value / maxValue));
                progressLineMiddled.style.width = width + '%'
                if (value > (minValue + maxValue) / 2) {
                    progressLineMiddled.style.left = '50%';

                } else {
                    progressLineMiddled.style.left = 50 - width + '%';
                }
            }
            : null;

        this.range = new RangeSelector({
            step,
            min: minValue,
            max: maxValue
        }, initialValue);
        this.range.setListeners();
        this.range.setHandlers({
            onScrub: value => {
                if (this.onChange) {
                    this.onChange(value);
                }


                this.updateProgressLine?.(value);


                if (writeValue) {
                    valueDiv.innerText = '' + value;
                }
            },
            onMouseUp: () => {
                this.onEditFinished?.(this.value);
            },
            onMouseDown: () => {
                this.onEditStarted?.(this.value);
            },
        });

        this.container.append(details, this.range.container);




        if (middleCentred) {
            this.range.container.classList.add('middle-centered');
            progressLineMiddled = document.createElement('div');
            progressLineMiddled.classList.add('middle-progress');
            this.range.container.append(progressLineMiddled);

            /**
             * Fix bug in RangeSelector.constructor()
             *  if(value) { <-- not called with value == 0, so initial state unset.
             *      this.setProgress(value);
             *   }
             */
            this.range.setProgress(initialValue);
        }
    }

    public setProgress(value: number) {
        this.range.setProgress(value);
        this.valueContainer.innerHTML = '' + value;
        this.updateProgressLine?.(value)
    }
}
