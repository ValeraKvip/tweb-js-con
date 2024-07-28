/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2024 kvip
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

import I18n, { LangPackKey } from "../../../lib/langPack";
import rootScope from "../../../lib/rootScope";
import ButtonIcon from "../../buttonIcon";
import Row from "../../row";
import BaseEdit, { Layer, RenderItem } from "./baseEdit";


import EditableFrame from "../utils/editableFrame";
import { ColorSelector } from "../utils/colorSelector";
import {
  CanvasTextParams, CENTER_ALIGN, FRAME_BLACK, FRAME_NONE,
  FRAME_WHITE, LEFT_ALIGN, RIGHT_ALIGN, TextAlignment, TextCanvas, TextFrameStyle
} from "../canvas/textCanvas";
import { MediaEditorRangeSelector } from "../utils/mediaEditorRangeSelector";
import { TextUndoRedoTransforms } from "../utils/mediaUndoRedo";
import ListenerSetter from "../../../helpers/listenerSetter";
import placeCaretAtEnd from "../../../helpers/dom/placeCaretAtEnd";
import AppMediaEditor from "../../appMediaEditor";


export default class TextEdit extends BaseEdit {

  private currentText: EditableText;
  private currentFontFamily: string = "Roboto";
  private currentColor: string = '#ffffff';
  private currentAlign: TextAlignment = LEFT_ALIGN;
  private currentFontSize: number;
  private currentFontFrame: TextFrameStyle;
  private fontSizeRange: MediaEditorRangeSelector;
  private colorSelector: ColorSelector;
  private isActiveFirstTime: boolean = true;

  private selectColor: (color: string) => void;
  private selectFontFamily: (family: string) => void;
  private selectAlign: (align: TextAlignment) => void;
  private selectFrame: (frame: TextFrameStyle) => void;
  listenerSetter: ListenerSetter;


  constructor(appMediaEditor: AppMediaEditor) {
    super(appMediaEditor);

    this.container = document.createElement('div');
    this.container.classList.add('text-editor');

    this.setupColorSelectors();
    this.setupTextAlignAndStyle();
    this.setupFontSize();
    this.setupFontsSelector();
    this.listenerSetter = new ListenerSetter();
    this.listenerSetter.add(document.body)('keydown', this.onKeyDown);
    //TODO remove listener.
    this.layer.container.onclick = (e) => {
      if (!this.isTabActive()) {
        return;
      }
      e.preventDefault();

      if (this.checkCanvasClick(e)) {
        this.addTextBlock(e);
      }
    }
  }



  public onActive(active: boolean): void {
    super.onActive(active);
    if (!active) {
      this.currentText?.deselect();
      this.currentText = null;
    } else {
      if (this.isActiveFirstTime) {
        this.isActiveFirstTime = false;
        this.addTextBlock();
      }
    }
  }


  protected onResize(): void {
    //TODO once...

  }

  private onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;

    if (target.classList.contains('emoticons-search-input') ||
      target.classList.contains('input-field-input')) {
      target.focus();
      return;
    }

    if (!this.isTabActive()) {
      this.selectThisTab();
    }

    if (!this.currentText) {
      this.addTextBlock();
      return;
    }


    if (target !== this.currentText.container) {
      this.currentText.container.focus();
      placeCaretAtEnd(this.currentText.container);
    }
    this.currentText.container.focus();
  };

  private addTextBlock(e?: MouseEvent) {
    this.do(async (transforms) => {

      const _t = (transforms as TextUndoRedoTransforms)

      const style = _t?.textTransforms ? _t.textTransforms : {
        align: this.currentAlign,
        color: this.currentColor,
        borderStyle: this.currentFontFrame,
        fontSize: this.currentFontSize,
        fontFamily: this.currentFontFamily,
        lineHeight: 1.5,
        text: [],
        canvasWidth: 0
      };

      const text = new EditableText(this.layer, this.baseLayer.mainCanvas, () => {
        if (this.currentText == text) {
          return;
        }

        if (this.currentText != null) {
          this.currentText.deselect();
        }

        this.currentText = text;
        const params = text.getTextParams();

        this.fontSizeRange.setProgress(params.fontSize);
        this.selectAlign?.(params.align);
        this.selectFrame?.(params.borderStyle);
        this.selectFontFamily?.(params.fontFamily);
        this.selectColor?.(params.color);
        text.select();
      },
        () => {
          if (this.currentText == text) {
            this.currentText = null;
          }
        },
        style, e);

      ;

      if (_t?.textTransforms) {
        if (_t.frameTransforms) {
          text.getFrame().transforms = _t.frameTransforms;
        }
      } else {
        if (this.currentText != null) {
          this.currentText.deselect();
        }
        this.currentText = text;
        text.select();
      }




      //undo
      return async () => {

        if (!text.container) {
          //empty container removed on deselect. Exclude from undo
          return null;
        }
        const textTransforms = text.getTextParams();
        const frameTransforms = text.getFrame()?.transforms;
        if (this.currentText == text) {
          this.currentText = null;
        }

        text.remove();

        return () => {
          return {
            textTransforms,
            frameTransforms
          } as TextUndoRedoTransforms;
        }
      }
    });


  }

  setupFontsSelector() {
    const container = document.createElement('div');
    container.classList.add('fonts-selector');
    this.container.append(container);


    const title = new Row({
      titleLangKey: `MediaEditor.Text.Font`,
      clickable: false,
    });
    title.container.classList.add('sidebar-name');
    container.append(title.container);

    const fonts = [
      'Roboto',
      'TypeWriter',
      'AvenirNext',
      'CourierNew',
      'Noteworthy',
      'Georgia',
      'Papyrus',
      'SnellRoundhand'

    ]

    const families: HTMLElement[] = [];
    for (let font of fonts) {
      const row = new Row({
        titleLangKey: `MediaEditor.Text.${font}` as LangPackKey,
        clickable: true,
      });

      row.container.classList.add(`family-${font}`);
      row.container.onclick = () => {
        this.setCurrentFontFamily(font);
      }
      container.append(row.container);
      families.push(row.container);
    }

    this.createUniqueSelectionList(...families);

    this.selectFontFamily = (family) => {
      families[fonts.indexOf(family)].click();
    }
  }

  setupTextAlignAndStyle() {
    const container = document.createElement('div');
    container.classList.add('text-align-and-style');
    this.container.append(container);

    const textAlign = document.createElement('div');
    container.classList.add('text-align');
    const alignLeft = ButtonIcon('ARalignLeft');
    alignLeft.onclick = () => {
      this.setCurrentTextAlign(LEFT_ALIGN);
    }

    const alignCenter = ButtonIcon('ARalignCentre');
    alignCenter.onclick = () => {
      this.setCurrentTextAlign(CENTER_ALIGN);
    }

    const alignRight = ButtonIcon('ARalignRight');
    alignRight.onclick = () => {
      this.setCurrentTextAlign(RIGHT_ALIGN);
    }
    textAlign.append(alignLeft, alignCenter, alignRight);
    this.createUniqueSelectionList(alignLeft, alignCenter, alignRight);

    this.selectAlign = (align) => {

      if (align == LEFT_ALIGN) {
        alignLeft.click();
      } else if (align == CENTER_ALIGN) {
        alignCenter.click();
      } else {
        alignRight.click();
      }
    }



    const textStyle = document.createElement('div');
    container.classList.add('text-style');
    const noFrame = ButtonIcon('FrameNoFrame');
    noFrame.onclick = () => {
      this.setCurrentFontFrame(FRAME_NONE);
    }

    const whiteFrame = ButtonIcon('FrameWhite');
    whiteFrame.onclick = () => {
      this.setCurrentFontFrame(FRAME_WHITE);
    }

    const blackFrame = ButtonIcon('FrameBlack');
    blackFrame.onclick = () => {
      this.setCurrentFontFrame(FRAME_BLACK);
    }

    this.createUniqueSelectionList(noFrame, whiteFrame, blackFrame);

    this.selectFrame = (frame) => {
      if (frame == FRAME_WHITE) {
        whiteFrame.click();
      } else if (frame == FRAME_BLACK) {
        blackFrame.click();
      } else {
        noFrame.click();
      }
    }

    textStyle.append(noFrame, whiteFrame, blackFrame);

    container.append(textAlign, textStyle);
  }



  private setCurrentColor(color: string) {


    this.currentColor = color;

    this.currentText?.setCurrentColor(this.currentColor);

    this.setCurrentFontFrame(this.currentFontFrame);
  }

  private setCurrentFontFrame(frame: TextFrameStyle) {
    this.currentFontFrame = frame;
    this.currentText?.setCurrentFontFrame(frame);
  }

  private setCurrentTextAlign(align: TextAlignment) {
    this.currentAlign = align;
    this.currentText?.setCurrentTextAlign(align);
  }

  private setCurrentFontSize(size: number) {
    this.currentFontSize = size;
    this.currentText?.setCurrentFontSize(size);

  }

  private setCurrentFontFamily(family: string) {
    this.currentFontFamily = family;
    this.currentText?.setCurrentFontFamily(family);

  }


  private setupFontSize() {
    this.fontSizeRange = new MediaEditorRangeSelector('MediaEditor.Size', 1, rootScope.settings.messagesTextSize, 10, 80);
    this.setCurrentFontSize(rootScope.settings.messagesTextSize);
    this.fontSizeRange.onChange = (value) => {
      this.setCurrentFontSize(value);
    }


    this.container.append(this.fontSizeRange.container);
  }

  private setupColorSelectors() {
    this.colorSelector = new ColorSelector();
    this.container.append(this.colorSelector.container);


    this.colorSelector.onUpdateColor = (color) => {
      this.setCurrentColor(color);
      this.container.style.setProperty('--text-color', color);
    }

    this.selectColor = (color) => {
      this.colorSelector.selectColor?.(color);
    }
  }


  public requestRenderQueue(): RenderItem[] {
    const editableFrames = Array.from(this.layer.container.querySelectorAll<HTMLElement>('.editable-frame'));
    return editableFrames.map(frame => {
      return {
        priority: parseInt(frame.style.zIndex),
        render: (ctx, left, top, w, h) => {

          const textCanvas = frame.querySelector('canvas') as HTMLCanvasElement;
          if (!textCanvas.height || !textCanvas.width) {
            return null;
          }
    
          //TODO what a shame... final testing - have no time.
          const matches = frame.style.transform.match(/rotate\(([^)]+)deg\)/);
         
          if (matches) {
            frame.style.transform= '';
          
            const { x, y, width, height } = textCanvas.getBoundingClientRect();
            ctx.save()
            ctx.translate(x - left + width / 2, y - top + height / 2)
            ctx.rotate(parseFloat(matches[1]) * Math.PI / 180);
            ctx.drawImage(textCanvas, 0, 0, width, height, - width / 2, -height / 2, width, height);
            ctx.restore();
          } else {
            const { x, y, width, height } = textCanvas.getBoundingClientRect();
            ctx.drawImage(textCanvas, x - left , y - top, width, height);
          }
          frame.style.display = 'none';         
        }
      } as RenderItem;
    }).filter(Boolean);
  }


  public remove(): void {
    super.remove();
    this.currentText = null;
    this.fontSizeRange.container.remove();
    this.colorSelector.container.remove();


    this.selectColor = null
    this.selectFontFamily = null
    this.selectAlign = null
    this.selectFrame = null
    this.listenerSetter.removeAll();
  }
}


class EditableText {
  public container: HTMLElement;
  private textCanvas: TextCanvas;
  private frame: EditableFrame;
  private hint: HTMLDivElement;

  public get isHint(): boolean {
    return this.hint.style.display === '';
  }

  constructor(layer: Layer, canvas: HTMLCanvasElement, onSelect: () => void, onDestroy: () => void,
    style: Pick<CanvasTextParams, 'color' | 'fontFamily' | 'borderStyle' | 'align' | 'fontSize' | 'lineHeight' | 'text' | 'canvasWidth'>, e?: MouseEvent) {

    this.container = document.createElement('div');
    this.container.classList.add('editable-text');
    this.container.setAttribute('contenteditable', 'true');

    this.hint = document.createElement('div');
    this.hint.classList.add('hint');


    this.setCurrentColor(style.color);
    this.setCurrentFontFamily(style.fontFamily);
    this.setCurrentFontFrame(style.borderStyle);
    this.setCurrentFontSize(style.fontSize);
    this.setCurrentTextAlign(style.align);



    this.textCanvas = new TextCanvas();
    this.textCanvas.container.appendChild(this.container);
    this.textCanvas.container.appendChild(this.hint);


    this.hint.textContent = I18n.format('MediaEditor.Text.Hint', true);
    this.hint.style.display = (!style.text?.length) ? '' : 'none';
    if (style.text?.length) {
      this.container.innerText = style.text.join('\n');
    }

    this.container.addEventListener('blur', this.onBlur.bind(this));
    this.container.addEventListener('focus', this.onFocus.bind(this));
    this.container.addEventListener('input', this.onInput.bind(this));



    this.frame = new EditableFrame({
      canvas: canvas,
      controlledElement: this.textCanvas.container,
      onSelect: onSelect,
      onUpdate: (x, y, width, height) => {
        this.setCurrentSize(width, height);
      },
      onFocus: (e: MouseEvent) => {
        this.container.focus();
        try {
          const x = e.clientX;
          const y = e.clientY;

          //@ts-ignore
          const range = document.caretRangeFromPoint(x, y) || document.caretPositionFromPoint(x, y);

          if (range) {
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
          }
        } catch (error) {
          //well, control caret with keyboard arrows
        }

      }
    });

    layer.container.append(this.frame.container);

    if (e) {

      this.frame.container.style.left = e.clientX + 'px';
      this.frame.container.style.top = e.clientY + 'px';
    } else {
      this.frame.container.style.left = 50 + '%';
      this.frame.container.style.top = 50 + '%';
    }
    this.frame.container.style.width = 250 + 'px';
    this.frame.container.style.height = 200 + 'px';

    this.frame.onDestroy = () => {
      onDestroy();
    }

    this.frame.container.onclick = (e) => {
      e.stopPropagation();
    }

    requestAnimationFrame(() => {
      this.textCanvas.draw({
        ...style, ...{
          lineHeight: parseFloat(window.getComputedStyle(this.container).getPropertyValue('line-height')),
          canvasWidth: style.canvasWidth || parseFloat(window.getComputedStyle(this.container).getPropertyValue('width')),
          paddingHorizontal: parseInt(window.getComputedStyle(this.container).getPropertyValue('padding-left'))
        }
      });
    })
  }

  public getFrame(): EditableFrame {
    return this.frame;
  }

  public getTextParams(): CanvasTextParams {
    return this.textCanvas.getTextParams();
  }

  public setCurrentColor(color: string): void {
    //TODO  set caret color?  
    this.textCanvas?.draw({ color });
  }

  public setCurrentSize(w: number, h: number): void {
    this.textCanvas?.draw({
      canvasWidth: w,
      canvasHeight: h,
      text: this.getLines(this.container, this.frame)
    });
  }

  public setCurrentFontFrame(borderStyle: TextFrameStyle) {
    this.textCanvas?.draw({ borderStyle });
  }

  public setCurrentTextAlign(align: TextAlignment) {
    this.container.style.textAlign = align == LEFT_ALIGN ? 'left' : (align == RIGHT_ALIGN ? 'right' : 'center');
    this.textCanvas?.draw({ align });
  }

  public setCurrentFontSize(fontSize: number) {
    this.container.style.fontSize = `${fontSize}px`;
    this.textCanvas?.draw({
      fontSize,
      lineHeight: parseFloat(window.getComputedStyle(this.container).getPropertyValue('line-height')),
      text: this.getLines(this.container, this.frame)
    });
  }

  public setCurrentFontFamily(fontFamily: string) {
    this.container.classList.forEach(className => {
      if (className.startsWith('family-')) {
        this.container.classList.remove(className);
      }
    });
    this.container.classList.add(`family-${fontFamily}`);

    this.textCanvas?.draw({
      fontFamily,
      text: this.getLines(this.container, this.frame)
    });
  }


  public deselect() {
    this.frame.deselect();
    this.container.blur();
    if (this.isHint) {
      this.remove();
    }
  }

  public select() {
    this.frame.select();
    this.container.focus();
  }

  public remove() {
    this.container.removeEventListener('blur', this.onBlur.bind(this));
    this.container.removeEventListener('focus', this.onFocus.bind(this));
    this.container.removeEventListener('input', this.onInput.bind(this));
    this.textCanvas.remove();
    this.textCanvas = null;
    this.frame.remove();
    this.frame = null;
    this.container.remove();
    this.container = null;

  }


  private onFocus() {

  };

  private onBlur() {
    if (this.container.innerText) {
      this.hint.style.display = 'none';
    } else {
      this.hint.style.display = '';
    }
  }


  private onInput() {

    if (this.container.innerText) {
      this.hint.style.display = 'none';
    } else {
      this.hint.style.display = '';
    }

    this.textCanvas.draw({
      text: this.getLines(this.container, this.frame)
    });
  }


  getLines(element: HTMLElement, frame: EditableFrame | null): string[] {
    let saveTransform: string;
    if (frame) {
      saveTransform = frame.container.style.transform;
      frame.container.style.transform = ''
    }


    let lines: string[] = [];
    const range = document.createRange();
    let previousTop: number | null = null;
    let currentLine = "";

    const nodes = Array.from(element.childNodes);

    for (let node of nodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        let text = node.nodeValue ?? "";

        for (let i = 0; i <= text.length; i++) {
          if (i < text.length) {
            range.setStart(node, i);
            range.setEnd(node, i + 1);
          } else {
            range.setStart(node, i - 1);
            range.setEnd(node, i);
          }

          let rect = range.getBoundingClientRect();

          if (i < text.length) {
            if (previousTop === null || rect.top !== previousTop) {
              if (previousTop !== null) {
                lines.push(currentLine);
                currentLine = "";
              }
              previousTop = rect.top;
            }

            currentLine += text[i];
          } else {
            if (currentLine.length > 0) {
              lines.push(currentLine);
              currentLine = "";
            }
          }
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        let subLines = this.getLines(node as HTMLElement, null);
        lines = lines.concat(subLines);
      }
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    if (lines.length === 0) {
      lines.push("");
    }


    if (frame) {
      frame.container.style.transform = saveTransform;
    }

    return lines;
  }
}