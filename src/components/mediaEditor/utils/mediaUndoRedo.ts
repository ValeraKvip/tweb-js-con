/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2024 kvip
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */


import { CanvasTextParams } from "../canvas/textCanvas";
import { FrameTransform } from "./editableFrame";
import { FilterSettings } from "./imageProcessor";

const STACK_LIMIT = 20;

export type DoCallStack = (transforms?: UndoRedoTransforms) => Promise<() => Promise<() => UndoRedoTransforms | null>>;
export class MediaUndoRedo {

    private undoStack: UndoRedoAction[] = [];
    private redoStack: UndoRedoAction[] = [];
    public onHistoryChanged?: (undoCount: number, redoCount: number) => void;


    public async addAction(pDo: DoCallStack) {
        const undo = await pDo();
        this.undoPush({
            do: pDo,
            undo,
        });
        this.redoStack.length = 0;

        this.onHistoryChanged?.(this.undoStack.length, this.redoStack.length);
    }

    public async undo() {
        if (this.undoStack.length) {
            const action = this.undoStack.pop();
            const transforms = await action.undo();
            if (!transforms) {
                this.undo();
                return;
            }
            action.transforms = transforms();
            this.redoStack.push(action);
            this.onHistoryChanged?.(this.undoStack.length, this.redoStack.length);
        }
    }

    public async redo() {
        if (this.redoStack.length) {
            const action = this.redoStack.pop();
            action.undo = await action.do(action.transforms);
            this.undoPush(action);
            this.onHistoryChanged?.(this.undoStack.length, this.redoStack.length);
        }
    }

    private undoPush(action: UndoRedoAction) {
        this.undoStack.push(action)
        if (this.undoStack.length > STACK_LIMIT) {
            this.undoStack.shift();
        }
    }

    public remove() {
        this.undoStack = null;
        this.redoStack = null;
    }
}

export interface UndoRedoAction {
    do: DoCallStack;
    undo: () => Promise<() => UndoRedoTransforms>;
    transforms?: UndoRedoTransforms;
}

export interface UndoRedoTransforms {
    frameTransforms?: FrameTransform;
}

export interface StickerUndoRedoTransforms extends UndoRedoTransforms {
}

export interface TextUndoRedoTransforms extends UndoRedoTransforms {
    textTransforms?: Pick<CanvasTextParams, 'color' | 'fontFamily' | 'borderStyle' | 'align' | 'fontSize' | 'lineHeight' | 'text' | 'canvasWidth'>
}

export interface FilterTransforms extends UndoRedoTransforms {
    filterTransforms?: FilterSettings
}

export interface BrushTransforms extends UndoRedoTransforms {
    imageTransforms?: ImageData
}

export interface CropTransforms extends UndoRedoTransforms {
    rotation:number;
    flip:boolean;
    tilt:number;
    initialTilt:number;
    initialAngle:number;
    initialFlip:boolean;
    ratio?:{
        w:number;
        h:number;
    }
}